import { NextRequest, NextResponse } from 'next/server';
import { purchaseSignature } from '@/lib/wayforpay';
import { checkoutSchema } from '@/lib/checkoutSchema';
import { PRODUCT, SITE_URL, requireEnv } from '@/lib/config';
import type { WayForPayParams } from '@/lib/types';

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
    productName: [PRODUCT.name],
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
    clientPhone: input.phone.replace(/\s/g, ''),
    language: 'UA',
    serviceUrl: `${SITE_URL}/api/wayforpay-callback`,
    returnUrl: SITE_URL,
    merchantTransactionSecureType: 'AUTO',
  };

  return NextResponse.json(params);
}
