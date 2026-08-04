import type { Db } from 'mongodb';
import { DEFAULT_PRODUCT_ID } from './products';

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

export const RESERVATION_TTL_MS = 30 * 60 * 1000;

/** Кількості по ключах варіантів товару. */
export type VariantCounts = Record<string, number>;
/** Історична назва — лишена, щоб не переписувати наявні імпорти. */
export type SizeCounts = VariantCounts;

export type OrderStatus = 'pending' | 'paid' | 'released' | 'refunded';

export interface Customer {
  name: string;
  phone: string;
  email: string;
}

export interface OrderDoc {
  _id: string;
  /** Відсутнє в замовленнях, створених до появи реєстру товарів. */
  productId?: string;
  sizes: VariantCounts;
  amount: number;
  status: OrderStatus;
  createdAt: Date;
  expiresAt: Date;
  paidAt?: Date;
  /** Оплата прийшла після звільнення резерву, а складу вже не вистачило. */
  oversold?: boolean;
  refundedAt?: Date;
  /**
   * Чи повернулась одиниця складу внаслідок цього повернення коштів —
   * напряму (pending) або раніше, через releaseOrder (released). Пишеться
   * разом з `refundedAt`, щоб повторний (redelivered) колбек
   * `already-refunded*` міг чесно повторити те, що сказав перший колбек.
   */
  stockReturned?: boolean;
  customer: Customer;
}

interface InventoryDoc {
  _id: string;
  stock: VariantCounts;
}

const inventoryOf = (db: Db) => db.collection<InventoryDoc>('inventory');
const ordersOf = (db: Db) => db.collection<OrderDoc>('orders');

/** Товар замовлення; старі документи поля не мають. */
export const orderProductId = (o: { productId?: string }): string =>
  o.productId ?? DEFAULT_PRODUCT_ID;

/** Умова «кожного замовленого варіанта вистачає» для findOneAndUpdate. */
export function reserveFilter(
  productId: string,
  counts: VariantCounts,
): Record<string, unknown> {
  const filter: Record<string, unknown> = { _id: productId };
  for (const [key, qty] of Object.entries(counts)) {
    if (qty > 0) filter[`stock.${key}`] = { $gte: qty };
  }
  return filter;
}

/** `$inc` на ±замовлені кількості (sign: -1 резерв, +1 повернення). */
export function stockInc(counts: VariantCounts, sign: 1 | -1): Record<string, number> {
  const inc: Record<string, number> = {};
  for (const [key, qty] of Object.entries(counts)) {
    if (qty > 0) inc[`stock.${key}`] = sign * qty;
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
export async function reserveStock(
  db: Db,
  productId: string,
  counts: VariantCounts,
): Promise<boolean> {
  const res = await inventoryOf(db).updateOne(reserveFilter(productId, counts), {
    $inc: stockInc(counts, -1),
  });
  return res.modifiedCount === 1;
}

/** Повертає резерв на склад (відкат, коли заявка не записалась). */
export async function unreserveStock(
  db: Db,
  productId: string,
  counts: VariantCounts,
): Promise<void> {
  await inventoryOf(db).updateOne({ _id: productId }, { $inc: stockInc(counts, 1) });
}

/** Чисте читання наявності, без побічних ефектів (для гарячих шляхів,
 *  де прострочені резерви щойно звільнили). */
export async function currentAvailability(
  db: Db,
  productId: string,
  keys: string[],
): Promise<Record<string, boolean>> {
  const doc = await inventoryOf(db).findOne({ _id: productId });
  return Object.fromEntries(keys.map((k) => [k, (doc?.stock[k] ?? 0) > 0]));
}

/**
 * Наявність по розмірах (без цифр — тільки є/нема) з попереднім звільненням
 * прострочених резервів. Очистка тут потрібна не лише для свіжості даних:
 * якщо останні футболки зависли в кинутих заявках, UI покаже «розпродано»,
 * checkout ніхто не викличе — і без цієї очистки резерви не звільнилися б
 * ніколи.
 */
export async function stockAvailability(
  db: Db,
  productId: string,
  keys: string[],
): Promise<Record<string, boolean>> {
  await releaseExpiredReservations(db);
  return currentAvailability(db, productId, keys);
}

export async function createPendingOrder(
  db: Db,
  input: {
    orderReference: string;
    productId: string;
    sizes: VariantCounts;
    amount: number;
    customer: Customer;
  },
  now = new Date(),
): Promise<void> {
  await ordersOf(db).insertOne({
    _id: input.orderReference,
    productId: input.productId,
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
  /** Замовлення повернене раніше — оплата не воскрешає його. */
  | 'refunded'
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
      if (await reserveStock(db, orderProductId(fromReleased), fromReleased.sizes))
        return 'paid-after-release';
      if (attempt >= retries) break;
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
    await orders.updateOne({ _id: orderReference }, { $set: { oversold: true } });
    return 'oversold';
  }

  const existing = await orders.findOne({ _id: orderReference });
  if (!existing) return 'unknown';
  // Повернене замовлення не воскресає: гроші вже пішли назад покупцю.
  if (existing.status === 'refunded') return 'refunded';
  return 'already-paid';
}

export type RefundResult =
  /** Було `pending`: резерв повернувся на склад щойно, цим викликом. */
  | 'refunded-restocked'
  /** Було `released`: резерв уже повернувся на склад раніше (Declined/Expired). */
  | 'refunded-already-back'
  /** Було `paid`: склад свідомо НЕ повернули — товар могли вже відправити. */
  | 'refunded'
  /** Повторний (redelivered) колбек; склад був повернений оригінальним поверненням. */
  | 'already-refunded-restocked'
  /** Повторний (redelivered) колбек; склад оригінальним поверненням НЕ повертався. */
  | 'already-refunded'
  /** Замовлення в базі немає. */
  | 'unknown';

/**
 * Фіксує повернення коштів. Поведінка залежить від стану заявки на момент
 * колбека:
 * - `pending` — резерв ще активний, товар не продано: повертаємо резерв на
 *   склад (як `releaseOrder` — спершу claim статусу, потім `$inc` складу:
 *   крах між кроками веде до недопродажу, а не оверселу). Повертає
 *   `'refunded-restocked'` — склад уже поповнено, менеджеру нічого робити;
 * - `paid` — склад НЕ інкрементується свідомо: товар могли вже відправити
 *   або він бракований, автоповернення виставило б на продаж одиницю, якої
 *   фізично немає. Менеджер повертає її вручну через `npm run seed:stock`.
 *   Повертає `'refunded'`;
 * - `released` — резерв уже й так повернутий раніше (Declined/Expired) —
 *   повторно склад не чіпаємо. Повертає `'refunded-already-back'` — це НЕ
 *   те саме, що `'refunded'`: тут одиниця вже фізично на складі, і команда
 *   `seed:stock` менеджеру не потрібна (на відміну від `'refunded'`, де
 *   товар міг піти покупцю).
 *
 * Якщо жоден із цих трьох статусів не підійшов — це повторний
 * (redelivered) колбек по вже поверненому замовленню. Що сталося зі
 * складом тоді, читаємо з `stockReturned`, який попередній виклик уже
 * зберіг на документі — сам поточний виклик відновити цю інформацію не
 * може. Повертає `'already-refunded-restocked'` або `'already-refunded'`.
 */
export async function markOrderRefunded(
  db: Db,
  orderReference: string,
  now = new Date(),
): Promise<RefundResult> {
  const orders = ordersOf(db);

  const fromPending = await orders.findOneAndUpdate(
    { _id: orderReference, status: 'pending' },
    { $set: { status: 'refunded', refundedAt: now, stockReturned: true } },
  );
  if (fromPending) {
    await unreserveStock(db, orderProductId(fromPending), fromPending.sizes);
    return 'refunded-restocked';
  }

  const fromPaid = await orders.findOneAndUpdate(
    { _id: orderReference, status: 'paid' },
    { $set: { status: 'refunded', refundedAt: now, stockReturned: false } },
  );
  if (fromPaid) return 'refunded';

  const fromReleased = await orders.findOneAndUpdate(
    { _id: orderReference, status: 'released' },
    { $set: { status: 'refunded', refundedAt: now, stockReturned: true } },
  );
  if (fromReleased) return 'refunded-already-back';

  const existing = await orders.findOne({ _id: orderReference });
  if (!existing) return 'unknown';
  return existing.stockReturned ? 'already-refunded-restocked' : 'already-refunded';
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
  if (claimed) await unreserveStock(db, orderProductId(claimed), claimed.sizes);
}
