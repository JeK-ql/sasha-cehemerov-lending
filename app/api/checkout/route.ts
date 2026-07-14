import { NextRequest, NextResponse } from 'next/server';
import { purchaseSignature } from '@/lib/wayforpay';
import { checkoutSchema } from '@/lib/checkoutSchema';
import { PRODUCT, SITE_URL, requireEnv } from '@/lib/config';
import type { WayForPayParams } from '@/lib/types';
import { formatPendingOrderMessage, sendToTelegram } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  const parsed = checkoutSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Quantity already validated by zod (≥1 int). Cap server-side at 10 — never
  // trust the client even after schema validation.
  const quantity = Math.min(10, input.quantity);

  const merchantAccount = requireEnv('WAYFORPAY_MERCHANT_ACCOUNT');
  const merchantDomainName = requireEnv('WAYFORPAY_MERCHANT_DOMAIN');
  const secret = requireEnv('WAYFORPAY_SECRET_KEY');

  const orderReference = `DROP01-${Date.now()}`;
  const orderDate = Math.floor(Date.now() / 1000);
  const [lastName, ...firstParts] = input.fullName.trim().split(/\s+/);

  const base = {
    merchantAccount,
    merchantDomainName,
    orderReference,
    orderDate,
    amount: PRODUCT.price * quantity,
    currency: PRODUCT.currency,
    productName: [`Футболка - ${PRODUCT.name} (${input.size})`],
    productCount: [quantity],
    productPrice: [PRODUCT.price],
  };

  const params: WayForPayParams & {
    serviceUrl: string;
    returnUrl: string;
    merchantTransactionSecureType: string;
  } = {
    ...base,
    merchantSignature: purchaseSignature(secret, base),
    clientFirstName: firstParts.join(' ') || '-',
    clientLastName: lastName,
    clientEmail: input.email,
    clientPhone: input.phone.replace(/[\s()-]/g, ''),
    language: 'UA',
    serviceUrl: `${SITE_URL}/api/wayforpay-callback`,
    returnUrl: `${SITE_URL}/api/wayforpay-return`,
    merchantTransactionSecureType: 'AUTO',
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
      size: input.size,
      quantity,
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
