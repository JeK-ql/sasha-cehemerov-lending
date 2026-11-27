import { describe, it, expect } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { appendPaidOrderRow, paidOrderRow } from '../ordersSheet';
import { PRODUCTS } from '../products';
import type { OrderDoc } from '../inventory';

// 16.07.2026 15:53 UTC = 18:53 за Києвом (літній час, UTC+3).
const PAID_AT = new Date('2026-07-16T15:53:00Z');

const npOrder: OrderDoc = {
  _id: 'DROP01-1784217334721',
  productId: 'DROP01',
  sizes: { МАЛЕНЬКИЙ: 1, СЕРЕДНІЙ: 0, 'СЕРЕДНІЙ ЛОНГ': 2, ВЕЛИКИЙ: 0, МАШИНА: 0 },
  amount: 7800,
  status: 'paid',
  createdAt: PAID_AT,
  expiresAt: PAID_AT,
  customer: { name: 'Чемеров Олександр', phone: '+380671234567', email: 'a@b.com' },
  delivery: {
    mode: 'np',
    city: 'м. Тернопіль, Тернопільська обл.',
    warehouse: 'Відділення №13: вул. Збаразька, 29А',
  },
};

describe('paidOrderRow', () => {
  it('Нова Пошта, кілька розмірів — у форматі наявних рядків таблиці (без колонки №)', () => {
    expect(paidOrderRow(npOrder, PRODUCTS.DROP01, PAID_AT)).toEqual([
      '16.07.2026',
      '18:53',
      'DROP01-1784217334721',
      'МАЛЕНЬКИЙ ×1 + СЕРЕДНІЙ ЛОНГ ×2',
      3,
      7800,
      'Чемеров Олександр',
      '+380671234567',
      'a@b.com',
      'Нова Пошта',
      'м. Тернопіль, Тернопільська обл., Відділення №13: вул. Збаразька, 29А',
    ]);
  });

  it('Укрпошта: країна, місто, вулиця, будинок, квартира, індекс', () => {
    const row = paidOrderRow(
      {
        ...npOrder,
        delivery: {
          mode: 'other',
          country: 'Польща',
          city: 'Kraków',
          street: 'ul. Floriańska',
          building: '12',
          flat: '3',
          zip: '31-019',
        },
      },
      PRODUCTS.DROP01,
      PAID_AT,
    );
    expect(row[9]).toBe('Укрпошта');
    expect(row[10]).toBe('Польща, Kraków, ul. Floriańska, буд. 12, кв. 3, індекс 31-019');
  });

  it('Укрпошта без квартири не пише «кв.»', () => {
    const row = paidOrderRow(
      {
        ...npOrder,
        delivery: {
          mode: 'other',
          country: 'Україна',
          city: 'Луцьк',
          street: 'вул. Лесі Українки',
          building: '5',
          flat: '',
          zip: '43000',
        },
      },
      PRODUCTS.DROP01,
      PAID_AT,
    );
    expect(row[10]).toBe('Україна, Луцьк, вул. Лесі Українки, буд. 5, індекс 43000');
  });

  it('замовлення, створене до збереження доставки, лишає службу й адресу порожніми', () => {
    const { delivery: _omit, ...old } = npOrder;
    const row = paidOrderRow(old, PRODUCTS.DROP01, PAID_AT);
    expect(row[9]).toBe('');
    expect(row[10]).toBe('');
  });

  it('педаль: у колонці «Розмір» — назва товару, бо розміру немає', () => {
    const row = paidOrderRow(
      { ...npOrder, productId: 'PEDAL01', sizes: { STANDARD: 1 }, amount: 13000 },
      PRODUCTS.PEDAL01,
      PAID_AT,
    );
    expect(row[3]).toBe('Педаль Kosko FX × Саша Чемеров - Димна Суміш');
    expect(row[4]).toBe(1);
    expect(row[5]).toBe(13000);
  });

  it('зимовий час Києва — UTC+2', () => {
    const row = paidOrderRow(npOrder, PRODUCTS.DROP01, new Date('2026-11-27T22:05:00Z'));
    expect(row[0]).toBe('28.11.2026');
    expect(row[1]).toBe('00:05');
  });
});

// ---------- Sheets API через підроблений fetch ----------

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const creds = {
  clientEmail: 'bot@test.iam.gserviceaccount.com',
  privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  spreadsheetId: 'SHEET',
};

type Call = { url: string; init?: RequestInit };

function fakeFetch(existingRows: string[][]) {
  const calls: Call[] = [];
  const fn = async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    calls.push({ url: u, init });
    if (u.startsWith('https://oauth2.googleapis.com/token'))
      return Response.json({ access_token: 'TOKEN', expires_in: 3600 });
    if (u.includes(':append')) return Response.json({ updates: { updatedRows: 1 } });
    return Response.json({ values: existingRows });
  };
  return { fn: fn as typeof fetch, calls };
}

const header = ['№', 'Дата', 'Час', 'Номер замовлення'];

describe('appendPaidOrderRow', () => {
  it('дописує рядок з номером «найбільший № + 1», значення — RAW (без формул)', async () => {
    const { fn, calls } = fakeFetch([
      header,
      ['1', '16.07.2026', '18:53', 'DROP01-1'],
      ['67', '24.11.2026', '20', 'DROP01-67'],
    ]);
    const res = await appendPaidOrderRow(creds, npOrder, PRODUCTS.DROP01, PAID_AT, fn);
    expect(res).toBe('appended');

    const append = calls.find((c) => c.url.includes(':append'))!;
    expect(append.url).toContain('valueInputOption=RAW');
    expect(append.url).toContain(encodeURIComponent("'paid'!A:L"));
    expect((append.init?.headers as Record<string, string>).authorization).toBe('Bearer TOKEN');
    const body = JSON.parse(String(append.init?.body));
    expect(body.values[0][0]).toBe(68);
    expect(body.values[0][3]).toBe('DROP01-1784217334721');
  });

  it('не дублює: № замовлення вже є в колонці D — нічого не дописує', async () => {
    const { fn, calls } = fakeFetch([header, ['5', '16.07.2026', '18:53', 'DROP01-1784217334721']]);
    const res = await appendPaidOrderRow(creds, npOrder, PRODUCTS.DROP01, PAID_AT, fn);
    expect(res).toBe('duplicate');
    expect(calls.some((c) => c.url.includes(':append'))).toBe(false);
  });

  it('порожня таблиця (лише шапка) — перший рядок отримує № 1', async () => {
    const { fn, calls } = fakeFetch([header]);
    await appendPaidOrderRow(creds, npOrder, PRODUCTS.DROP01, PAID_AT, fn);
    const body = JSON.parse(String(calls.find((c) => c.url.includes(':append'))!.init?.body));
    expect(body.values[0][0]).toBe(1);
  });

  it('помилка Google API кидає виняток — колбек оплати сам вирішує, що з ним робити', async () => {
    const fn = (async (url: string | URL | Request) =>
      String(url).startsWith('https://oauth2')
        ? Response.json({ access_token: 'TOKEN' })
        : new Response('forbidden', { status: 403 })) as typeof fetch;
    await expect(
      appendPaidOrderRow(creds, npOrder, PRODUCTS.DROP01, PAID_AT, fn),
    ).rejects.toThrow(/403/);
  });
});
