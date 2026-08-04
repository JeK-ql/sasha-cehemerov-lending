import { NextRequest, NextResponse } from 'next/server';
import { purchaseSignature } from '@/lib/wayforpay';
import { checkoutSchema, totalQuantity } from '@/lib/checkoutSchema';
import { DEFAULT_PRODUCT_ID, getProduct, positionName, variantKeys } from '@/lib/products';
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
  type VariantCounts,
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

  const product = getProduct(input.productId ?? DEFAULT_PRODUCT_ID);
  if (!product) {
    return NextResponse.json({ error: 'unknown-product' }, { status: 400 });
  }

  // Схема вже валідувала межі, але серверу не можна довіряти клієнту:
  // clamp по кожному варіанту й перевірка сумарних меж ще раз.
  const counts: VariantCounts = {};
  for (const key of variantKeys(product)) {
    counts[key] = Math.max(
      0,
      Math.min(product.maxPerOrder, Math.trunc(input.sizes[key] ?? 0)),
    );
  }
  const totalCount = totalQuantity(counts);
  if (totalCount < 1 || totalCount > product.maxPerOrder) {
    return NextResponse.json({ error: 'invalid quantity' }, { status: 400 });
  }
  const positions = variantKeys(product).filter((k) => counts[k] > 0);

  const merchantAccount = requireEnv('WAYFORPAY_MERCHANT_ACCOUNT');
  const merchantDomainName = requireEnv('WAYFORPAY_MERCHANT_DOMAIN');
  const secret = requireEnv('WAYFORPAY_SECRET_KEY');

  const orderReference = newOrderReference(product.id);

  // Резерв складу ДО прийому оплати: товару лише по 20 шт. на розмір.
  // Якщо Mongo лежить — замовлення не приймаємо (краще не продати, ніж
  // продати неіснуюче).
  let reserved = false;
  try {
    const db = await getDb();
    await releaseExpiredReservations(db);
    if (!(await reserveStock(db, product.id, counts))) {
      // Прострочені резерви щойно звільнили вище — тут достатньо
      // чистого читання без повторної очистки.
      return NextResponse.json(
        {
          error: 'out-of-stock',
          availability: await currentAvailability(db, product.id, variantKeys(product)),
        },
        { status: 409 },
      );
    }
    reserved = true;
    await createPendingOrder(db, {
      orderReference,
      productId: product.id,
      sizes: counts,
      amount: product.price * totalCount,
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
        await unreserveStock(await getDb(), product.id, counts);
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
    amount: product.price * totalCount,
    currency: product.currency,
    productName: positions.map((k) => positionName(product, k)),
    productCount: positions.map((k) => counts[k]),
    productPrice: positions.map(() => product.price),
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
    clientLastName: lastParts.join(' '),
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
      productName: product.name,
      fullName: input.fullName,
      phone: input.phone.replace(/[\s()-]/g, ''),
      email: input.email,
      sizes: counts,
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
