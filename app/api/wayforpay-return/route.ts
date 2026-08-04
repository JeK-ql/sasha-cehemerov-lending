import { NextRequest, NextResponse } from 'next/server';
import { SITE_URL } from '@/lib/config';
import { ORDER_REF_RE, productIdFromRef } from '@/lib/orderReference';
import { getProduct, PRODUCTS } from '@/lib/products';

// WayForPay після оплати надсилає POST на returnUrl. Next.js page route на
// POST намагається виконати Server Action і повертає 404. Тому приймаємо POST
// тут і робимо 303 See Other → браузер перейде на сторінку товару GET-запитом.
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const status = form?.get('transactionStatus');
  const rawRef = form?.get('orderReference');
  const validRef = typeof rawRef === 'string' && ORDER_REF_RE.test(rawRef) ? rawRef : null;
  // Сторінка визначається за номером замовлення: покупець педалі не має
  // опинитись на футболці.
  const product = validRef
    ? getProduct(productIdFromRef(validRef) ?? '') ?? PRODUCTS.DROP01
    : PRODUCTS.DROP01;
  const ref = validRef ? `&ref=${validRef}` : '';
  const paid = status === 'Approved' ? '1' : '0';
  return NextResponse.redirect(`${SITE_URL}${product.path}?paid=${paid}${ref}`, 303);
}

export async function GET() {
  return NextResponse.redirect(SITE_URL, 303);
}
