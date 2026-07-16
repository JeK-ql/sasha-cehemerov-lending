import { NextRequest, NextResponse } from 'next/server';
import { SITE_URL } from '@/lib/config';

// WayForPay після оплати надсилає POST на returnUrl. Next.js page route на
// POST намагається виконати Server Action і повертає 404. Тому приймаємо POST
// тут і робимо 303 See Other → браузер перейде на головну GET-запитом.
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const status = form?.get('transactionStatus');
  // transactionStatus тут — лише попередній вердикт (3DS може підтвердитись
  // пізніше). Прокидаємо номер замовлення: сторінка подяки перепитає
  // фактичний статус у /api/order-status (джерело правди — наш колбек).
  const rawRef = form?.get('orderReference');
  const ref =
    typeof rawRef === 'string' && /^DROP01-\d{10,16}$/.test(rawRef)
      ? `&ref=${rawRef}`
      : '';
  const target =
    status === 'Approved' ? `${SITE_URL}/?paid=1${ref}` : `${SITE_URL}/?paid=0${ref}`;
  return NextResponse.redirect(target, 303);
}

export async function GET() {
  return NextResponse.redirect(SITE_URL, 303);
}
