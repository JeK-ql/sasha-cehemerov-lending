import { NextResponse, type NextRequest } from 'next/server';
import { MAINTENANCE_MODE } from '@/lib/maintenance';

/* Поки сайт закритий, живими лишаються тільки:
   - колбек/повернення WayForPay і статус замовлення — щоб оплати, розпочаті
     до закриття, коректно дійшли до кінця;
   - оферта й умови повернення — їх може перевіряти платіжний провайдер. */
const OPEN_API = ['/api/wayforpay-callback', '/api/wayforpay-return', '/api/order-status'];
const OPEN_PAGES = ['/maintenance', '/offer', '/returns'];

const RETRY_AFTER = { 'Retry-After': '86400' };

export function proxy(request: NextRequest) {
  if (!MAINTENANCE_MODE) return NextResponse.next();

  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    if (OPEN_API.includes(pathname)) return NextResponse.next();
    return NextResponse.json({ error: 'maintenance' }, { status: 503, headers: RETRY_AFTER });
  }

  if (OPEN_PAGES.includes(pathname)) return NextResponse.next();

  // 503 + Retry-After: пошуковики сприймають закриття як тимчасове
  // і не замінюють в індексі сторінки товарів заглушкою.
  return NextResponse.rewrite(new URL('/maintenance', request.url), {
    status: 503,
    headers: RETRY_AFTER,
  });
}

export const config = {
  // Статика Next і файли з public/ (картинки, шрифти, robots.txt, sitemap.xml)
  // проходять без проксі — заглушці потрібні лого і шрифти.
  matcher: ['/((?!_next/static|_next/image|.*\\.[^/]+$).*)'],
};
