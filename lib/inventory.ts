import type { Db } from 'mongodb';
import { SIZES, type Size } from './config';

/**
 * Облік залишків дропу. Весь склад — ОДИН документ у колекції `inventory`:
 * MongoDB атомарно оновлює один документ, тому умова «всіх розмірів
 * вистачає» + `$inc` в одній операції виключають оверсел без транзакцій.
 *
 * `stock` = доступне до продажу зараз (активні резерви вже відняті).
 * Резерв ставиться при створенні заявки і повертається, якщо оплата не
 * прийшла за RESERVATION_TTL_MS (ліниво, перед наступною перевіркою складу)
 * або якщо WayForPay повідомив Declined/Expired.
 */

export const INVENTORY_ID = 'DROP01';
export const RESERVATION_TTL_MS = 30 * 60 * 1000;

export type SizeCounts = Record<Size, number>;

export type OrderStatus = 'pending' | 'paid' | 'released';

export interface Customer {
  name: string;
  phone: string;
  email: string;
}

export interface OrderDoc {
  _id: string;
  sizes: SizeCounts;
  amount: number;
  status: OrderStatus;
  createdAt: Date;
  expiresAt: Date;
  paidAt?: Date;
  /** Оплата прийшла після звільнення резерву, а складу вже не вистачило. */
  oversold?: boolean;
  customer: Customer;
}

interface InventoryDoc {
  _id: string;
  stock: SizeCounts;
}

const inventoryOf = (db: Db) => db.collection<InventoryDoc>('inventory');
const ordersOf = (db: Db) => db.collection<OrderDoc>('orders');

/** Умова «кожного замовленого розміру вистачає» для findOneAndUpdate. */
export function reserveFilter(sizes: SizeCounts): Record<string, unknown> {
  const filter: Record<string, unknown> = { _id: INVENTORY_ID };
  for (const s of SIZES) {
    if (sizes[s] > 0) filter[`stock.${s}`] = { $gte: sizes[s] };
  }
  return filter;
}

/** `$inc` на ±замовлені кількості (sign: -1 резерв, +1 повернення). */
export function stockInc(sizes: SizeCounts, sign: 1 | -1): Record<string, number> {
  const inc: Record<string, number> = {};
  for (const s of SIZES) {
    if (sizes[s] > 0) inc[`stock.${s}`] = sign * sizes[s];
  }
  return inc;
}

/**
 * Повертає на склад резерви прострочених неоплачених заявок.
 * Кожна заявка звільняється через releaseOrder — той самий атомарний
 * claim, тож конкурентні виклики не повернуть резерв двічі.
 */
export async function releaseExpiredReservations(db: Db, now = new Date()): Promise<void> {
  const expired = await ordersOf(db)
    .find({ status: 'pending', expiresAt: { $lt: now } })
    .toArray();
  for (const order of expired) {
    await releaseOrder(db, order._id);
  }
}

/**
 * Атомарно резервує замовлені кількості. false — товару не вистачає
 * (або документ складу ще не створений seed-скриптом).
 */
export async function reserveStock(db: Db, sizes: SizeCounts): Promise<boolean> {
  const res = await inventoryOf(db).updateOne(reserveFilter(sizes), {
    $inc: stockInc(sizes, -1),
  });
  return res.modifiedCount === 1;
}

/** Повертає резерв на склад (відкат, коли заявка не записалась). */
export async function unreserveStock(db: Db, sizes: SizeCounts): Promise<void> {
  await inventoryOf(db).updateOne(
    { _id: INVENTORY_ID },
    { $inc: stockInc(sizes, 1) },
  );
}

/** Чисте читання наявності, без побічних ефектів (для гарячих шляхів,
 *  де прострочені резерви щойно звільнили). */
export async function currentAvailability(db: Db): Promise<Record<Size, boolean>> {
  const doc = await inventoryOf(db).findOne({ _id: INVENTORY_ID });
  return Object.fromEntries(
    SIZES.map((s) => [s, (doc?.stock[s] ?? 0) > 0]),
  ) as Record<Size, boolean>;
}

/**
 * Наявність по розмірах (без цифр — тільки є/нема) з попереднім звільненням
 * прострочених резервів. Очистка тут потрібна не лише для свіжості даних:
 * якщо останні футболки зависли в кинутих заявках, UI покаже «розпродано»,
 * checkout ніхто не викличе — і без цієї очистки резерви не звільнилися б
 * ніколи.
 */
export async function stockAvailability(db: Db): Promise<Record<Size, boolean>> {
  await releaseExpiredReservations(db);
  return currentAvailability(db);
}

export async function createPendingOrder(
  db: Db,
  input: {
    orderReference: string;
    sizes: SizeCounts;
    amount: number;
    customer: Customer;
  },
  now = new Date(),
): Promise<void> {
  await ordersOf(db).insertOne({
    _id: input.orderReference,
    sizes: input.sizes,
    amount: input.amount,
    status: 'pending',
    createdAt: now,
    expiresAt: new Date(now.getTime() + RESERVATION_TTL_MS),
    customer: input.customer,
  });
}

export type MarkPaidResult =
  /** Резерв був активний — замовлення оплачене штатно. */
  | 'paid'
  /** Повторний колбек по вже оплаченому замовленню. */
  | 'already-paid'
  /** Резерв встиг звільнитись, але склад ще дозволив списати знову. */
  | 'paid-after-release'
  /** Оплачено, а складу вже нема — менеджер мусить розрулити вручну. */
  | 'oversold'
  /** Замовлення створене до впровадження обліку — в базі його нема. */
  | 'unknown';

/** Фіксує оплату заявки; повертає, що сталося з резервом. */
export async function markOrderPaid(
  db: Db,
  orderReference: string,
  now = new Date(),
  // Retry закриває расу зі звільненням резерву (див. коментар нижче);
  // у тестах перевизначається, щоб не чекати таймаути.
  { retries = 2, retryDelayMs = 150 }: { retries?: number; retryDelayMs?: number } = {},
): Promise<MarkPaidResult> {
  const orders = ordersOf(db);

  const fromPending = await orders.findOneAndUpdate(
    { _id: orderReference, status: 'pending' },
    { $set: { status: 'paid', paidAt: now } },
  );
  if (fromPending) return 'paid';

  // Оплата після звільнення резерву: атомарно займаємо released-заявку,
  // щоб повторний колбек не списав склад двічі.
  const fromReleased = await orders.findOneAndUpdate(
    { _id: orderReference, status: 'released' },
    { $set: { status: 'paid', paidAt: now } },
  );
  if (fromReleased) {
    // Звільнення резерву — два кроки (claim статусу, потім $inc складу).
    // Конкурентний release міг уже змінити статус, але ще не повернути
    // склад — перший reserveStock тоді хибно не знайде залишку. Кілька
    // коротких повторів дають $inc долетіти, перш ніж оголосити oversold.
    for (let attempt = 0; ; attempt++) {
      if (await reserveStock(db, fromReleased.sizes)) return 'paid-after-release';
      if (attempt >= retries) break;
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
    await orders.updateOne({ _id: orderReference }, { $set: { oversold: true } });
    return 'oversold';
  }

  const existing = await orders.findOne({ _id: orderReference });
  return existing ? 'already-paid' : 'unknown';
}

/**
 * Повертає резерв неоплаченої заявки на склад (Declined/Expired від
 * WayForPay або прострочений TTL). Атомарний claim статусу гарантує
 * одноразовість; $inc іде другим кроком, тож крах між ними втрачає
 * одиниці складу (безпечний напрямок: недопродаж, не оверсел).
 */
export async function releaseOrder(db: Db, orderReference: string): Promise<void> {
  const claimed = await ordersOf(db).findOneAndUpdate(
    { _id: orderReference, status: 'pending' },
    { $set: { status: 'released' } },
  );
  if (claimed) await unreserveStock(db, claimed.sizes);
}
