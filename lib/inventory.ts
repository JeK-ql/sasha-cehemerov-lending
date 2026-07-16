import type { Db } from 'mongodb';
import { SIZES, type Size } from './config';

/**
 * Облік залишків дропу. Весь склад — ОДИН документ у колекції `inventory`:
 * MongoDB атомарно оновлює один документ, тому умова «всіх розмірів
 * вистачає» + `$inc` в одній операції виключають овersell без транзакцій.
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
  customer: { name: string; phone: string; email: string };
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
 * Статус міняється атомарно (pending → released) — конкурентні виклики
 * не повернуть той самий резерв двічі.
 */
export async function releaseExpiredReservations(db: Db, now = new Date()): Promise<void> {
  const orders = ordersOf(db);
  const expired = await orders
    .find({ status: 'pending', expiresAt: { $lt: now } })
    .toArray();
  for (const order of expired) {
    const claimed = await orders.findOneAndUpdate(
      { _id: order._id, status: 'pending' },
      { $set: { status: 'released' } },
    );
    if (claimed) {
      await inventoryOf(db).updateOne(
        { _id: INVENTORY_ID },
        { $inc: stockInc(claimed.sizes, 1) },
      );
    }
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

/** Наявність по розмірах (без цифр — тільки є/нема). */
export async function stockAvailability(db: Db): Promise<Record<Size, boolean>> {
  await releaseExpiredReservations(db);
  const doc = await inventoryOf(db).findOne({ _id: INVENTORY_ID });
  return Object.fromEntries(
    SIZES.map((s) => [s, (doc?.stock[s] ?? 0) > 0]),
  ) as Record<Size, boolean>;
}

export async function createPendingOrder(
  db: Db,
  input: {
    orderReference: string;
    sizes: SizeCounts;
    amount: number;
    customer: { name: string; phone: string; email: string };
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
    if (await reserveStock(db, fromReleased.sizes)) return 'paid-after-release';
    await orders.updateOne({ _id: orderReference }, { $set: { oversold: true } });
    return 'oversold';
  }

  const existing = await orders.findOne({ _id: orderReference });
  return existing ? 'already-paid' : 'unknown';
}

/** Declined/Expired від WayForPay: одразу повернути резерв на склад. */
export async function releaseOrder(db: Db, orderReference: string): Promise<void> {
  const claimed = await ordersOf(db).findOneAndUpdate(
    { _id: orderReference, status: 'pending' },
    { $set: { status: 'released' } },
  );
  if (claimed) {
    await inventoryOf(db).updateOne(
      { _id: INVENTORY_ID },
      { $inc: stockInc(claimed.sizes, 1) },
    );
  }
}
