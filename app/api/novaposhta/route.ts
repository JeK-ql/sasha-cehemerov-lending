import { NextRequest, NextResponse } from 'next/server';
import { searchCities, listWarehouses, normalizeCityQuery } from '@/lib/novaposhta';
import { requireEnv } from '@/lib/config';

/* CDN Vercel кешує GET по повному URL (з query): однаковий пошук міста за добу
   смикає НП API один раз. Браузеру даємо годину. Тиждень можна віддавати stale,
   поки CDN тихо оновлює. Список міст НП змінюється дуже рідко — це безпечно. */
const CITIES_CACHE = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';
/* Відділення НЕ кешуються (вимога) + помилки не мають залипати в CDN. */
const NO_STORE = 'no-store';

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type');
  const apiKey = requireEnv('NOVAPOSHTA_API_KEY');

  try {
    if (type === 'cities') {
      const q = normalizeCityQuery(req.nextUrl.searchParams.get('q') ?? '');
      return NextResponse.json(
        { items: await searchCities(apiKey, q) },
        { headers: { 'Cache-Control': CITIES_CACHE } },
      );
    }
    if (type === 'warehouses') {
      const ref = req.nextUrl.searchParams.get('ref') ?? '';
      return NextResponse.json(
        { items: await listWarehouses(apiKey, ref) },
        { headers: { 'Cache-Control': NO_STORE } },
      );
    }
    return NextResponse.json(
      { error: 'unknown type' },
      { status: 400, headers: { 'Cache-Control': NO_STORE } },
    );
  } catch {
    return NextResponse.json(
      { items: [] },
      { status: 502, headers: { 'Cache-Control': NO_STORE } },
    );
  }
}
