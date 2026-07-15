import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

/** Відповідь НП у форматі { data: … }, як її парсять searchCities/listWarehouses. */
const npResponse = (data: unknown) =>
  new Response(JSON.stringify({ data }), {
    headers: { 'Content-Type': 'application/json' },
  });

describe('GET /api/novaposhta', () => {
  beforeEach(() => {
    vi.stubEnv('NOVAPOSHTA_API_KEY', 'test-key');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('cities: CDN-кеш на добу і нормалізований запит до НП', async () => {
    const fetchMock = vi.fn().mockResolvedValue(npResponse([{ Addresses: [] }]));
    vi.stubGlobal('fetch', fetchMock);

    const res = await GET(
      new NextRequest('http://localhost/api/novaposhta?type=cities&q=%20%D0%9A%D0%98%D0%87%20'),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(
      'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    );
    // « КИЇ » (%20%D0%9A%D0%98%D0%87%20) → «киї»; очікуване значення вписано
    // руками, НЕ обчислено тим самим кодом, що й реалізація.
    const npBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(npBody.methodProperties.CityName).toBe('киї');
  });

  it('warehouses: явний no-store — відділення не кешуються', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(npResponse([])));

    const res = await GET(
      new NextRequest('http://localhost/api/novaposhta?type=warehouses&ref=abc'),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('падіння НП: 502 + no-store, щоб порожнеча не залипла в CDN', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('np down')));

    const res = await GET(
      new NextRequest('http://localhost/api/novaposhta?type=cities&q=%D0%BA%D0%B8%D1%97%D0%B2'),
    );

    expect(res.status).toBe(502);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('НП success:false (напр. поганий ключ): 502 + no-store, не 200 з порожнім списком', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: false, data: [], errors: ['API key error'] }),
          { headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const res = await GET(
      new NextRequest('http://localhost/api/novaposhta?type=cities&q=%D0%BA%D0%B8%D1%97%D0%B2'),
    );

    expect(res.status).toBe(502);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('невідомий type: 400 + no-store', async () => {
    vi.stubGlobal('fetch', vi.fn());

    const res = await GET(new NextRequest('http://localhost/api/novaposhta?type=bogus'));

    expect(res.status).toBe(400);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});
