import { createSign } from 'node:crypto';
import type { Delivery, OrderDoc } from './inventory';
import { variantKeys, type Product } from './products';

/**
 * Запис оплачених замовлень у Google Таблицю менеджерів (аркуш «paid»).
 *
 * Колонки повторюють те, що команда вела вручну до автоматизації:
 * № | Дата | Час | Номер замовлення | Розмір | К-сть | Сума, ₴ | Покупець |
 * Телефон | E-mail | Служба | Адреса доставки.
 *
 * Доступ — через службовий акаунт Google (JWT → access token), без SDK:
 * потрібні лише два REST-виклики Sheets API.
 */

export const PAID_SHEET = 'paid';

export interface SheetsCreds {
  clientEmail: string;
  privateKey: string;
  spreadsheetId: string;
}

/** null — таблиця не налаштована (локальна розробка, прев'ю): запис пропускаємо. */
export function sheetsCredsFromEnv(): SheetsCreds | null {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!clientEmail || !privateKey || !spreadsheetId) return null;
  // У змінних середовища Vercel переноси ключа часто зберігаються як «\n».
  return { clientEmail, privateKey: privateKey.replace(/\\n/g, '\n'), spreadsheetId };
}

const KYIV = 'Europe/Kyiv';

function kyivParts(d: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat('uk-UA', {
    timeZone: KYIV,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

function deliveryColumns(d: Delivery | undefined): [service: string, address: string] {
  if (!d) return ['', ''];
  if (d.mode === 'np') return ['Нова Пошта', `${d.city}, ${d.warehouse}`];
  return [
    'Укрпошта',
    `${d.country}, ${d.city}, ${d.street}, буд. ${d.building}` +
      (d.flat ? `, кв. ${d.flat}` : '') +
      `, індекс ${d.zip}`,
  ];
}

/** Рядок таблиці без колонки № (її рахує appendPaidOrderRow за вмістом аркуша). */
export function paidOrderRow(
  order: OrderDoc,
  product: Product,
  paidAt: Date,
): (string | number)[] {
  const t = kyivParts(paidAt);
  const chosen = variantKeys(product).filter((k) => (order.sizes[k] ?? 0) > 0);
  const quantity = chosen.reduce((sum, k) => sum + order.sizes[k], 0);
  // У одноваріантного товару розміру немає — у колонці «Розмір» його назва,
  // бо окремої колонки «Товар» таблиця не має.
  const sizes = product.showVariantPicker
    ? chosen.map((k) => `${k} ×${order.sizes[k]}`).join(' + ')
    : product.paymentName;
  const [service, address] = deliveryColumns(order.delivery);
  return [
    `${t.day}.${t.month}.${t.year}`,
    `${t.hour}:${t.minute}`,
    order._id,
    sizes,
    quantity,
    order.amount,
    order.customer.name,
    order.customer.phone,
    order.customer.email,
    service,
    address,
  ];
}

const TIMEOUT_MS = 8000;

async function accessToken(creds: SheetsCreds, fetchFn: typeof fetch): Promise<string> {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: creds.clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 600,
  })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(creds.privateKey, 'base64url');
  const res = await fetchFn('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Google token ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

/**
 * Дописує оплачене замовлення в аркуш «paid».
 * - 'duplicate' — цей № уже є в колонці D (внесли вручну або WayForPay
 *   повторив колбек), нічого не пишемо;
 * - значення йдуть як RAW: поля покупця не стають формулами, телефон
 *   лишається текстом із «+» і нулем на початку.
 * Помилки API кидаються — що з ними робити, вирішує колбек оплати.
 */
export async function appendPaidOrderRow(
  creds: SheetsCreds,
  order: OrderDoc,
  product: Product,
  paidAt: Date,
  fetchFn: typeof fetch = fetch,
): Promise<'appended' | 'duplicate'> {
  const token = await accessToken(creds, fetchFn);
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${creds.spreadsheetId}/values/`;
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const check = async (res: Response) => {
    if (!res.ok) throw new Error(`Google Sheets ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
  };

  const existing = (await check(
    await fetchFn(`${base}${encodeURIComponent(`'${PAID_SHEET}'!A:D`)}`, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }),
  )) as { values?: string[][] };
  const rows = (existing.values ?? []).slice(1); // без шапки
  if (rows.some((r) => (r[3] ?? '').trim() === order._id)) return 'duplicate';
  const lastNumber = Math.max(0, ...rows.map((r) => Number.parseInt(r[0] ?? '', 10) || 0));

  await check(
    await fetchFn(
      `${base}${encodeURIComponent(`'${PAID_SHEET}'!A:L`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ values: [[lastNumber + 1, ...paidOrderRow(order, product, paidAt)]] }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    ),
  );
  return 'appended';
}
