import { describe, it, expect, beforeEach } from 'vitest';
import type { Db } from 'mongodb';
import { SIZES } from '../products';
import {
  RESERVATION_TTL_MS,
  reserveFilter,
  stockInc,
  reserveStock,
  releaseExpiredReservations,
  stockAvailability,
  currentAvailability,
  createPendingOrder,
  markOrderPaid,
  releaseOrder,
  type SizeCounts,
} from '../inventory';

/**
 * Мінімальний in-memory двійник частини Mongo API, яку використовує
 * lib/inventory: updateOne/findOneAndUpdate з $set/$inc, умови $gte/$lt
 * по вкладених полях. Достатньо для перевірки логіки станів і резервів.
 */
function getPath(doc: Record<string, unknown>, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((v, k) => (v as Record<string, unknown> | undefined)?.[k], doc);
}

function setPath(doc: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let target = doc;
  for (const k of keys.slice(0, -1)) target = target[k] as Record<string, unknown>;
  target[keys[keys.length - 1]] = value;
}

function matches(doc: Record<string, unknown>, filter: Record<string, unknown>): boolean {
  return Object.entries(filter).every(([path, cond]) => {
    const actual = getPath(doc, path);
    if (cond !== null && typeof cond === 'object') {
      const ops = cond as Record<string, unknown>;
      if ('$gte' in ops && !(Number(actual) >= Number(ops.$gte))) return false;
      if ('$lt' in ops && !(Number(actual) < Number(ops.$lt))) return false;
      return true;
    }
    return actual === cond;
  });
}

function apply(doc: Record<string, unknown>, update: Record<string, unknown>): void {
  const $set = update.$set as Record<string, unknown> | undefined;
  const $inc = update.$inc as Record<string, number> | undefined;
  if ($set) for (const [p, v] of Object.entries($set)) setPath(doc, p, v);
  if ($inc) {
    for (const [p, v] of Object.entries($inc)) {
      setPath(doc, p, Number(getPath(doc, p) ?? 0) + v);
    }
  }
}

function fakeCollection(docs: Record<string, unknown>[]) {
  return {
    async updateOne(filter: Record<string, unknown>, update: Record<string, unknown>) {
      const doc = docs.find((d) => matches(d, filter));
      if (doc) apply(doc, update);
      return { modifiedCount: doc ? 1 : 0 };
    },
    async findOneAndUpdate(
      filter: Record<string, unknown>,
      update: Record<string, unknown>,
    ) {
      const doc = docs.find((d) => matches(d, filter));
      if (!doc) return null;
      const before = structuredClone(doc);
      apply(doc, update);
      return before; // returnDocument: 'before' — як у драйвера за замовчуванням
    },
    async findOne(filter: Record<string, unknown>) {
      return docs.find((d) => matches(d, filter)) ?? null;
    },
    find(filter: Record<string, unknown>) {
      return { toArray: async () => docs.filter((d) => matches(d, filter)) };
    },
    async insertOne(doc: Record<string, unknown>) {
      docs.push(doc);
      return { insertedId: doc._id };
    },
  };
}

const counts = (m = 0, s = 0, v = 0): SizeCounts => ({
  МАЛЕНЬКИЙ: m,
  СЕРЕДНІЙ: s,
  ВЕЛИКИЙ: v,
});

let inventoryDocs: Record<string, unknown>[];
let orderDocs: Record<string, unknown>[];
let db: Db;

const stock = () =>
  (inventoryDocs[0] as { stock: SizeCounts }).stock;

beforeEach(() => {
  inventoryDocs = [{ _id: 'DROP01', stock: counts(18, 11, 15) }];
  orderDocs = [];
  const collections: Record<string, ReturnType<typeof fakeCollection>> = {
    inventory: fakeCollection(inventoryDocs),
    orders: fakeCollection(orderDocs),
  };
  db = { collection: (name: string) => collections[name] } as unknown as Db;
});

describe('reserveFilter / stockInc', () => {
  it('обмежує лише замовлені розміри', () => {
    expect(reserveFilter('DROP01', counts(0, 2, 1))).toEqual({
      _id: 'DROP01',
      'stock.СЕРЕДНІЙ': { $gte: 2 },
      'stock.ВЕЛИКИЙ': { $gte: 1 },
    });
    expect(stockInc(counts(0, 2, 1), -1)).toEqual({
      'stock.СЕРЕДНІЙ': -2,
      'stock.ВЕЛИКИЙ': -1,
    });
  });
});

describe('reserveStock', () => {
  it('списує при достатньому складі', async () => {
    expect(await reserveStock(db, 'DROP01', counts(1, 2, 0))).toBe(true);
    expect(stock()).toEqual(counts(17, 9, 15));
  });

  it('відмовляє, якщо хоч одного розміру не вистачає, і нічого не списує', async () => {
    expect(await reserveStock(db, 'DROP01', counts(0, 12, 1))).toBe(false);
    expect(stock()).toEqual(counts(18, 11, 15));
  });

  it('відмовляє, коли документа складу ще нема', async () => {
    inventoryDocs.length = 0;
    expect(await reserveStock(db, 'DROP01', counts(1, 0, 0))).toBe(false);
  });
});

describe('резерв і оплата', () => {
  const order = {
    orderReference: 'DROP01-1',
    productId: 'DROP01',
    sizes: counts(0, 2, 0),
    amount: 5200,
    customer: { name: 'Тест Тестовий', phone: '0670000000', email: 't@t.ua' },
  };

  it('pending → paid: склад лишається списаним', async () => {
    await reserveStock(db, 'DROP01', order.sizes);
    await createPendingOrder(db, order);
    expect(await markOrderPaid(db, order.orderReference)).toBe('paid');
    expect(stock()).toEqual(counts(18, 9, 15));
  });

  it('повторний колбек → already-paid, без подвійного списання', async () => {
    await reserveStock(db, 'DROP01', order.sizes);
    await createPendingOrder(db, order);
    await markOrderPaid(db, order.orderReference);
    expect(await markOrderPaid(db, order.orderReference)).toBe('already-paid');
    expect(stock()).toEqual(counts(18, 9, 15));
  });

  it('невідоме замовлення (до впровадження обліку) → unknown', async () => {
    expect(await markOrderPaid(db, 'DROP01-legacy')).toBe('unknown');
  });

  it('оплата після звільнення резерву списує знову, якщо склад є', async () => {
    await reserveStock(db, 'DROP01', order.sizes);
    await createPendingOrder(db, order);
    await releaseOrder(db, order.orderReference); // резерв повернувся
    expect(stock()).toEqual(counts(18, 11, 15));
    expect(await markOrderPaid(db, order.orderReference)).toBe('paid-after-release');
    expect(stock()).toEqual(counts(18, 9, 15));
  });

  it('оплата після звільнення без складу → oversold, склад не йде в мінус', async () => {
    await reserveStock(db, 'DROP01', order.sizes);
    await createPendingOrder(db, order);
    await releaseOrder(db, order.orderReference);
    stock().СЕРЕДНІЙ = 1; // хтось викупив майже все
    expect(
      await markOrderPaid(db, order.orderReference, new Date(), { retries: 0 }),
    ).toBe('oversold');
    expect(stock().СЕРЕДНІЙ).toBe(1);
    expect(orderDocs[0]).toMatchObject({ status: 'paid', oversold: true });
  });

  it('раса зі звільненням: retry дочікується повернення складу, oversold не хибить', async () => {
    await reserveStock(db, 'DROP01', order.sizes);
    await createPendingOrder(db, order);
    // Стан гонки: release claim-нув статус, але $inc складу ще «в польоті».
    orderDocs[0].status = 'released';
    stock().СЕРЕДНІЙ = 1; // менше, ніж треба (2)
    // «Долітаючий» $inc конкурентного release: спрацює на першому ж
    // await setTimeout усередині retry-циклу.
    setTimeout(() => {
      stock().СЕРЕДНІЙ += 2;
    }, 0);
    expect(
      await markOrderPaid(db, order.orderReference, new Date(), {
        retries: 2,
        retryDelayMs: 0,
      }),
    ).toBe('paid-after-release');
    expect(stock().СЕРЕДНІЙ).toBe(1); // 1 + 2 (повернення) - 2 (списання)
  });

  it('releaseOrder ідемпотентний — повторний виклик не повертає склад двічі', async () => {
    await reserveStock(db, 'DROP01', order.sizes);
    await createPendingOrder(db, order);
    await releaseOrder(db, order.orderReference);
    await releaseOrder(db, order.orderReference);
    expect(stock()).toEqual(counts(18, 11, 15));
  });
});

describe('releaseExpiredReservations', () => {
  it('повертає лише прострочені pending-резерви, один раз', async () => {
    const past = new Date(Date.now() - RESERVATION_TTL_MS - 1000);
    await reserveStock(db, 'DROP01', counts(1, 0, 0));
    await createPendingOrder(
      db,
      {
        orderReference: 'DROP01-old',
        productId: 'DROP01',
        sizes: counts(1, 0, 0),
        amount: 2600,
        customer: { name: 'А Б', phone: '0', email: 'a@b.c' },
      },
      past,
    );
    await reserveStock(db, 'DROP01', counts(0, 1, 0));
    await createPendingOrder(db, {
      orderReference: 'DROP01-fresh',
      productId: 'DROP01',
      sizes: counts(0, 1, 0),
      amount: 2600,
      customer: { name: 'В Г', phone: '0', email: 'v@g.d' },
    });

    await releaseExpiredReservations(db);
    await releaseExpiredReservations(db); // повторний виклик — no-op
    expect(stock()).toEqual(counts(18, 10, 15)); // свіжий резерв лишився
    expect(orderDocs.map((o) => o.status)).toEqual(['released', 'pending']);
  });
});

describe('stockAvailability', () => {
  it('true/false по розмірах, з попереднім звільненням прострочених', async () => {
    stock().СЕРЕДНІЙ = 0;
    expect(await stockAvailability(db, 'DROP01', [...SIZES])).toEqual({
      МАЛЕНЬКИЙ: true,
      СЕРЕДНІЙ: false,
      ВЕЛИКИЙ: true,
    });
  });

  it('без документа складу все недоступне', async () => {
    inventoryDocs.length = 0;
    expect(await stockAvailability(db, 'DROP01', [...SIZES])).toEqual({
      МАЛЕНЬКИЙ: false,
      СЕРЕДНІЙ: false,
      ВЕЛИКИЙ: false,
    });
  });

  it('currentAvailability — чисте читання, прострочені резерви не чіпає', async () => {
    await reserveStock(db, 'DROP01', counts(1, 0, 0));
    await createPendingOrder(
      db,
      {
        orderReference: 'DROP01-stale',
        productId: 'DROP01',
        sizes: counts(1, 0, 0),
        amount: 2600,
        customer: { name: 'А Б', phone: '0', email: 'a@b.c' },
      },
      new Date(Date.now() - RESERVATION_TTL_MS - 1000),
    );
    await currentAvailability(db, 'DROP01', [...SIZES]);
    expect(orderDocs[0].status).toBe('pending'); // не звільнила
    expect(stock()).toEqual(counts(17, 11, 15));
  });
});

describe('кілька товарів в одній колекції складу', () => {
  beforeEach(() => {
    inventoryDocs.push({ _id: 'PEDAL01', stock: { STANDARD: 10 } });
  });

  const pedalStock = () =>
    (inventoryDocs.find((d) => d._id === 'PEDAL01') as { stock: Record<string, number> })
      .stock;

  it('резерв педалі не чіпає склад футболки', async () => {
    expect(await reserveStock(db, 'PEDAL01', { STANDARD: 1 })).toBe(true);
    expect(pedalStock().STANDARD).toBe(9);
    expect(stock()).toEqual(counts(18, 11, 15));
  });

  it('одинадцятий екземпляр не резервується', async () => {
    for (let i = 0; i < 10; i++) {
      expect(await reserveStock(db, 'PEDAL01', { STANDARD: 1 })).toBe(true);
    }
    expect(await reserveStock(db, 'PEDAL01', { STANDARD: 1 })).toBe(false);
    expect(pedalStock().STANDARD).toBe(0);
  });

  it('stockAvailability педалі віддає лише її варіанти', async () => {
    expect(await stockAvailability(db, 'PEDAL01', ['STANDARD'])).toEqual({
      STANDARD: true,
    });
    pedalStock().STANDARD = 0;
    expect(await stockAvailability(db, 'PEDAL01', ['STANDARD'])).toEqual({
      STANDARD: false,
    });
  });

  it('releaseExpiredReservations повертає резерви обох товарів за один прохід', async () => {
    const past = new Date(Date.now() - RESERVATION_TTL_MS - 1000);
    await reserveStock(db, 'DROP01', counts(1, 0, 0));
    await createPendingOrder(
      db,
      {
        orderReference: 'DROP01-old',
        productId: 'DROP01',
        sizes: counts(1, 0, 0),
        amount: 2600,
        customer: { name: 'А Б', phone: '0', email: 'a@b.c' },
      },
      past,
    );
    await reserveStock(db, 'PEDAL01', { STANDARD: 1 });
    await createPendingOrder(
      db,
      {
        orderReference: 'PEDAL01-old',
        productId: 'PEDAL01',
        sizes: { STANDARD: 1 },
        amount: 3000,
        customer: { name: 'В Г', phone: '0', email: 'v@g.d' },
      },
      past,
    );

    await releaseExpiredReservations(db);

    expect(stock()).toEqual(counts(18, 11, 15));
    expect(pedalStock().STANDARD).toBe(10);
  });

  it('замовлення без productId читається як DROP01', async () => {
    await reserveStock(db, 'DROP01', counts(0, 1, 0));
    orderDocs.push({
      _id: 'DROP01-legacy1',
      sizes: counts(0, 1, 0),
      amount: 2600,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() - 1000),
      customer: { name: 'А Б', phone: '0', email: 'a@b.c' },
    });
    await releaseExpiredReservations(db);
    expect(stock()).toEqual(counts(18, 11, 15));
  });

  it('оплата педалі після звільнення резерву списує саме педаль', async () => {
    await reserveStock(db, 'PEDAL01', { STANDARD: 1 });
    await createPendingOrder(db, {
      orderReference: 'PEDAL01-1',
      productId: 'PEDAL01',
      sizes: { STANDARD: 1 },
      amount: 3000,
      customer: { name: 'В Г', phone: '0', email: 'v@g.d' },
    });
    await releaseOrder(db, 'PEDAL01-1');
    expect(pedalStock().STANDARD).toBe(10);
    expect(await markOrderPaid(db, 'PEDAL01-1')).toBe('paid-after-release');
    expect(pedalStock().STANDARD).toBe(9);
    expect(stock()).toEqual(counts(18, 11, 15));
  });
});
