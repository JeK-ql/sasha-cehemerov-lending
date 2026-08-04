import { NextRequest, NextResponse } from 'next/server';
import { purchaseSignature } from '@/lib/wayforpay';
import { checkoutSchema, totalQuantity } from '@/lib/checkoutSchema';
import { PRODUCT, SIZES, type Size } from '@/lib/products';
import { SITE_URL, requireEnv } from '@/lib/config';
import type { WayForPayParams } from '@/lib/types';
import { formatPendingOrderMessage, sendToTelegram } from '@/lib/telegram';
import { getDb } from '@/lib/mongo';
import { newOrderReference } from '@/lib/orderReference';
import {
  createPendingOrder,
  currentAvailability,
  releaseExpiredReservations,
  reserveStock,
  unreserveStock,
  RESERVATION_TTL_MS,
} from '@/lib/inventory';

export async function POST(req: NextRequest) {
  const parsed = checkoutSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Схема вже валідувала межі, але серверу не можна довіряти клієнту:
  // clamp по-розмірно і перевірка сумарних меж ще раз.
  const sizes = Object.fromEntries(
    SIZES.map((s) => [s, Math.max(0, Math.min(10, input.sizes[s]))]),
  ) as Record<Size, number>;
  const totalCount = totalQuantity(sizes);
  if (totalCount < 1 || totalCount > 10) {
    return NextResponse.json({ error: 'invalid quantity' }, { status: 400 });
  }
  const positions = SIZES.filter((s) => sizes[s] > 0);

  const merchantAccount = requireEnv('WAYFORPAY_MERCHANT_ACCOUNT');
  const merchantDomainName = requireEnv('WAYFORPAY_MERCHANT_DOMAIN');
  const secret = requireEnv('WAYFORPAY_SECRET_KEY');

  const orderReference = newOrderReference('DROP01');

  // Резерв складу ДО прийому оплати: товару лише по 20 шт. на розмір.
  // Якщо Mongo лежить — замовлення не приймаємо (краще не продати, ніж
  // продати неіснуюче).
  let reserved = false;
  try {
    const db = await getDb();
    await releaseExpiredReservations(db);
    if (!(await reserveStock(db, 'DROP01', sizes))) {
      // Прострочені резерви щойно звільнили вище — тут достатньо
      // чистого читання без повторної очистки.
      return NextResponse.json(
        { error: 'out-of-stock', availability: await currentAvailability(db, 'DROP01', [...SIZES]) },
        { status: 409 },
      );
    }
    reserved = true;
    await createPendingOrder(db, {
      orderReference,
      productId: 'DROP01',
      sizes,
      amount: PRODUCT.price * totalCount,
      customer: {
        name: input.fullName,
        phone: input.phone.replace(/[\s()-]/g, ''),
        email: input.email,
      },
    });
  } catch (err) {
    console.error('Inventory reservation failed', orderReference, err);
    if (reserved) {
      // Заявка не записалась — повертаємо щойно списаний резерв, інакше
      // він завис би назавжди (звільняти нічим: замовлення в базі нема).
      try {
        await unreserveStock(await getDb(), 'DROP01', sizes);
      } catch (rollbackErr) {
        console.error('Reservation rollback failed', orderReference, rollbackErr);
      }
    }
    return NextResponse.json({ error: 'inventory-unavailable' }, { status: 503 });
  }
  const orderDate = Math.floor(Date.now() / 1000);
  // Поле форми — «ІМ'Я І ПРІЗВИЩЕ»: перше слово імʼя, решта прізвище.
  const [firstName, ...lastParts] = input.fullName.trim().split(/\s+/);

  const base = {
    merchantAccount,
    merchantDomainName,
    orderReference,
    orderDate,
    amount: PRODUCT.price * totalCount,
    currency: PRODUCT.currency,
    productName: positions.map((s) => `Футболка - ${PRODUCT.name} (${s})`),
    productCount: positions.map((s) => sizes[s]),
    productPrice: positions.map(() => PRODUCT.price),
  };

  const params: WayForPayParams & {
    serviceUrl: string;
    returnUrl: string;
    merchantTransactionSecureType: string;
    orderTimeout: number;
  } = {
    ...base,
    merchantSignature: purchaseSignature(secret, base),
    clientFirstName: firstName,
    clientLastName: lastParts.join(' ') || '-',
    clientEmail: input.email,
    clientPhone: input.phone.replace(/[\s()-]/g, ''),
    language: 'UA',
    serviceUrl: `${SITE_URL}/api/wayforpay-callback`,
    returnUrl: `${SITE_URL}/api/wayforpay-return`,
    merchantTransactionSecureType: 'AUTO',
    // Рахунок WayForPay має померти разом із резервом складу, інакше
    // оплата прилітає після звільнення резерву й дає oversold.
    orderTimeout: Math.floor(RESERVATION_TTL_MS / 1000),
  };

  // Повні дані замовлення (розмір, адреса) WayForPay назад не повертає,
  // тому заявка їде менеджеру вже зараз; колбек підтвердить оплату за №.
  // Падіння Telegram не блокує оплату.
  try {
    const text = formatPendingOrderMessage({
      orderReference,
      fullName: input.fullName,
      phone: input.phone.replace(/[\s()-]/g, ''),
      email: input.email,
      sizes,
      amount: base.amount,
      deliveryMode: input.deliveryMode,
      city: input.city,
      warehouse: input.warehouse,
      country: input.country,
      street: input.street,
      building: input.building,
      flat: input.flat,
      zip: input.zip,
    });
    await sendToTelegram(
      requireEnv('TELEGRAM_BOT_TOKEN'),
      requireEnv('TELEGRAM_CHAT_ID'),
      text,
    );
  } catch (err) {
    // Адреса існує лише тут — якщо повідомлення не пішло, лог мусить
    // дозволити відновити замовлення вручну.
    console.error(
      'Telegram pending-order notify failed',
      orderReference,
      JSON.stringify(input),
      err,
    );
  }

  return NextResponse.json(params);
}
