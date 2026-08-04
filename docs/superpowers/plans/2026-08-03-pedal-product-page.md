# Друга сторінка товару `/pedal` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Продавати другий товар — лімітовану фузз-педаль «Димна Суміш» (10 шт.) — на сторінці `/pedal`, перевикористовуючи наявну платіжну й складську логіку, і закрити чотири дефекти інтеграції WayForPay.

**Architecture:** Реєстр товарів у коді (`lib/products.ts`) стає єдиним джерелом правди; `lib/inventory.ts` параметризується `productId` замість константи `INVENTORY_ID`; кожен товар отримує власний документ у колекції `inventory`. Сторінка `/pedal` повторює структуру головної, форма замовлення розрізається на три компоненти й приймає `product` пропсом.

**Tech Stack:** Next.js 16.2.6 (App Router), React 19.2, TypeScript, MongoDB 7.5 (Atlas, база `shop`), Zod 3.25, Vitest 4.1, WayForPay (HMAC-MD5, inline-віджет).

**Спека:** `docs/superpowers/specs/2026-08-03-pedal-product-page-design.md`

## Global Constraints

- **Мова коментарів і повідомлень користувачу — українська.** Код і назви змінних — англійська. Це наявна конвенція кодбази, не відступати.
- **Тести — Vitest**, запуск `npm test`. Конфіг збирає `lib/**/*.test.ts` і `app/**/*.test.ts`. Тести MongoDB використовують in-memory двійник із `lib/__tests__/inventory.test.ts` — не тягнути реальну базу і не додавати `mongodb-memory-server`.
- **Ціна педалі — 3000 ₴, тимчасова.** Живе одним рядком у `lib/products.ts`.
- **Медіа педалі немає.** Плейсхолдер у форматі `【ФОТО ПЕДАЛІ】` — його неможливо випадково залишити в проді. Не шукати й не вигадувати картинки.
- **Поле `sizes` у документах колекції `orders` зберігає назву.** Перейменування зламало б заявки в статусі `pending`, що зараз у польоті.
- **Замовлення без поля `productId` читаються як `'DROP01'`.** Міграції бази немає.
- **`docs/` у `.gitignore`** — коміт файлів плану/спеки потребує `git add -f`.
- **Правило кешу медіа:** заміняєш файл у `public/` — міняєш ім'я файлу (`next.config.ts` віддає їх з `max-age=31536000, immutable`).
- **Не чіпати** `lib/novaposhta.ts`, `lib/popularCities.ts`, `components/Checkout/NovaPoshtaPicker.tsx`, `components/Checkout/OtherDeliveryFields.tsx`, `app/api/novaposhta/`, `app/offer/`, `app/returns/`.
- **Комітити після кожної задачі.** Формат повідомлень — як у наявній історії (`feat:`, `fix:`, `refactor:`, `docs:`).

---

### Task 1: Реєстр товарів `lib/products.ts`

Переносить дані про товар із `lib/config.ts` у типізований реєстр і додає педаль. Поки що чисто механічно: `SIZES` і `type Size` зберігають ті самі значення, щоб решта кодбази не поламалась.

**Files:**
- Create: `lib/products.ts`
- Create: `lib/__tests__/products.test.ts`
- Modify: `lib/config.ts` (лишається `SITE_URL` + `requireEnv`)
- Modify: `lib/inventory.ts:2` (імпорт `SIZES`, `Size`)
- Modify: `lib/checkoutSchema.ts:2` (імпорт `SIZES`, `Size`)
- Modify: `lib/__tests__/checkout-schema.test.ts:3` (імпорт `SIZES`)
- Modify: `lib/structuredData.ts:1` (імпорт `PRODUCT`, `SIZES`)
- Modify: `app/api/checkout/route.ts:4` (імпорт `PRODUCT`, `SIZES`, `Size`)
- Modify: `app/api/stock/route.ts:4` (імпорт `SIZES`)
- Modify: `components/Checkout/CheckoutForm.tsx:6` (імпорт `PRODUCT`, `SIZES`, `SIZE_MEASUREMENTS`, `Size`)

**Interfaces:**
- Consumes: нічого.
- Produces: `PRODUCT_IDS`, `type ProductId`, `interface ProductVariant`, `interface ProductSpec`, `interface Product`, `PRODUCTS: Record<ProductId, Product>`, `DEFAULT_PRODUCT_ID`, `getProduct(id: string): Product | null`, `isProductId(id: string): id is ProductId`, `positionName(p: Product, variantKey: string): string`, `variantKeys(p: Product): string[]`, а також тимчасові `SIZES`, `type Size`, `SIZE_MEASUREMENTS`, `PRODUCT` (усе — реекспорт даних DROP01, знімається в Task 11).

- [ ] **Step 1: Написати падаючий тест**

Створити `lib/__tests__/products.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  PRODUCTS,
  PRODUCT_IDS,
  getProduct,
  isProductId,
  positionName,
  variantKeys,
  DEFAULT_PRODUCT_ID,
} from '../products';

describe('реєстр товарів', () => {
  it('містить рівно два товари з унікальними id і шляхами', () => {
    expect(PRODUCT_IDS).toEqual(['DROP01', 'PEDAL01']);
    const paths = PRODUCT_IDS.map((id) => PRODUCTS[id].path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('кожен товар має щонайменше один варіант і додатний ліміт', () => {
    for (const id of PRODUCT_IDS) {
      const p = PRODUCTS[id];
      expect(p.id).toBe(id);
      expect(p.variants.length).toBeGreaterThanOrEqual(1);
      expect(p.maxPerOrder).toBeGreaterThanOrEqual(1);
      expect(p.price).toBeGreaterThan(0);
      expect(new Set(variantKeys(p)).size).toBe(p.variants.length);
    }
  });

  it('футболка: три розміри, до 10 шт., пікер варіантів увімкнено', () => {
    const p = PRODUCTS.DROP01;
    expect(variantKeys(p)).toEqual(['МАЛЕНЬКИЙ', 'СЕРЕДНІЙ', 'ВЕЛИКИЙ']);
    expect(p.maxPerOrder).toBe(10);
    expect(p.showVariantPicker).toBe(true);
    expect(p.path).toBe('/');
  });

  it('педаль: один варіант, рівно 1 шт. на замовлення, пікер вимкнено', () => {
    const p = PRODUCTS.PEDAL01;
    expect(variantKeys(p)).toEqual(['STANDARD']);
    expect(p.maxPerOrder).toBe(1);
    expect(p.showVariantPicker).toBe(false);
    expect(p.path).toBe('/pedal');
    expect(p.price).toBe(3000);
    expect(p.specs?.length).toBe(9);
  });

  it('getProduct повертає null на невідомому id, не кидає', () => {
    expect(getProduct('DROP01')).toBe(PRODUCTS.DROP01);
    expect(getProduct('НЕМАЄ')).toBeNull();
    expect(getProduct('')).toBeNull();
    expect(isProductId('PEDAL01')).toBe(true);
    expect(isProductId('__proto__')).toBe(false);
  });

  it('positionName: багатоваріантний товар отримує суфікс варіанта, одноваріантний — ні', () => {
    expect(positionName(PRODUCTS.DROP01, 'СЕРЕДНІЙ')).toBe(
      'Футболка - too much яром too much долиною (СЕРЕДНІЙ)',
    );
    expect(positionName(PRODUCTS.PEDAL01, 'STANDARD')).toBe(
      'Педаль Kosko FX × Саша Чемеров - Димна Суміш',
    );
  });

  it('DEFAULT_PRODUCT_ID — футболка (сумісність зі старими замовленнями)', () => {
    expect(DEFAULT_PRODUCT_ID).toBe('DROP01');
  });
});
```

- [ ] **Step 2: Запустити тест, переконатись що падає**

Run: `npm test -- products`
Expected: FAIL — `Failed to resolve import "../products"`.

- [ ] **Step 3: Створити `lib/products.ts`**

```ts
/**
 * Реєстр товарів. Єдине джерело правди про назви, ціни й варіанти.
 *
 * Ціна свідомо живе в коді, а не в базі: її неможливо підмінити через
 * Mongo, а зміна проходить через git-review. `id` товару збігається з `_id`
 * його документа в колекції `inventory`.
 */

export const PRODUCT_IDS = ['DROP01', 'PEDAL01'] as const;
export type ProductId = (typeof PRODUCT_IDS)[number];

export interface ProductVariant {
  key: string;
  label: string;
  /** Заміри виробу в см; undefined — заміри ще не отримані від команди. */
  widthCm?: number;
  lengthCm?: number;
}

export interface ProductSpec {
  label: string;
  value: string;
}

/** Головне медіа сторінки товару. */
export type ProductMedia =
  | { kind: 'video'; src: string; poster: string }
  | { kind: 'image'; src: string }
  /** Файлів ще немає — рендериться напис, який видно в код-ревʼю і в проді. */
  | { kind: 'placeholder'; caption: string };

export interface Product {
  id: ProductId;
  /** Роут сторінки товару. Використовується і для returnUrl після оплати. */
  path: string;
  /** Назва для UI. */
  name: string;
  /** Назва позиції у платежі й фіскальному чеку WayForPay. */
  paymentName: string;
  /** Рядок під логотипом у хедері. */
  headerCaption: string;
  price: number;
  currency: 'UAH';
  sku: string;
  variants: ProductVariant[];
  /** Сумарний ліміт штук в одному замовленні. */
  maxPerOrder: number;
  /** false — варіант один, вибирати нічого, блок у формі не рендериться. */
  showVariantPicker: boolean;
  media: ProductMedia;
  /** Фото в модалці замовлення; null — файлу ще немає. */
  thumb: string | null;
  /** Картинка для JSON-LD і OpenGraph; null — файлу ще немає. */
  ogImage: string | null;
  /** Опис для schema.org. */
  schemaDescription: string;
  /** Абзаци опису в модалці. Порожньо — блок не рендериться. */
  description?: string[];
  /** Таблиця «ключ — значення» в модалці. */
  specs?: ProductSpec[];
}

export const PRODUCTS: Record<ProductId, Product> = {
  DROP01: {
    id: 'DROP01',
    path: '/',
    name: 'too much яром too much долиною',
    paymentName: 'Футболка - too much яром too much долиною',
    headerCaption: 'DROP 01 // МАЛЕНЬКИЙ · СЕРЕДНІЙ · ВЕЛИКИЙ',
    price: 2600,
    currency: 'UAH',
    sku: 'DROP01-OVERSIZE',
    // Власні назви розмірів замість S/M/L — свідоме рішення команди
    // (розміри не збігаються зі стандартними).
    variants: [
      { key: 'МАЛЕНЬКИЙ', label: 'МАЛЕНЬКИЙ' },
      { key: 'СЕРЕДНІЙ', label: 'СЕРЕДНІЙ' },
      { key: 'ВЕЛИКИЙ', label: 'ВЕЛИКИЙ' },
    ],
    maxPerOrder: 10,
    showVariantPicker: true,
    media: { kind: 'video', src: '/tshirt.mp4', poster: '/video.jpg' },
    thumb: '/too-much-яром-too-much-долиною.webp',
    ogImage: '/too-much-yarom-dolynoyu.jpg',
    schemaDescription:
      'Оверсайз-футболка "too much яром too much долиною" — лімітований дроп Sasha Chemerov × Димна Суміш.',
  },
  PEDAL01: {
    id: 'PEDAL01',
    path: '/pedal',
    name: 'Димна Суміш',
    paymentName: 'Педаль Kosko FX × Саша Чемеров - Димна Суміш',
    headerCaption: 'ДИМНА СУМІШ // LIMITED 10',
    price: 3000,
    currency: 'UAH',
    sku: 'PEDAL01-DYMNA-SUMISH',
    variants: [{ key: 'STANDARD', label: 'STANDARD' }],
    maxPerOrder: 1,
    showVariantPicker: false,
    media: { kind: 'placeholder', caption: '【ФОТО ПЕДАЛІ】' },
    thumb: null,
    ogImage: null,
    schemaDescription:
      'Фузз-дисторшн "Димна Суміш" — лімітована колаборація Kosko FX × Саша Чемеров на основі схеми EarthQuaker Devices Hizumitas. Ручна робота, тираж 10 штук.',
    description: [
      'Це ексклюзивна лімітована колаборація Kosko FX та Саші Чемерова, створена спеціально для шанувальників творчості гурту «Димна Суміш». Педаль зібрана повністю вручну, а серія обмежена лише 10 екземплярами.',
      'В основі «Димна Суміш» лежить схема EQD Hizumitas (культовий вінтажний Elk Big Muff Sustainar) — фузз-дисторшн із монументальним характером. Ми зберегли весь його фірмовий жир, але зробили звук ще універсальнішим. Педаль має виключно щільний та пружний низ, завдяки чому чудово працює не лише з електрогітарою, а й з бас-гітарою. Крім того, ми злегка підняли середні частоти, тому інструмент більше не провалюється в загальному міксі та чітко прорізає будь-яку пачку.',
      'Керування ефектом класичне та інтуїтивне: ручки Volume, Tone та Sustain дозволяють легко вирулити як легкий динамічний драйв для фактурних партій, так і агресивний фузз для важких рифів.',
    ],
    specs: [
      { label: 'Тип ефекту', value: 'Distortion / Sustainer' },
      { label: 'Схема', value: 'На основі EarthQuaker Devices Hizumitas Fuzz' },
      { label: 'Живлення', value: '9V DC, center negative' },
      { label: 'Тип байпасу', value: 'True Bypass' },
      { label: 'Органи керування', value: 'Volume, Tone, Sustain' },
      { label: 'Розміри', value: '112 × 60.5 × 31 мм' },
      { label: 'Корпус', value: 'Алюміній (формат 1590B)' },
      { label: 'Тираж', value: '10 штук' },
      { label: 'Особливості', value: 'Ручна робота (Handmade), Limited Edition' },
    ],
  },
};

/** Товар за замовчуванням — для замовлень, створених до появи реєстру. */
export const DEFAULT_PRODUCT_ID: ProductId = 'DROP01';

export function isProductId(id: string): id is ProductId {
  return (PRODUCT_IDS as readonly string[]).includes(id);
}

/** null замість кидка: id приходить із запиту й може бути будь-чим. */
export function getProduct(id: string): Product | null {
  return isProductId(id) ? PRODUCTS[id] : null;
}

export function variantKeys(p: Product): string[] {
  return p.variants.map((v) => v.key);
}

/**
 * Назва позиції в платежі. Для одноваріантного товару суфікс варіанта —
 * шум у чеку, тому додається лише коли варіантів більше одного.
 */
export function positionName(p: Product, variantKey: string): string {
  if (p.variants.length <= 1) return p.paymentName;
  const label = p.variants.find((v) => v.key === variantKey)?.label ?? variantKey;
  return `${p.paymentName} (${label})`;
}

// --- Тимчасові реекспорти даних DROP01 -------------------------------------
// Знімаються в Task 11, коли всі споживачі стануть product-aware.

export const SIZES = ['МАЛЕНЬКИЙ', 'СЕРЕДНІЙ', 'ВЕЛИКИЙ'] as const;
export type Size = (typeof SIZES)[number];

export const SIZE_MEASUREMENTS: Record<
  Size,
  { widthCm: number; lengthCm: number } | null
> = {
  МАЛЕНЬКИЙ: null,
  СЕРЕДНІЙ: null,
  ВЕЛИКИЙ: null,
};

export const PRODUCT = PRODUCTS.DROP01;
```

- [ ] **Step 4: Обрізати `lib/config.ts` до інфраструктури**

Повний новий вміст файлу:

```ts
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://isusneisus.com';

/** Доступ до серверних env зі зрозумілою помилкою за відсутності. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}
```

- [ ] **Step 5: Перевести імпорти на `@/lib/products`**

У шести файлах змінити **тільки шлях імпорту**, імена лишаються ті самі:

| Файл | Було | Стало |
|---|---|---|
| `lib/inventory.ts` | `from './config'` → `SIZES`, `Size` | `from './products'` |
| `lib/checkoutSchema.ts` | `from './config'` → `SIZES`, `Size` | `from './products'` |
| `lib/__tests__/checkout-schema.test.ts` | `from '../config'` → `SIZES` | `from '../products'` |
| `lib/structuredData.ts` | `from './config'` → `PRODUCT`, `SIZES`, `SITE_URL` | `PRODUCT`, `SIZES` з `./products`; `SITE_URL` лишається з `./config` |
| `app/api/checkout/route.ts` | `from '@/lib/config'` → `PRODUCT`, `SITE_URL`, `SIZES`, `requireEnv`, `Size` | `PRODUCT`, `SIZES`, `Size` з `@/lib/products`; `SITE_URL`, `requireEnv` лишаються |
| `app/api/stock/route.ts` | `from '@/lib/config'` → `SIZES` | `from '@/lib/products'` |
| `components/Checkout/CheckoutForm.tsx` | `from '@/lib/config'` → `PRODUCT`, `SIZES`, `SIZE_MEASUREMENTS`, `Size` | `from '@/lib/products'` |

- [ ] **Step 6: Запустити всі тести й typecheck**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: усі тести PASS (нові products + усі наявні), нуль помилок типів, нуль помилок лінтера.

- [ ] **Step 7: Коміт**

```bash
git add lib/products.ts lib/__tests__/products.test.ts lib/config.ts lib/inventory.ts lib/checkoutSchema.ts lib/__tests__/checkout-schema.test.ts lib/structuredData.ts app/api/checkout/route.ts app/api/stock/route.ts components/Checkout/CheckoutForm.tsx
git commit -m "feat: product registry with pedal entry"
```

---

### Task 2: `lib/inventory.ts` приймає `productId`

Прибирає константу `INVENTORY_ID` із сигнатур. Логіка резервування не змінюється — змінюється тільки те, який документ складу вона чіпає.

**Files:**
- Modify: `lib/inventory.ts`
- Modify: `lib/__tests__/inventory.test.ts`
- Modify: `app/api/checkout/route.ts` (виклики `reserveStock`, `unreserveStock`, `currentAvailability`, `createPendingOrder`)
- Modify: `app/api/stock/route.ts` (виклик `stockAvailability`)

**Interfaces:**
- Consumes: `PRODUCTS`, `DEFAULT_PRODUCT_ID`, `variantKeys` з Task 1.
- Produces:
  - `type VariantCounts = Record<string, number>` (аліас `SizeCounts` лишається як реекспорт)
  - `reserveFilter(productId: string, counts: VariantCounts): Record<string, unknown>`
  - `stockInc(counts: VariantCounts, sign: 1 | -1): Record<string, number>`
  - `reserveStock(db: Db, productId: string, counts: VariantCounts): Promise<boolean>`
  - `unreserveStock(db: Db, productId: string, counts: VariantCounts): Promise<void>`
  - `currentAvailability(db: Db, productId: string, keys: string[]): Promise<Record<string, boolean>>`
  - `stockAvailability(db: Db, productId: string, keys: string[]): Promise<Record<string, boolean>>`
  - `createPendingOrder(db, input: { orderReference, productId, sizes, amount, customer }, now?)`
  - `orderProductId(o: { productId?: string }): string`

- [ ] **Step 1: Написати падаючі тести**

Дописати в кінець `lib/__tests__/inventory.test.ts` (наявні тести теж треба буде оновити під нові сигнатури — це Step 3):

```ts
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
```

- [ ] **Step 2: Запустити, переконатись що падає**

Run: `npm test -- inventory`
Expected: FAIL — компіляція падає на зайвому аргументі `productId` у `reserveStock`.

- [ ] **Step 3: Оновити наявні тести під нові сигнатури**

Механічно у `lib/__tests__/inventory.test.ts`:
- `reserveStock(db, X)` → `reserveStock(db, 'DROP01', X)`
- `stockAvailability(db)` → `stockAvailability(db, 'DROP01', [...SIZES])` (додати імпорт `SIZES` з `../products`)
- `currentAvailability(db)` → `currentAvailability(db, 'DROP01', [...SIZES])`
- `reserveFilter(X)` → `reserveFilter('DROP01', X)`; очікуваний обʼєкт лишається тим самим
- у кожен обʼєкт, що передається в `createPendingOrder`, додати `productId: 'DROP01'`
- імпорт `INVENTORY_ID` прибрати, замінити на літерал `'DROP01'`

- [ ] **Step 4: Переписати `lib/inventory.ts`**

Змінюються сигнатури й тіла нижчеперелічених функцій. Решта файлу (`RESERVATION_TTL_MS`, `MarkPaidResult`, коментарі-пояснення) лишається як є.

```ts
import type { Db } from 'mongodb';
import { DEFAULT_PRODUCT_ID } from './products';

export const RESERVATION_TTL_MS = 30 * 60 * 1000;

/** Кількості по ключах варіантів товару. */
export type VariantCounts = Record<string, number>;
/** Історична назва — лишена, щоб не переписувати наявні імпорти. */
export type SizeCounts = VariantCounts;

export type OrderStatus = 'pending' | 'paid' | 'released';

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
  oversold?: boolean;
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

export async function unreserveStock(
  db: Db,
  productId: string,
  counts: VariantCounts,
): Promise<void> {
  await inventoryOf(db).updateOne({ _id: productId }, { $inc: stockInc(counts, 1) });
}

export async function currentAvailability(
  db: Db,
  productId: string,
  keys: string[],
): Promise<Record<string, boolean>> {
  const doc = await inventoryOf(db).findOne({ _id: productId });
  return Object.fromEntries(keys.map((k) => [k, (doc?.stock[k] ?? 0) > 0]));
}

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
```

Три функції правляться точково — беруть `productId` із самого документа замовлення:

```ts
// у markOrderPaid, гілка fromReleased:
      if (await reserveStock(db, orderProductId(fromReleased), fromReleased.sizes))
        return 'paid-after-release';

// releaseOrder — цілком:
export async function releaseOrder(db: Db, orderReference: string): Promise<void> {
  const claimed = await ordersOf(db).findOneAndUpdate(
    { _id: orderReference, status: 'pending' },
    { $set: { status: 'released' } },
  );
  if (claimed) await unreserveStock(db, orderProductId(claimed), claimed.sizes);
}
```

`releaseExpiredReservations` не змінюється — вона вже делегує в `releaseOrder`, який тепер сам знає товар.

- [ ] **Step 5: Оновити три виклики в роутах**

`app/api/checkout/route.ts` — усі виклики отримують `'DROP01'` другим аргументом (product-aware цей роут стане в Task 8):

```ts
    if (!(await reserveStock(db, 'DROP01', sizes))) {
      return NextResponse.json(
        { error: 'out-of-stock', availability: await currentAvailability(db, 'DROP01', [...SIZES]) },
        { status: 409 },
      );
    }
    reserved = true;
    await createPendingOrder(db, {
      orderReference,
      productId: 'DROP01',
      sizes,
      // …решта без змін
    });
```

і в catch-гілці: `await unreserveStock(await getDb(), 'DROP01', sizes);`

`app/api/stock/route.ts`: `await stockAvailability(await getDb(), 'DROP01', [...SIZES])`.

- [ ] **Step 6: Запустити тести й typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: PASS, включно з шістьма новими тестами мультитоварності.

- [ ] **Step 7: Коміт**

```bash
git add lib/inventory.ts lib/__tests__/inventory.test.ts app/api/checkout/route.ts app/api/stock/route.ts
git commit -m "refactor: inventory keyed by productId instead of a single constant"
```

---

### Task 3: Статус `refunded` і `markOrderRefunded`

Готує базу під фікс WFP-4. Склад свідомо **не** інкрементується — рішення зафіксоване в спеці.

**Files:**
- Modify: `lib/inventory.ts`
- Modify: `lib/__tests__/inventory.test.ts`

**Interfaces:**
- Consumes: `orderProductId`, `OrderDoc` з Task 2.
- Produces:
  - `OrderStatus` розширюється до `'pending' | 'paid' | 'released' | 'refunded'`
  - `OrderDoc.refundedAt?: Date`
  - `type RefundResult = 'refunded' | 'already-refunded' | 'unknown'`
  - `markOrderRefunded(db: Db, orderReference: string, now?: Date): Promise<RefundResult>`
  - `MarkPaidResult` розширюється значенням `'refunded'`

- [ ] **Step 1: Написати падаючі тести**

Дописати в `lib/__tests__/inventory.test.ts`:

```ts
describe('markOrderRefunded', () => {
  const order = {
    orderReference: 'PEDAL01-r1',
    productId: 'PEDAL01',
    sizes: { STANDARD: 1 },
    amount: 3000,
    customer: { name: 'Тест Тестовий', phone: '0670000000', email: 't@t.ua' },
  };

  beforeEach(() => {
    inventoryDocs.push({ _id: 'PEDAL01', stock: { STANDARD: 10 } });
  });

  const pedalStock = () =>
    (inventoryDocs.find((d) => d._id === 'PEDAL01') as { stock: Record<string, number> })
      .stock;

  it('оплачене замовлення переходить у refunded, склад НЕ повертається', async () => {
    await reserveStock(db, 'PEDAL01', order.sizes);
    await createPendingOrder(db, order);
    await markOrderPaid(db, order.orderReference);
    expect(pedalStock().STANDARD).toBe(9);

    expect(await markOrderRefunded(db, order.orderReference)).toBe('refunded');
    expect(orderDocs[0]).toMatchObject({ status: 'refunded' });
    expect(orderDocs[0].refundedAt).toBeInstanceOf(Date);
    // Менеджер повертає одиницю вручну — автоповернення виставило б на
    // продаж педаль, якої фізично може не бути.
    expect(pedalStock().STANDARD).toBe(9);
  });

  it('повторний колбек про повернення → already-refunded', async () => {
    await reserveStock(db, 'PEDAL01', order.sizes);
    await createPendingOrder(db, order);
    await markOrderPaid(db, order.orderReference);
    await markOrderRefunded(db, order.orderReference);
    expect(await markOrderRefunded(db, order.orderReference)).toBe('already-refunded');
  });

  it('невідоме замовлення → unknown', async () => {
    expect(await markOrderRefunded(db, 'PEDAL01-нема')).toBe('unknown');
  });

  it('Approved після повернення не воскрешає оплату', async () => {
    await reserveStock(db, 'PEDAL01', order.sizes);
    await createPendingOrder(db, order);
    await markOrderPaid(db, order.orderReference);
    await markOrderRefunded(db, order.orderReference);
    expect(await markOrderPaid(db, order.orderReference)).toBe('refunded');
    expect(orderDocs[0].status).toBe('refunded');
    expect(pedalStock().STANDARD).toBe(9);
  });
});
```

- [ ] **Step 2: Запустити, переконатись що падає**

Run: `npm test -- inventory`
Expected: FAIL — `markOrderRefunded is not exported`.

- [ ] **Step 3: Реалізувати**

У `lib/inventory.ts`:

```ts
export type OrderStatus = 'pending' | 'paid' | 'released' | 'refunded';
```

Додати `refundedAt?: Date;` в `OrderDoc`, `| 'refunded'` в `MarkPaidResult`, і в кінець `markOrderPaid` — перед фінальним `return`:

```ts
  const existing = await orders.findOne({ _id: orderReference });
  if (!existing) return 'unknown';
  // Повернене замовлення не воскресає: гроші вже пішли назад покупцю.
  if (existing.status === 'refunded') return 'refunded';
  return 'already-paid';
```

Нова функція:

```ts
export type RefundResult =
  /** Замовлення позначене поверненим. */
  | 'refunded'
  /** Повторний колбек по вже поверненому замовленню. */
  | 'already-refunded'
  /** Замовлення в базі немає. */
  | 'unknown';

/**
 * Фіксує повернення коштів. Склад НЕ інкрементується свідомо: повернення
 * зазвичай приходить після відправлення або по бракованому екземпляру, і
 * автоповернення виставило б на продаж товар, якого фізично немає.
 * Менеджер повертає одиницю вручну через `npm run seed:stock`.
 */
export async function markOrderRefunded(
  db: Db,
  orderReference: string,
  now = new Date(),
): Promise<RefundResult> {
  const orders = ordersOf(db);
  const claimed = await orders.findOneAndUpdate(
    { _id: orderReference, status: { $ne: 'refunded' } },
    { $set: { status: 'refunded', refundedAt: now } },
  );
  if (claimed) return 'refunded';
  const existing = await orders.findOne({ _id: orderReference });
  return existing ? 'already-refunded' : 'unknown';
}
```

- [ ] **Step 4: Навчити тестовий двійник оператора `$ne`**

У `lib/__tests__/inventory.test.ts`, функція `matches`, у блок обробки операторів додати рядок **перед** `return true`:

```ts
      if ('$ne' in ops && actual === ops.$ne) return false;
```

- [ ] **Step 5: Запустити тести**

Run: `npm test -- inventory`
Expected: PASS, усі чотири нові тести зелені.

- [ ] **Step 6: Коміт**

```bash
git add lib/inventory.ts lib/__tests__/inventory.test.ts
git commit -m "feat: refunded order status and markOrderRefunded"
```

---

### Task 4: Фікси WayForPay 1–3 (імʼя/прізвище, orderTimeout, колізії номерів)

Три дефекти в одному платіжному payload. Ревʼюер дивиться їх разом.

**Files:**
- Create: `lib/orderReference.ts`
- Create: `lib/__tests__/orderReference.test.ts`
- Modify: `app/api/checkout/route.ts`
- Modify: `app/api/wayforpay-return/route.ts:17`
- Modify: `app/api/order-status/route.ts:11`

`lib/types.ts` **не** чіпаємо: `orderTimeout` не входить у підпис, тому додається в локальний intersection-тип усередині `route.ts`, а не в `WayForPayParams`.

**Interfaces:**
- Consumes: `PRODUCT_IDS` з Task 1, `RESERVATION_TTL_MS` з Task 2.
- Produces: `newOrderReference(productId: string, now?: number): string`, `ORDER_REF_RE: RegExp`, `productIdFromRef(ref: string): string | null`.

- [ ] **Step 1: Написати падаючий тест**

Створити `lib/__tests__/orderReference.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { newOrderReference, ORDER_REF_RE, productIdFromRef } from '../orderReference';

describe('newOrderReference', () => {
  it('має формат <PRODUCT_ID>-<timestamp><суфікс> і проходить ORDER_REF_RE', () => {
    const ref = newOrderReference('PEDAL01', 1754200000000);
    expect(ref.startsWith('PEDAL01-1754200000000')).toBe(true);
    expect(ref).toMatch(ORDER_REF_RE);
  });

  it('тисяча номерів в одну мілісекунду — жодної колізії', () => {
    const refs = new Set(
      Array.from({ length: 1000 }, () => newOrderReference('PEDAL01', 1754200000000)),
    );
    expect(refs.size).toBe(1000);
  });

  it('суфікс — рівно 4 символи [0-9a-z]', () => {
    const suffix = newOrderReference('DROP01', 1754200000000).slice('DROP01-1754200000000'.length);
    expect(suffix).toMatch(/^[0-9a-z]{4}$/);
  });
});

describe('ORDER_REF_RE', () => {
  it('приймає старі суто-цифрові номери (зворотна сумісність)', () => {
    expect('DROP01-1752600000000').toMatch(ORDER_REF_RE);
  });

  it('приймає обидва товари', () => {
    expect('PEDAL01-1754200000000ab3z').toMatch(ORDER_REF_RE);
    expect('DROP01-1754200000000ab3z').toMatch(ORDER_REF_RE);
  });

  it('відхиляє чужі й підозрілі значення', () => {
    for (const bad of [
      'OTHER-1754200000000',
      'DROP01-123',
      'DROP01-1754200000000ABZZ',
      'DROP01-1754200000000; DROP TABLE',
      '../DROP01-1754200000000',
      '',
    ]) {
      expect(bad).not.toMatch(ORDER_REF_RE);
    }
  });
});

describe('productIdFromRef', () => {
  it('дістає товар із номера замовлення', () => {
    expect(productIdFromRef('PEDAL01-1754200000000ab3z')).toBe('PEDAL01');
    expect(productIdFromRef('DROP01-1752600000000')).toBe('DROP01');
  });

  it('повертає null на невалідному номері', () => {
    expect(productIdFromRef('OTHER-1754200000000')).toBeNull();
    expect(productIdFromRef('сміття')).toBeNull();
  });
});
```

- [ ] **Step 2: Запустити, переконатись що падає**

Run: `npm test -- orderReference`
Expected: FAIL — `Failed to resolve import "../orderReference"`.

- [ ] **Step 3: Створити `lib/orderReference.ts`**

```ts
import { randomBytes } from 'crypto';
import { PRODUCT_IDS, isProductId } from './products';

/**
 * Номер замовлення: `<PRODUCT_ID>-<unix ms><4 символи випадковості>`.
 *
 * Випадковий суфікс тут не для секретності, а проти колізій: чистий
 * Date.now() дає однаковий _id двом запитам в одну мілісекунду, і другий
 * покупець отримує 503 замість оплати.
 */
const SUFFIX_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const SUFFIX_LENGTH = 4;

export function newOrderReference(productId: string, now = Date.now()): string {
  const bytes = randomBytes(SUFFIX_LENGTH);
  let suffix = '';
  for (const b of bytes) suffix += SUFFIX_ALPHABET[b % SUFFIX_ALPHABET.length];
  return `${productId}-${now}${suffix}`;
}

/**
 * Формат наших номерів. Діапазон довжини покриває і старі суто-цифрові
 * номери (13 символів), і нові з суфіксом (17).
 */
export const ORDER_REF_RE = new RegExp(
  `^(${PRODUCT_IDS.join('|')})-[0-9a-z]{10,24}$`,
);

/** Товар за номером замовлення; null — номер не наш. */
export function productIdFromRef(ref: string): string | null {
  if (!ORDER_REF_RE.test(ref)) return null;
  const id = ref.slice(0, ref.indexOf('-'));
  return isProductId(id) ? id : null;
}
```

- [ ] **Step 4: Запустити тест**

Run: `npm test -- orderReference`
Expected: PASS.

- [ ] **Step 5: Виправити імʼя/прізвище й додати orderTimeout у checkout**

У `app/api/checkout/route.ts`:

Замінити генерацію номера:

```ts
  const orderReference = newOrderReference('DROP01');
```

(імпорт: `import { newOrderReference } from '@/lib/orderReference';`)

Замінити розбір ПІБ — поле форми підписане «ІМ'Я І ПРІЗВИЩЕ», тобто перше слово це імʼя:

```ts
  // Поле форми — «ІМ'Я І ПРІЗВИЩЕ»: перше слово імʼя, решта прізвище.
  const [firstName, ...lastParts] = input.fullName.trim().split(/\s+/);
```

і в `params`:

```ts
    clientFirstName: firstName,
    clientLastName: lastParts.join(' ') || '-',
```

Додати `orderTimeout` у той самий обʼєкт `params` (не в `base` — підпис його не включає):

```ts
    // Рахунок WayForPay має померти разом із резервом складу, інакше
    // оплата прилітає після звільнення резерву й дає oversold.
    orderTimeout: Math.floor(RESERVATION_TTL_MS / 1000),
```

(імпорт `RESERVATION_TTL_MS` уже є з `@/lib/inventory`; додати `orderTimeout: number` у тип intersection поруч із `serviceUrl`.)

- [ ] **Step 6: Замінити хардкоджені регекси**

`app/api/wayforpay-return/route.ts` — видалити інлайновий регекс, використати спільний:

```ts
import { ORDER_REF_RE } from '@/lib/orderReference';
// …
  const ref = typeof rawRef === 'string' && ORDER_REF_RE.test(rawRef) ? `&ref=${rawRef}` : '';
```

`app/api/order-status/route.ts` — видалити локальну константу `REF_RE`, імпортувати `ORDER_REF_RE` і використати її у перевірці.

- [ ] **Step 7: Запустити все**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 8: Коміт**

```bash
git add lib/orderReference.ts lib/__tests__/orderReference.test.ts app/api/checkout/route.ts app/api/wayforpay-return/route.ts app/api/order-status/route.ts
git commit -m "fix: wayforpay client name order, orderTimeout, collision-free order refs"
```

---

### Task 5: Фікс WayForPay 4 — обробка `Refunded` / `Voided`

**Files:**
- Modify: `app/api/wayforpay-callback/route.ts`
- Modify: `lib/telegram.ts`
- Modify: `lib/__tests__/telegram.test.ts`

**Interfaces:**
- Consumes: `markOrderRefunded`, `RefundResult` з Task 3.
- Produces: `formatRefundedMessage(orderReference: string, amount: number, result: RefundResult): string`.

- [ ] **Step 1: Написати падаючий тест**

Дописати в `lib/__tests__/telegram.test.ts`:

```ts
describe('formatRefundedMessage', () => {
  it('містить номер, суму і явну інструкцію менеджеру', () => {
    const msg = formatRefundedMessage('PEDAL01-1754200000000ab3z', 3000, 'refunded');
    expect(msg).toContain('PEDAL01-1754200000000ab3z');
    expect(msg).toContain('3000');
    expect(msg).toContain('seed:stock');
  });

  it('повторний колбек позначається окремо', () => {
    expect(formatRefundedMessage('PEDAL01-1', 3000, 'already-refunded')).toContain(
      'повторний',
    );
  });

  it('екранує HTML у номері замовлення', () => {
    expect(formatRefundedMessage('<b>x</b>', 1, 'refunded')).toContain('&lt;b&gt;');
  });
});
```

(додати `formatRefundedMessage` в імпорт із `../telegram`)

- [ ] **Step 2: Запустити, переконатись що падає**

Run: `npm test -- telegram`
Expected: FAIL — `formatRefundedMessage is not exported`.

- [ ] **Step 3: Реалізувати повідомлення**

У `lib/telegram.ts`:

```ts
import type { RefundResult } from './inventory';

/**
 * Повернення коштів. Склад автоматично не поповнюється — менеджер вирішує,
 * чи екземпляр фізично повернувся у продаж.
 */
export function formatRefundedMessage(
  orderReference: string,
  amount: number,
  result: RefundResult,
): string {
  const head =
    result === 'already-refunded'
      ? '↩️ <b>Повернення коштів (повторний колбек)</b>'
      : '↩️ <b>Повернення коштів</b>';
  return [
    head,
    `<b>№:</b> ${escapeHtml(orderReference)}`,
    `<b>Сума:</b> ${amount} ₴`,
    '',
    'Одиниця складу автоматично НЕ повернена.',
    'Якщо товар фізично повернувся у продаж — поверніть його командою npm run seed:stock.',
  ].join('\n');
}
```

- [ ] **Step 4: Підключити в колбек**

У `app/api/wayforpay-callback/route.ts` додати гілку **перед** наявною `Declined`/`Expired`:

```ts
    } else if (
      body.transactionStatus === 'Refunded' ||
      body.transactionStatus === 'Voided'
    ) {
      // Без цього повернена одиниця зникає зі складу назавжди: замовлення
      // лишається 'paid', а товару фізично вже може не бути.
      let refundResult: RefundResult | 'db-error' = 'db-error';
      try {
        refundResult = await markOrderRefunded(await getDb(), body.orderReference);
      } catch (err) {
        console.error('markOrderRefunded failed', body.orderReference, err);
      }
      const text =
        refundResult === 'db-error'
          ? [
              '⚠️ <b>УВАГА: повернення не записано в базу</b>',
              `<b>№:</b> ${escapeHtml(body.orderReference)}`,
              'Перевірте статус замовлення вручну.',
            ].join('\n')
          : formatRefundedMessage(body.orderReference, body.amount, refundResult);
      try {
        await sendToTelegram(
          requireEnv('TELEGRAM_BOT_TOKEN'),
          requireEnv('TELEGRAM_CHAT_ID'),
          text,
        );
      } catch (err) {
        console.error('Telegram refund notify failed', body.orderReference, err);
      }
    } else if (
```

Оновити імпорти файлу: `markOrderRefunded`, `type RefundResult` з `@/lib/inventory`; `formatRefundedMessage`, `escapeHtml` з `@/lib/telegram`.

- [ ] **Step 5: Запустити тести й typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Коміт**

```bash
git add app/api/wayforpay-callback/route.ts lib/telegram.ts lib/__tests__/telegram.test.ts
git commit -m "fix: handle wayforpay Refunded/Voided callbacks"
```

---

### Task 6: `checkoutSchema` знає про товар

**Files:**
- Modify: `lib/checkoutSchema.ts`
- Modify: `lib/__tests__/checkout-schema.test.ts`
- Modify: `lib/validateCheckout.ts` (лише тип `FieldErrors`, якщо не компілюється)

**Interfaces:**
- Consumes: `getProduct`, `DEFAULT_PRODUCT_ID`, `variantKeys` з Task 1.
- Produces:
  - `checkoutSchema` з полями `productId?: string` і `sizes: Record<string, number>`
  - `totalQuantity(sizes: Record<string, number>): number`
  - `emptySizes(product: Product): Record<string, number>` — стартовий стан форми
  - `CheckoutInput`, `CheckoutFormState` — типи оновлені

- [ ] **Step 1: Полагодити три наявні тести, які нова схема неминуче ламає**

Це не рефакторинг заради краси — без цього Step 4 не пройде. У `lib/__tests__/checkout-schema.test.ts`:

**1a.** Тест `'rejects more than 10 items total'` очікує рядок `'Максимум 10 штук у замовленні'`. Нове повідомлення параметризоване і читається однаково для 1 і для 10. Замінити очікування на:

```ts
      expect(issue?.message).toBe('Максимум 10 шт. у замовленні');
```

**1b.** Тест `'keeps schema keys in sync with SIZES'` звертається до `checkoutSchema.innerType().shape.sizes.shape`. Після переходу на `z.record` у `sizes` немає `.shape` — тест видалити цілком і замість нього поставити такий (він стереже той самий ризик — розсинхрон схеми з реєстром — але через поведінку, а не через нутрощі Zod):

```ts
  it('набір ключів звіряється з реєстром товарів, а не з константою', () => {
    // Якщо в реєстрі зʼявиться четвертий варіант, а форма надішле три —
    // валідація має впасти, а не мовчки прочитати undefined.
    const res = checkoutSchema.safeParse({
      ...npOrder,
      sizes: Object.fromEntries(
        variantKeys(PRODUCTS.DROP01).map((k, i) => [k, i === 0 ? 1 : 0]),
      ),
    });
    expect(res.success).toBe(true);
  });
```

Імпорт `SIZES` більше не потрібен — замінити на `import { PRODUCTS, variantKeys } from '../products';`.

**1c.** Тест `'rejects a missing size key'` (`sizes: { МАЛЕНЬКИЙ: 1, СЕРЕДНІЙ: 0 }`) має лишитись зеленим. Це і диктує правило схеми: набір ключів мусить **точно** збігатися з варіантами товару, а не просто «без зайвих». Тест не чіпати.

- [ ] **Step 2: Написати падаючі тести нової поведінки**

Дописати в `lib/__tests__/checkout-schema.test.ts` (фікстура `npOrder` уже є у файлі — перевикористовуємо її):

```ts
import { emptySizes } from '../checkoutSchema';

describe('checkoutSchema - вибір товару', () => {
  it('без productId форма трактується як футболка', () => {
    expect(checkoutSchema.safeParse(npOrder).success).toBe(true);
  });

  it('невідомий productId відхиляється', () => {
    const res = checkoutSchema.safeParse({
      ...npOrder,
      productId: 'НЕМАЄ',
      sizes: { STANDARD: 1 },
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.find((i) => i.path[0] === 'productId')?.message).toBe(
        'Невідомий товар',
      );
    }
  });

  it('ключі варіантів чужого товару відхиляються', () => {
    expect(
      checkoutSchema.safeParse({
        ...npOrder,
        productId: 'PEDAL01',
        sizes: { СЕРЕДНІЙ: 1 },
      }).success,
    ).toBe(false);
  });

  it('зайвий ключ поверх правильних відхиляється', () => {
    expect(
      checkoutSchema.safeParse({
        ...npOrder,
        sizes: { МАЛЕНЬКИЙ: 1, СЕРЕДНІЙ: 0, ВЕЛИКИЙ: 0, ГІГАНТСЬКИЙ: 1 },
      }).success,
    ).toBe(false);
  });
});

describe('checkoutSchema - ліміт кількості залежить від товару', () => {
  const pedal = { ...npOrder, productId: 'PEDAL01' };

  it('педаль: одна штука проходить', () => {
    expect(checkoutSchema.safeParse({ ...pedal, sizes: { STANDARD: 1 } }).success).toBe(
      true,
    );
  });

  it('педаль: дві штуки відхиляються — «Максимум 1 шт. у замовленні»', () => {
    const res = checkoutSchema.safeParse({ ...pedal, sizes: { STANDARD: 2 } });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.find((i) => i.path[0] === 'sizes')?.message).toBe(
        'Максимум 1 шт. у замовленні',
      );
    }
  });

  it('педаль: нуль штук відхиляється без згадки про розмір', () => {
    const res = checkoutSchema.safeParse({ ...pedal, sizes: { STANDARD: 0 } });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.find((i) => i.path[0] === 'sizes')?.message).toBe(
        'Товар недоступний',
      );
    }
  });

  it('футболка: десять штук проходять, одинадцята — ні', () => {
    expect(
      checkoutSchema.safeParse({
        ...npOrder,
        sizes: { МАЛЕНЬКИЙ: 10, СЕРЕДНІЙ: 0, ВЕЛИКИЙ: 0 },
      }).success,
    ).toBe(true);
    expect(
      checkoutSchema.safeParse({
        ...npOrder,
        sizes: { МАЛЕНЬКИЙ: 10, СЕРЕДНІЙ: 1, ВЕЛИКИЙ: 0 },
      }).success,
    ).toBe(false);
  });
});

describe('emptySizes', () => {
  it('футболка стартує з нулів — розмір обирає покупець', () => {
    expect(emptySizes(PRODUCTS.DROP01)).toEqual({
      МАЛЕНЬКИЙ: 0,
      СЕРЕДНІЙ: 0,
      ВЕЛИКИЙ: 0,
    });
  });

  it('педаль стартує з однієї штуки — вибирати нічого', () => {
    expect(emptySizes(PRODUCTS.PEDAL01)).toEqual({ STANDARD: 1 });
  });
});
```

- [ ] **Step 3: Запустити, переконатись що падає**

Run: `npm test -- checkout-schema`
Expected: FAIL — `emptySizes is not exported`, тести лімітів і `Максимум 1 шт.` червоні.

- [ ] **Step 4: Переписати верх `lib/checkoutSchema.ts`**

Замінити імпорт, `sizeCount`, `totalQuantity`, поле `sizes` і початок `superRefine`:

```ts
import { z } from 'zod';
import { DEFAULT_PRODUCT_ID, getProduct, variantKeys, type Product } from './products';

/** Найбільший ліміт серед товарів — груба верхня межа до перевірки товару. */
const HARD_MAX = 10;

/** Сумарна кількість штук у замовленні. */
export const totalQuantity = (sizes: Record<string, number>): number =>
  Object.values(sizes).reduce((sum, n) => sum + n, 0);

/** Стартовий стан кількостей: одноваріантний товар одразу має 1 шт. */
export function emptySizes(product: Product): Record<string, number> {
  if (!product.showVariantPicker) return { [product.variants[0].key]: 1 };
  return Object.fromEntries(variantKeys(product).map((k) => [k, 0]));
}
```

У `z.object({ … })` поле `sizes` стає:

```ts
    productId: z.string().optional(),
    sizes: z.record(z.string(), z.number().int().min(0).max(HARD_MAX)),
```

Початок `superRefine` (решта — перевірки доставки — не змінюється):

```ts
  .superRefine((data, ctx) => {
    const product = getProduct(data.productId ?? DEFAULT_PRODUCT_ID);
    if (!product) {
      ctx.addIssue({ code: 'custom', path: ['productId'], message: 'Невідомий товар' });
      return;
    }

    // Набір ключів мусить ТОЧНО збігатися з варіантами товару. Не просто
    // «без зайвих»: пропущений ключ означав би, що клієнт і сервер по-різному
    // уявляють товар, а totalQuantity мовчки прочитала б undefined.
    const expected = variantKeys(product);
    const got = Object.keys(data.sizes);
    const sameKeys =
      got.length === expected.length && expected.every((k) => k in data.sizes);
    if (!sameKeys) {
      ctx.addIssue({
        code: 'custom',
        path: ['sizes'],
        message: 'Невірний набір варіантів товару',
      });
      return;
    }

    const total = totalQuantity(data.sizes);
    if (total < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['sizes'],
        message: product.showVariantPicker ? 'Оберіть розмір' : 'Товар недоступний',
      });
    } else if (total > product.maxPerOrder) {
      ctx.addIssue({
        code: 'custom',
        path: ['sizes'],
        message: `Максимум ${product.maxPerOrder} шт. у замовленні`,
      });
    }

    // …далі наявні перевірки deliveryMode без змін
```

- [ ] **Step 5: Запустити тести**

Run: `npm test -- checkout-schema && npx tsc --noEmit`
Expected: тести схеми PASS, включно з трьома полагодженими зі Step 1. `tsc` покаже помилки в `CheckoutForm.tsx` (`data.sizes[s]` тепер `number | undefined`) і в `app/api/checkout/route.ts` — це очікувано, лагодиться в Task 7 і Task 8. Якщо помилки є **тільки** в цих двох файлах — рухаємось далі.

- [ ] **Step 6: Коміт**

```bash
git add lib/checkoutSchema.ts lib/__tests__/checkout-schema.test.ts
git commit -m "feat: checkout schema validates against the product registry"
```

---

### Task 7: `/api/checkout` і `/api/stock` стають product-aware

Після цієї задачі `tsc` знову чистий на серверній стороні.

**Files:**
- Modify: `app/api/checkout/route.ts`
- Modify: `app/api/stock/route.ts`
- Modify: `lib/telegram.ts` (назва товару в нотифікації)
- Modify: `lib/__tests__/telegram.test.ts`

**Interfaces:**
- Consumes: усе з Tasks 1–6.
- Produces: `PendingOrder.productName: string` у `lib/telegram.ts`.

- [ ] **Step 1: Додати `productName` у наявну фікстуру тестів Telegram**

`productName` стає обовʼязковим полем `PendingOrder`, тому фікстура `base` у `lib/__tests__/telegram.test.ts` без нього перестане компілюватись. Дописати в неї рядок:

```ts
  productName: 'too much яром too much долиною',
```

Наявні очікування (`'СЕРЕДНІЙ ×2'`, `'5200'`, екранування HTML) лишаються зеленими.

- [ ] **Step 2: Написати падаючий тест нотифікації**

Дописати в `lib/__tests__/telegram.test.ts`:

```ts
it('назва товару в заявці береться з переданого поля, а не з константи', () => {
  const msg = formatPendingOrderMessage({
    orderReference: 'PEDAL01-1754200000000ab3z',
    productName: 'Димна Суміш',
    fullName: 'Олександр Чемеров',
    phone: '0671234567',
    email: 't@t.ua',
    sizes: { STANDARD: 1 },
    amount: 3000,
    deliveryMode: 'np',
    city: 'Київ',
    warehouse: 'Відділення №1',
    country: '',
    street: '',
    building: '',
    flat: '',
    zip: '',
  });
  expect(msg).toContain('Димна Суміш');
  expect(msg).not.toContain('too much');
  expect(msg).toContain('STANDARD ×1');
});
```

- [ ] **Step 3: Запустити, переконатись що падає**

Run: `npm test -- telegram`
Expected: FAIL — повідомлення містить захардкоджене `too much яром too much долиною`.

- [ ] **Step 4: Параметризувати нотифікацію**

У `lib/telegram.ts`, інтерфейс `PendingOrder`: додати `productName: string;`. У `formatPendingOrderMessage` замінити рядок товару:

```ts
    `<b>Товар:</b> ${esc(o.productName)} · ${sizesLine}`,
```

- [ ] **Step 5: Переписати `app/api/checkout/route.ts`**

Ключові зміни (решта файлу — резерв, Telegram, підпис — без змін):

```ts
  const input = parsed.data;

  const product = getProduct(input.productId ?? DEFAULT_PRODUCT_ID);
  if (!product) {
    return NextResponse.json({ error: 'unknown-product' }, { status: 400 });
  }

  // Схема вже валідувала межі, але серверу не можна довіряти клієнту:
  // clamp по кожному варіанту й перевірка сумарних меж ще раз.
  const counts: VariantCounts = {};
  for (const key of variantKeys(product)) {
    counts[key] = Math.max(
      0,
      Math.min(product.maxPerOrder, Math.trunc(input.sizes[key] ?? 0)),
    );
  }
  const totalCount = totalQuantity(counts);
  if (totalCount < 1 || totalCount > product.maxPerOrder) {
    return NextResponse.json({ error: 'invalid quantity' }, { status: 400 });
  }
  const positions = variantKeys(product).filter((k) => counts[k] > 0);

  const orderReference = newOrderReference(product.id);
```

Резерв і availability:

```ts
    if (!(await reserveStock(db, product.id, counts))) {
      return NextResponse.json(
        {
          error: 'out-of-stock',
          availability: await currentAvailability(db, product.id, variantKeys(product)),
        },
        { status: 409 },
      );
    }
    reserved = true;
    await createPendingOrder(db, {
      orderReference,
      productId: product.id,
      sizes: counts,
      amount: product.price * totalCount,
      customer: {
        name: input.fullName,
        phone: input.phone.replace(/[\s()-]/g, ''),
        email: input.email,
      },
    });
```

Відкат у catch: `await unreserveStock(await getDb(), product.id, counts);`

Payload WayForPay:

```ts
  const base = {
    merchantAccount,
    merchantDomainName,
    orderReference,
    orderDate,
    amount: product.price * totalCount,
    currency: product.currency,
    productName: positions.map((k) => positionName(product, k)),
    productCount: positions.map((k) => counts[k]),
    productPrice: positions.map(() => product.price),
  };
```

`returnUrl` веде на сторінку свого товару:

```ts
    returnUrl: `${SITE_URL}/api/wayforpay-return`,
```

(лишається без змін — сам роут визначить сторінку за номером замовлення в Task 9)

Telegram:

```ts
    const text = formatPendingOrderMessage({
      orderReference,
      productName: product.name,
      fullName: input.fullName,
      phone: input.phone.replace(/[\s()-]/g, ''),
      email: input.email,
      sizes: counts,
      amount: base.amount,
      // …решта полів адреси без змін
    });
```

- [ ] **Step 6: Переписати `app/api/stock/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongo';
import { stockAvailability } from '@/lib/inventory';
import { DEFAULT_PRODUCT_ID, getProduct, variantKeys } from '@/lib/products';

export const dynamic = 'force-dynamic';

/**
 * Наявність по варіантах товару: { ВАРІАНТ: true/false }. Цифри залишків
 * свідомо не віддаємо — обсяги продажів не публічні.
 * Якщо база недоступна, вважаємо все в наявності: краще прийняти замовлення
 * (checkout все одно переперевірить резервом), ніж показати «розпродано».
 */
export async function GET(req: NextRequest) {
  const product = getProduct(
    req.nextUrl.searchParams.get('product') ?? DEFAULT_PRODUCT_ID,
  );
  if (!product) {
    return NextResponse.json({ error: 'unknown-product' }, { status: 400 });
  }
  const keys = variantKeys(product);
  try {
    const availability = await stockAvailability(await getDb(), product.id, keys);
    return NextResponse.json(availability);
  } catch (err) {
    console.error('stockAvailability failed', product.id, err);
    return NextResponse.json(Object.fromEntries(keys.map((k) => [k, true])));
  }
}
```

- [ ] **Step 7: Запустити тести й typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: тести PASS. Помилки типів лишились **тільки** в `components/Checkout/CheckoutForm.tsx` — це Task 8.

- [ ] **Step 8: Коміт**

```bash
git add app/api/checkout/route.ts app/api/stock/route.ts lib/telegram.ts lib/__tests__/telegram.test.ts
git commit -m "feat: checkout and stock endpoints accept a product"
```

---

### Task 8: Розрізати форму замовлення на три компоненти

`CheckoutForm.tsx` — 483 рядки; два взаємовиключні режими в одному файлі зроблять його нечитним.

**Files:**
- Create: `components/Checkout/ProductSummary.tsx`
- Create: `components/Checkout/VariantPicker.tsx`
- Modify: `components/Checkout/CheckoutForm.tsx`
- Modify: `components/Checkout/CheckoutProvider.tsx`
- Modify: `components/Checkout/CheckoutModal.tsx`
- Modify: `components/Checkout/CheckoutModal.module.css`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `Product`, `emptySizes`, `totalQuantity`, `variantKeys`.
- Produces:
  - `<ProductSummary product sizes />`
  - `<VariantPicker product sizes available error onChange />`, де `onChange(key: string, delta: 1 | -1): void`
  - `<CheckoutForm product />`
  - `<CheckoutProvider product>{children}</CheckoutProvider>`
  - `useCheckout()` додатково віддає `product: Product`

- [ ] **Step 1: Створити `ProductSummary.tsx`**

```tsx
'use client';

import Image from 'next/image';
import type { Product } from '@/lib/products';
import { variantKeys } from '@/lib/products';
import styles from './CheckoutModal.module.css';

/**
 * Шапка замовлення: фото, назва, обрані варіанти. Для товарів з описом і
 * специфікаціями (педаль) — ще й вони: сторінка товару мовчазна, тому це
 * єдине місце, де покупець бачить характеристики.
 */
export function ProductSummary({
  product,
  sizes,
}: {
  product: Product;
  sizes: Record<string, number>;
}) {
  const chosen = variantKeys(product).filter((k) => (sizes[k] ?? 0) > 0);

  return (
    <>
      <div className={styles.order}>
        <div className={styles.thumbBtn}>
          {product.thumb ? (
            <Image
              src={product.thumb}
              alt=""
              fill
              sizes="(min-width: 768px) 220px, 33vw"
              className={styles.thumb}
            />
          ) : (
            <span className={`${styles.thumbPlaceholder} mono`}>【ФОТО】</span>
          )}
        </div>

        <div className={styles.orderInfo}>
          <div className={styles.orderName}>
            <span>{product.name.toUpperCase()}</span>
          </div>
          <div className={`${styles.orderMeta} mono`}>
            {product.showVariantPicker
              ? chosen.map((k) => `${k} ×${sizes[k]}`).join(' · ')
              : `${product.price} ₴`}
          </div>
        </div>
      </div>

      {product.description && (
        <div className={styles.productCopy}>
          {product.description.map((p) => (
            <p key={p.slice(0, 32)}>{p}</p>
          ))}
        </div>
      )}

      {product.specs && (
        <dl className={`${styles.specs} mono`}>
          {product.specs.map((s) => (
            <div key={s.label} className={styles.specRow}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Решта ракурсів. Перше фото галереї — те саме, що мініатюра вище,
          тому воно пропускається: показувати його двічі немає сенсу. */}
      {product.gallery && product.gallery.length > 1 && (
        <div className={styles.gallery}>
          {product.gallery.slice(1).map((src) => (
            <Image
              key={src}
              src={src}
              alt={product.name}
              width={800}
              height={1000}
              sizes="(min-width: 768px) 520px, 90vw"
              className={styles.galleryImage}
            />
          ))}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Додати стилі в `CheckoutModal.module.css`**

Дописати в кінець файлу (сітка й кольори беруться з наявних змінних, нової візуальної мови не вигадуємо):

```css
/* Плейсхолдер фото — доки команда не дала файли. */
.thumbPlaceholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--ink);
  opacity: 0.5;
  border: 1.5px dashed #c1baac;
}

/* Опис товару — тільки для товарів, що його мають. */
.productCopy {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 14px;
  line-height: 1.55;
}

.specs {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  margin: 0;
}

.specRow {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #c1baac;
  padding-bottom: 4px;
}

.specRow dt {
  opacity: 0.65;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.specRow dd {
  margin: 0;
  text-align: right;
}

/* Додаткові ракурси товару. Модалка вузька — фото йдуть стовпчиком
   на всю ширину, а не сіткою мініатюр. */
.gallery {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.galleryImage {
  width: 100%;
  height: auto;
  display: block;
}
```

- [ ] **Step 3: Створити `VariantPicker.tsx`**

Перенести блок `<fieldset>` з розмірами з `CheckoutForm.tsx:254-314` майже дослівно, замінивши `SIZES` на `variantKeys(product)` і `SIZE_MEASUREMENTS[s]` на поля варіанта:

```tsx
'use client';

import type { Product } from '@/lib/products';
import { totalQuantity } from '@/lib/checkoutSchema';
import styles from './CheckoutModal.module.css';

/**
 * Вибір варіанта й кількості. Рендериться лише для товарів із
 * showVariantPicker: у одноваріантного товару вибирати нічого.
 */
export function VariantPicker({
  product,
  sizes,
  available,
  stockMsg,
  error,
  onChange,
}: {
  product: Product;
  sizes: Record<string, number>;
  /** null — наявність ще не завантажена, усе вважається доступним. */
  available: Record<string, boolean> | null;
  stockMsg: string | null;
  error?: string;
  onChange: (key: string, delta: 1 | -1) => void;
}) {
  const total = totalQuantity(sizes);
  const canAdd = total < product.maxPerOrder;
  const chosen = product.variants.filter((v) => (sizes[v.key] ?? 0) > 0);

  return (
    <fieldset className={styles.block}>
      <span className={`${styles.fieldLabel} ${styles.segLabel} mono`}>РОЗМІР</span>
      <div className={styles.segRow} role="group" aria-label="Розмір">
        {product.variants.map((v) => {
          const soldOut = available?.[v.key] === false;
          const count = sizes[v.key] ?? 0;
          return (
            <button
              key={v.key}
              type="button"
              className={styles.segBtn}
              data-active={count > 0 ? 'true' : undefined}
              aria-pressed={count > 0}
              disabled={soldOut}
              onClick={() => onChange(v.key, 1)}
            >
              {v.label}
              {soldOut ? (
                <span className={styles.soldOut}>РОЗПРОДАНО</span>
              ) : (
                count > 0 ? ` ×${count}` : ''
              )}
            </button>
          );
        })}
      </div>
      {stockMsg && <span className={`${styles.fieldError} mono`}>{stockMsg}</span>}
      {chosen.map((v) => (
        <div key={v.key}>
          <div className={styles.sizeQtyRow}>
            <span className={`${styles.sizeQtyLabel} mono`}>{v.label}</span>
            <button
              type="button"
              className={`${styles.qtyBtn} ${styles.qtyBtnSmall}`}
              onClick={() => onChange(v.key, -1)}
              aria-label={`Менше: ${v.label}`}
            >
              −
            </button>
            <span className={`${styles.sizeQtyCount} mono`}>{sizes[v.key]}</span>
            <button
              type="button"
              className={`${styles.qtyBtn} ${styles.qtyBtnSmall}`}
              aria-disabled={!canAdd}
              onClick={() => onChange(v.key, 1)}
              aria-label={`Більше: ${v.label}`}
            >
              +
            </button>
          </div>
          {v.widthCm && v.lengthCm && (
            <span className={`${styles.fieldHint} mono`}>
              ШИРИНА {v.widthCm} СМ · ДОВЖИНА {v.lengthCm} СМ
            </span>
          )}
        </div>
      ))}
      {error && <span className={`${styles.fieldError} mono`}>{error}</span>}
    </fieldset>
  );
}
```

- [ ] **Step 4: Перевести `CheckoutForm.tsx` на пропс `product`**

Точкові зміни:

```tsx
// Імпорти: прибрати Image, PRODUCT, SIZES, SIZE_MEASUREMENTS, Size, createPortal.
import type { Product } from '@/lib/products';
import { variantKeys } from '@/lib/products';
import { totalQuantity, emptySizes } from '@/lib/checkoutSchema';
import { ProductSummary } from './ProductSummary';
import { VariantPicker } from './VariantPicker';

// Чернетка розводиться по товарах: інакше форма педалі підхопить розміри
// футболки. Версія v2 — структура форми змінилась, старі чернетки несумісні.
const draftKey = (productId: string) => `isus-checkout-draft-v2:${productId}`;

const emptyForm = (product: Product): CheckoutFormState => ({
  productId: product.id,
  sizes: emptySizes(product),
  fullName: '',
  phone: '',
  email: '',
  deliveryMode: 'np',
  city: '',
  cityRef: '',
  deliveryType: 'warehouse',
  warehouse: '',
  country: 'Україна',
  street: '',
  building: '',
  flat: '',
  zip: '',
});

export function CheckoutForm({ product }: { product: Product }) {
  const [data, setData] = useState<CheckoutFormState>(() => {
    try {
      const raw =
        typeof window !== 'undefined' ? localStorage.getItem(draftKey(product.id)) : null;
      if (raw) {
        return {
          ...emptyForm(product),
          ...(JSON.parse(raw) as Partial<CheckoutFormState>),
          // productId і кількості одноваріантного товару чернетка не задає.
          productId: product.id,
        };
      }
    } catch {
      /* пошкоджена чернетка — стартуємо з чистої форми */
    }
    return emptyForm(product);
  });
```

`applyAvailability`, `changeSize`, `total`, збереження чернетки й `/api/stock` — замінити константи на дані товару:

```tsx
  const applyAvailability = (avail: Record<string, boolean>) => {
    setAvailable(avail);
    setData((d) => {
      const sizes = { ...d.sizes };
      let changed = false;
      for (const k of variantKeys(product)) {
        if (!avail[k] && (sizes[k] ?? 0) > 0) {
          sizes[k] = 0;
          changed = true;
        }
      }
      return changed ? { ...d, sizes } : d;
    });
  };

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stock?product=${product.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((avail: Record<string, boolean> | null) => {
        if (avail && !cancelled) applyAvailability(avail);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  useEffect(() => {
    try {
      localStorage.setItem(draftKey(product.id), JSON.stringify(data));
    } catch {
      /* сховище недоступне (приватний режим) — не критично */
    }
  }, [data, product.id]);

  // Уся арифметика — всередині updater: швидкі повторні тапи не гублять
  // інкременти і не пробивають сумарний ліміт (stale-closure safe).
  const changeSize = (key: string, delta: 1 | -1) => {
    let changed = false;
    setData((d) => {
      if (delta > 0 && totalQuantity(d.sizes) >= product.maxPerOrder) return d;
      const current = d.sizes[key] ?? 0;
      const next = Math.max(0, Math.min(product.maxPerOrder, current + delta));
      if (next === current) return d;
      changed = true;
      return { ...d, sizes: { ...d.sizes, [key]: next } };
    });
    if (delta > 0 && changed) {
      markTouched('sizes');
      pulsePrice();
    }
  };

  const totalCount = totalQuantity(data.sizes);
  const total = product.price * totalCount;
```

`clearDraft` → `localStorage.removeItem(draftKey(product.id))`.

Редіректи після оплати ведуть на сторінку товару:

```tsx
      const ref = `&ref=${params.orderReference}`;
      new window.Wayforpay().run(
        params,
        () => {
          clearDraft();
          window.location.assign(`${product.path}?paid=1${ref}`);
        },
        () => {
          window.location.assign(`${product.path}?paid=0${ref}`);
        },
        () => {},
      );
```

JSX: замінити блок `<div className={styles.order}>…</div>` на `<ProductSummary product={product} sizes={data.sizes} />`; замінити `<fieldset>` розмірів на:

```tsx
      {product.showVariantPicker && (
        <VariantPicker
          product={product}
          sizes={data.sizes}
          available={available}
          stockMsg={stockMsg}
          error={visibleError('sizes')}
          onChange={changeSize}
        />
      )}
      {!product.showVariantPicker && stockMsg && (
        <span className={`${styles.fieldError} mono`}>{stockMsg}</span>
      )}
```

Видалити цілком: блок `zoomed`/`setZoomed`/`ZoomTarget` і портал `zoomBackdrop` наприкінці форми — він посилається на `/front.webp` і `/back.webp`, яких немає в реєстрі товарів, і зараз недосяжний (немає обробника, що виставляє `zoomed`).

Кнопка оплати для одноваріантного товару не показує множник:

```tsx
            <span ref={priceRef} className={styles.payAmount}>
              {total} ₴{product.showVariantPicker ? ` (×${totalCount})` : ''}
            </span>
```

- [ ] **Step 5: Протягнути `product` через провайдер і модалку**

`CheckoutProvider.tsx`:

```tsx
interface CheckoutContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  product: Product;
}

export function CheckoutProvider({
  product,
  children,
}: {
  product: Product;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <CheckoutContext.Provider
      value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false), product }}
    >
      {children}
      <CheckoutModal />
    </CheckoutContext.Provider>
  );
}
```

`CheckoutModal.tsx`: `const { isOpen, close, product } = useCheckout();` і `<CheckoutForm product={product} />`.

`app/page.tsx`: `<CheckoutProvider product={PRODUCTS.DROP01}>` (імпорт `PRODUCTS` з `@/lib/products`).

- [ ] **Step 6: Перевірити збірку**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: усе PASS, нуль помилок типів.

- [ ] **Step 7: Коміт**

```bash
git add components/Checkout/ app/page.tsx
git commit -m "refactor: split checkout form into ProductSummary, VariantPicker, CheckoutForm"
```

---

### Task 9: Сторінка `/pedal`, маршрутизація після оплати, JSON-LD

**Files:**
- Create: `app/pedal/page.tsx`
- Create: `components/ProductHero/ProductHero.tsx`
- Create: `components/ProductHero/ProductHero.module.css`
- Create: `components/Header/PedalHeader.tsx`
- Create: `components/Header/PedalHeader.module.css`
- Create: `components/Footer/PedalFooter.tsx`
- Create: `components/Footer/PedalFooter.module.css`
- Modify: `components/Footer/Footer.tsx` (посилання на `/pedal`)
- Modify: `components/Footer/Footer.module.css` (клас `.promo`)
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx` (прибрати `productLd`)
- Modify: `lib/structuredData.ts`
- Modify: `lib/__tests__/structuredData.test.ts`
- Modify: `components/Header/Header.tsx`
- Modify: `components/BuyOverlay/BuyOverlay.tsx`
- Modify: `components/BuyOverlay/BuyOverlay.module.css`
- Modify: `components/ThankYou/ThankYou.tsx`
- Modify: `app/api/wayforpay-return/route.ts`
- Modify: `app/page.module.css` (правила `.fill` переїжджають у `ProductHero.module.css`)
- Modify: `app/sitemap.ts`

**Interfaces:**
- Consumes: усе попереднє.
- Produces: `productLd(product: Product)`, `<ProductHero product />`, `<Header caption />`, `<BuyOverlay />` з внутрішнім станом розпроданості, `<ThankYou state orderRef homePath />`.

- [ ] **Step 1: Перевести наявні тести JSON-LD на виклик функції**

`productLd` перестає бути константою, тому всі пʼять тестів у `lib/__tests__/structuredData.test.ts`, що звертаються до неї як до обʼєкта, зламаються. Замінити дослівно:

| Було | Стало |
|---|---|
| `for (const url of productLd.image)` | `for (const url of productLd(PRODUCTS.DROP01).image ?? [])` |
| `productLd.offers.shippingDetails` | `productLd(PRODUCTS.DROP01).offers.shippingDetails` |
| `productLd.offers.priceValidUntil` | `productLd(PRODUCTS.DROP01).offers.priceValidUntil` |
| `productLd.size` | `productLd(PRODUCTS.DROP01).size` |
| `productLd.offers.hasMerchantReturnPolicy.returnFees` | `productLd(PRODUCTS.DROP01).offers.hasMerchantReturnPolicy.returnFees` |

Тест `'Organization має sameAs з усіх соцпрофілів'` не чіпати. Додати імпорт `import { PRODUCTS } from '../products';`.

- [ ] **Step 2: Написати падаючий тест JSON-LD**

Дописати в `lib/__tests__/structuredData.test.ts`:

```ts
describe('productLd', () => {
  it('будує розмітку під конкретний товар', () => {
    const ld = productLd(PRODUCTS.PEDAL01);
    expect(ld.name).toBe('Димна Суміш');
    expect(ld.sku).toBe('PEDAL01-DYMNA-SUMISH');
    expect(ld.offers.price).toBe('3000');
    expect(ld.offers.url).toContain('/pedal');
    expect(ld['@id']).toContain('#product-PEDAL01');
  });

  it('одноваріантний товар не декларує розмірів', () => {
    expect(productLd(PRODUCTS.PEDAL01).size).toBeUndefined();
    expect(productLd(PRODUCTS.DROP01).size).toEqual([
      'МАЛЕНЬКИЙ',
      'СЕРЕДНІЙ',
      'ВЕЛИКИЙ',
    ]);
  });

  it('товар без картинки не віддає порожній масив image', () => {
    expect(productLd(PRODUCTS.PEDAL01).image).toBeUndefined();
  });
});
```

- [ ] **Step 3: Запустити, переконатись що падає**

Run: `npm test -- structuredData`
Expected: FAIL — `productLd is not a function` (зараз це константа).

- [ ] **Step 4: Переписати `lib/structuredData.ts`**

`organizationLd` лишається як є. `productLd` стає функцією.

Порожні поля задаються як `undefined`, а **не** через умовний спред: спред дав би union-тип, на якому `.image` перестає читатись без звуження, і тести не скомпілюються. `JSON.stringify` ключі зі значенням `undefined` і так викидає, тож у розмітку порожнеча не потрапить.

```ts
import { SITE_URL } from './config';
import { variantKeys, type Product } from './products';
import { SOCIAL_LINKS } from './socials';

// organizationLd — без змін

export function productLd(product: Product) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${SITE_URL}/#product-${product.id}`,
    name: product.name,
    sku: product.sku,
    brand: { '@type': 'Brand', name: 'Sasha Chemerov × Димна Суміш' },
    image: product.ogImage ? [`${SITE_URL}${product.ogImage}`] : undefined,
    description: product.schemaDescription,
    // Розміри декларуємо лише там, де вибір справді є.
    size: product.showVariantPicker ? variantKeys(product) : undefined,
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}${product.path}`,
      priceCurrency: product.currency,
      price: String(product.price),
      priceValidUntil: '2026-12-31',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${SITE_URL}/#organization` },
      // …hasMerchantReturnPolicy і shippingDetails переносяться дослівно
    },
  };
}
```

`PRODUCT_IMAGE_WEBP` / `PRODUCT_IMAGE_JPG` видалити — їх замінили поля товару. У `app/layout.tsx` замінити `images: [PRODUCT_IMAGE_JPG]` на `images: [PRODUCTS.DROP01.ogImage!]` і **видалити** блок `<script>` з `productLd` (лишається тільки `organizationLd`).

- [ ] **Step 5: Створити `ProductHero`**

`components/ProductHero/ProductHero.tsx`:

```tsx
import type { Product } from '@/lib/products';
import styles from './ProductHero.module.css';

/**
 * Головне медіа сторінки товару. Плейсхолдер — для товарів, чиї файли ще
 * не приїхали від команди: він видимий і в проді, і в код-ревʼю.
 */
export function ProductHero({ product }: { product: Product }) {
  if (product.media.kind === 'video') {
    return (
      <video
        className={styles.fill}
        src={product.media.src}
        poster={product.media.poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
    );
  }

  if (product.media.kind === 'image') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={styles.fill} src={product.media.src} alt="" />;
  }

  return (
    <div className={styles.placeholder} role="img" aria-label={product.name}>
      <span className={`${styles.placeholderText} display`}>{product.media.caption}</span>
    </div>
  );
}
```

`components/ProductHero/ProductHero.module.css`:

```css
/* Ті самі правила, що були в app/page.module.css для .fill — медіа товару
   заповнює простір між хедером і футером. */
.fill {
  flex: 1;
  min-height: 100vh;
  width: 100%;
  display: block;
  object-fit: cover;
  background: var(--bg);
}

@media (min-width: 768px) {
  .fill {
    object-position: 50% 25%;
  }
}

/* Плейсхолдер: файлів товару ще немає. */
.placeholder {
  flex: 1;
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  border: 2px dashed #c1baac;
}

.placeholderText {
  font-size: 28px;
  letter-spacing: 0.08em;
  opacity: 0.55;
}
```

- [ ] **Step 6: Створити окремі хедер і футер для сторінки педалі**

**Це свідоме дублювання на вимогу замовника, а не недогляд.** `/pedal` мусить мати власні хедер і футер, щоб їх можна було перефарбувати незалежно від головної сторінки. Зараз вони — точні копії; розійдуться візуально пізніше.

- `components/Header/PedalHeader.tsx` — копія `Header.tsx`, з двома змінами: компонент називається `PedalHeader`, імпорт стилів веде на `./PedalHeader.module.css`. Підпис так само приймається пропсом `caption: string`.
- `components/Header/PedalHeader.module.css` — **побайтова копія** `Header.module.css`.
- `components/Footer/PedalFooter.tsx` — копія `Footer.tsx`, компонент `PedalFooter`, стилі з `./PedalFooter.module.css`. Внутрішні `VisaMark` і `MastercardMark` копіюються разом із ним: вони приватні для файлу, спільного експорту з них ніхто не робив.
- `components/Footer/PedalFooter.module.css` — **побайтова копія** `Footer.module.css`.

**Плюс перехресні посилання між товарами** (вимога замовника: педаль треба знайти з головної).

У `components/Footer/Footer.tsx` — цей футер віддається на `/`, `/offer` і `/returns` — додати посилання на педаль **першим** елементом лівої навігації і розширити її `aria-label`:

```tsx
        <nav className={styles.legal} aria-label="Навігація і правова інформація">
          <Link href="/pedal" className={styles.promo}>
            Педаль «Димна Суміш» · 10 шт.
          </Link>
          <Link href="/offer">Публічна оферта</Link>
          <Link href="/returns">Умови повернення</Link>
        </nav>
```

У `components/Footer/Footer.module.css` — акцент, щоб промо-посилання не читалось як юридична дрібниця:

```css
/* Посилання на другий товар. Виділене, бо це не легал, а вітрина. */
.promo {
  color: #dcc5a3;
  letter-spacing: 0.04em;
}
```

У `PedalFooter.tsx` посилання дзеркальне — з педалі назад на футболку (ми вже на `/pedal`, посилатись на себе не треба):

```tsx
          <Link href="/" className={styles.promo}>
            Футболка «too much яром too much долиною»
          </Link>
```

`.promo` в `PedalFooter.module.css` — така сама, як у `Footer.module.css`.

У шапці кожного з чотирьох файлів — коментар, який пояснює, чому копія існує:

```tsx
/**
 * Хедер сторінки педалі. Свідома копія Header: /pedal має розходитись
 * візуально з головною, тому спільний компонент тут навмисно не
 * використовується. Правки одного НЕ переносяться в інший автоматично.
 */
```

Оригінальні `Header.tsx` / `Footer.tsx` лишаються тільки для головної сторінки — не чіпати їх, окрім зміни підпису нижче.

- [ ] **Step 7: Зробити хедер і кнопку product-aware**

`components/Header/Header.tsx` — підпис стає пропсом (те саме зробити і в `PedalHeader.tsx`):

```tsx
export function Header({ caption }: { caption: string }) {
  // …<span className={`${styles.drop} mono`}>{caption}</span>
}
```

`components/BuyOverlay/BuyOverlay.tsx` — розпроданість:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useCheckout } from '@/components/Checkout/CheckoutProvider';
import { variantKeys } from '@/lib/products';
import styles from './BuyOverlay.module.css';

export function BuyOverlay() {
  const { open, product } = useCheckout();
  // null — наявність ще не завантажена; до відповіді кнопка активна:
  // краще пустити в чекаут (він переперевірить резервом), ніж хибно
  // показати «розпродано».
  const [soldOut, setSoldOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stock?product=${product.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((avail: Record<string, boolean> | null) => {
        if (!avail || cancelled) return;
        setSoldOut(variantKeys(product).every((k) => avail[k] === false));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [product]);

  return (
    <div className={styles.overlay}>
      <button
        className={styles.buy}
        onClick={open}
        disabled={soldOut}
        data-sold-out={soldOut ? 'true' : undefined}
      >
        {soldOut ? 'Розпродано' : 'Забрати'}
      </button>
    </div>
  );
}
```

Дописати в `BuyOverlay.module.css`:

```css
.buy:disabled {
  cursor: default;
  opacity: 0.55;
}
/* Розпродано — жодних hover-обіцянок. */
.buy[data-sold-out]:hover {
  background: rgba(220, 197, 163, 0.9);
  color: var(--ink);
  transform: none;
}
```

- [ ] **Step 8: `ThankYou` повертає на сторінку свого товару**

У `components/ThankYou/ThankYou.tsx`:

```tsx
type Props = { state: 'ok' | 'fail'; orderRef?: string; homePath: string };

export function ThankYou({ state, orderRef, homePath }: Props) {
  // …
  function close() {
    setOpen(false);
    setTimeout(() => router.replace(homePath), 240);
  }
```

- [ ] **Step 9: `wayforpay-return` веде на сторінку свого товару**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { SITE_URL } from '@/lib/config';
import { ORDER_REF_RE, productIdFromRef } from '@/lib/orderReference';
import { getProduct, PRODUCTS } from '@/lib/products';

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const status = form?.get('transactionStatus');
  const rawRef = form?.get('orderReference');
  const validRef = typeof rawRef === 'string' && ORDER_REF_RE.test(rawRef) ? rawRef : null;
  // Сторінка визначається за номером замовлення: покупець педалі не має
  // опинитись на футболці.
  const product = validRef
    ? getProduct(productIdFromRef(validRef) ?? '') ?? PRODUCTS.DROP01
    : PRODUCTS.DROP01;
  const ref = validRef ? `&ref=${validRef}` : '';
  const paid = status === 'Approved' ? '1' : '0';
  return NextResponse.redirect(`${SITE_URL}${product.path}?paid=${paid}${ref}`, 303);
}

export async function GET() {
  return NextResponse.redirect(SITE_URL, 303);
}
```

- [ ] **Step 10: Створити `app/pedal/page.tsx`**

```tsx
import type { Metadata } from 'next';
import { CheckoutProvider } from '@/components/Checkout/CheckoutProvider';
// Власні хедер/футер сторінки педалі — щоб її можна було перефарбувати
// незалежно від головної. Див. Step 6.
import { PedalHeader } from '@/components/Header/PedalHeader';
import { ProductHero } from '@/components/ProductHero/ProductHero';
import { BuyOverlay } from '@/components/BuyOverlay/BuyOverlay';
import { PedalFooter } from '@/components/Footer/PedalFooter';
import { ThankYou } from '@/components/ThankYou/ThankYou';
import { PRODUCTS } from '@/lib/products';
import { productLd } from '@/lib/structuredData';
import { ORDER_REF_RE } from '@/lib/orderReference';
import styles from '../page.module.css';

const product = PRODUCTS.PEDAL01;

export const metadata: Metadata = {
  title: 'Димна Суміш - фузз-педаль Kosko FX × Саша Чемеров, лімітована серія 10 шт.',
  description:
    'Фузз-дисторшн «Димна Суміш» на основі схеми EarthQuaker Devices Hizumitas. Ручна робота, тираж 10 екземплярів. 3000 ₴, доставка по Україні та за кордон.',
  alternates: { canonical: '/pedal' },
  openGraph: {
    title: 'Димна Суміш - фузз-педаль Kosko FX × Саша Чемеров',
    description: 'Лімітована серія 10 екземплярів. Ручна робота. 3000 ₴.',
    url: 'https://isusneisus.com/pedal',
    siteName: 'isusneisus.com',
    locale: 'uk_UA',
    type: 'website',
  },
};

type SearchParams = Promise<{ paid?: string; ref?: string }>;

export default async function PedalPage({ searchParams }: { searchParams: SearchParams }) {
  const { paid, ref } = await searchParams;
  const thankState = paid === '1' ? 'ok' : paid === '0' ? 'fail' : null;
  const orderRef = ref && ORDER_REF_RE.test(ref) ? ref : undefined;

  return (
    <CheckoutProvider product={product}>
      <main className={styles.page}>
        <h1 className={styles.srOnly}>
          Димна Суміш — фузз-педаль Kosko FX × Саша Чемеров, лімітована серія 10 екземплярів
        </h1>
        <PedalHeader caption={product.headerCaption} />
        <ProductHero product={product} />
        <BuyOverlay />
        <PedalFooter />
        {thankState && (
          <ThankYou state={thankState} orderRef={orderRef} homePath={product.path} />
        )}
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd(product)) }}
      />
    </CheckoutProvider>
  );
}
```

- [ ] **Step 11: Привести `app/page.tsx` до тієї ж форми**

```tsx
import { preload } from 'react-dom';
import { CheckoutProvider } from '@/components/Checkout/CheckoutProvider';
import { Header } from '@/components/Header/Header';
import { ProductHero } from '@/components/ProductHero/ProductHero';
import { BuyOverlay } from '@/components/BuyOverlay/BuyOverlay';
import { Footer } from '@/components/Footer/Footer';
import { ThankYou } from '@/components/ThankYou/ThankYou';
import { PRODUCTS } from '@/lib/products';
import { productLd } from '@/lib/structuredData';
import { ORDER_REF_RE } from '@/lib/orderReference';
import styles from './page.module.css';

const product = PRODUCTS.DROP01;

type SearchParams = Promise<{ paid?: string; ref?: string }>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  preload('/video.jpg', { as: 'image', fetchPriority: 'high' });
  const { paid, ref } = await searchParams;
  const thankState = paid === '1' ? 'ok' : paid === '0' ? 'fail' : null;
  const orderRef = ref && ORDER_REF_RE.test(ref) ? ref : undefined;

  return (
    <CheckoutProvider product={product}>
      <main className={styles.page}>
        <h1 className={styles.srOnly}>
          too much яром too much долиною — оверсайз-футболка Sasha Chemerov × Димна Суміш, Drop 01
        </h1>
        <Header caption={product.headerCaption} />
        <ProductHero product={product} />
        <BuyOverlay />
        <Footer />
        {thankState && (
          <ThankYou state={thankState} orderRef={orderRef} homePath={product.path} />
        )}
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd(product)) }}
      />
    </CheckoutProvider>
  );
}
```

Видалити з `app/page.module.css` правила `.fill` і його медіазапит — вони переїхали в `ProductHero.module.css`.

- [ ] **Step 12: Додати `/pedal` у sitemap**

```ts
  return [
    { url: `${SITE_URL}/`, lastModified: now },
    { url: `${SITE_URL}/pedal`, lastModified: now },
    { url: `${SITE_URL}/offer`, lastModified: now },
    { url: `${SITE_URL}/returns`, lastModified: now },
  ];
```

- [ ] **Step 13: Перевірити збірку**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: усе PASS. У виводі `npm run build` має зʼявитись роут `/pedal`.

- [ ] **Step 14: Коміт**

```bash
git add app/ components/ lib/structuredData.ts lib/__tests__/structuredData.test.ts
git commit -m "feat: /pedal product page with per-product routing and JSON-LD"
```

---

### Task 10: `seed-stock.mjs` приймає товар

**Files:**
- Modify: `scripts/seed-stock.mjs`
- Modify: `README.md`

**Interfaces:**
- Consumes: нічого (скрипт самостійний, без імпортів із `lib/` — він `.mjs` і запускається поза Next).
- Produces: CLI `npm run seed:stock -- <PRODUCT_ID> <кількості…>`.

- [ ] **Step 1: Переписати аргументи скрипта**

Замінити константи й розбір аргументів у `scripts/seed-stock.mjs`:

```js
/**
 * Створює/оновлює документ складу товару (база shop, колекція inventory).
 *
 * Запуск:  npm run seed:stock -- DROP01 18 11 15
 *          npm run seed:stock -- PEDAL01 10
 *          npm run seed:stock -- PEDAL01        (показує поточний стан)
 *
 * УВАГА: перезаписує залишки вказаними цифрами. Активні резерви (pending)
 * при цьому НЕ враховуються — виставляй цифри, коли немає незавершених оплат.
 *
 * Реєстр тут дубльований свідомо: скрипт .mjs запускається поза Next і не
 * може імпортувати lib/products.ts. Додаєш товар у реєстр — додай і сюди.
 */
const VARIANTS = {
  DROP01: ['МАЛЕНЬКИЙ', 'СЕРЕДНІЙ', 'ВЕЛИКИЙ'],
  PEDAL01: ['STANDARD'],
};

const [productId, ...rawCounts] = process.argv.slice(2);

if (!productId || !VARIANTS[productId]) {
  console.error(
    `Використання: npm run seed:stock -- <${Object.keys(VARIANTS).join('|')}> <кількості…>`,
  );
  process.exit(1);
}

const keys = VARIANTS[productId];
const counts = rawCounts.map(Number);
if (counts.length && (counts.length !== keys.length || counts.some((n) => !Number.isInteger(n) || n < 0))) {
  console.error(`Для ${productId} потрібно ${keys.length} цілих чисел ≥ 0: ${keys.join(' ')}`);
  process.exit(1);
}
```

І тіло роботи з базою:

```js
  if (counts.length) {
    const stock = Object.fromEntries(keys.map((k, i) => [k, counts[i]]));
    await inventory.updateOne({ _id: productId }, { $set: { stock } }, { upsert: true });
    console.log(`Склад ${productId} оновлено:`, stock);
  } else {
    const doc = await inventory.findOne({ _id: productId });
    console.log(doc ? doc.stock : `Документа складу ${productId} ще немає — задай цифри аргументами.`);
  }
```

Видалити константи `SIZES` і `INVENTORY_ID`.

- [ ] **Step 2: Перевірити скрипт вручну на читанні**

Run: `npm run seed:stock -- DROP01`
Expected: друкує поточні залишки футболки, база не змінюється.

Run: `npm run seed:stock -- PEDAL01`
Expected: `Документа складу PEDAL01 ще немає — задай цифри аргументами.`

Run: `npm run seed:stock -- НЕМАЄ 1`
Expected: помилка використання, код виходу 1, база не змінюється.

- [ ] **Step 3: Оновити README**

У розділ «Команди» додати:

```markdown
```bash
npm run seed:stock -- DROP01 18 11 15   # залишки футболки по розмірах
npm run seed:stock -- PEDAL01 10        # залишок педалі
npm run seed:stock -- PEDAL01           # показати поточний стан
```
```

- [ ] **Step 4: Коміт**

```bash
git add scripts/seed-stock.mjs README.md
git commit -m "feat: seed-stock script takes a product id"
```

---

### Task 11: Прибрати тимчасові реекспорти й фінальна перевірка

**Files:**
- Modify: `lib/products.ts`
- Modify: усі файли, що ще імпортують `PRODUCT`, `SIZES`, `Size`, `SIZE_MEASUREMENTS`

**Interfaces:**
- Consumes: усе попереднє.
- Produces: чистий реєстр без сумісних аліасів.

- [ ] **Step 1: Знайти залишкових споживачів**

Run: `npx tsc --noEmit` після видалення блоку «Тимчасові реекспорти» з `lib/products.ts`.
Expected: перелік файлів, які ще на них тримаються.

- [ ] **Step 2: Перевести кожного знайденого**

- `SIZES` / `Size` → `variantKeys(PRODUCTS.DROP01)` або `Record<string, number>`
- `SIZE_MEASUREMENTS` → поля `widthCm`/`lengthCm` варіантів (зараз усі `undefined` — заміри від команди ще не приїхали)
- `PRODUCT` → `PRODUCTS.DROP01`
- У `lib/__tests__/inventory.test.ts` замінити імпорт `SIZES` на локальну константу `const TSHIRT_KEYS = ['МАЛЕНЬКИЙ', 'СЕРЕДНІЙ', 'ВЕЛИКИЙ'];`

- [ ] **Step 3: Повна перевірка**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: усе зелене, `/pedal` присутній у списку роутів білда.

- [ ] **Step 4: Перевірити відсутність плейсхолдерів у білді**

Run: `grep -rn "【" .next/server/app --include=*.js | head`
Expected: збіги ТІЛЬКИ там, де плейсхолдер очікуваний (медіа й фото педалі). Якщо збігів немає взагалі — плейсхолдер не рендериться, це помилка. Якщо збіги в чужих місцях — розібратись.

- [ ] **Step 5: Коміт**

```bash
git add -A
git commit -m "refactor: drop temporary product registry re-exports"
```

---

### Task 12: Медіа педалі

> **Порядок виконання:** ця задача додана після старту, коли команда прислала фото.
> Виконується **після Task 7 і до Task 8** — Task 8 рендерить галерею з цих файлів.

Оригінали вже лежать у `source-assets/pedal/` (git-ignored, ~33 МБ разом):
`pedal-front.png` (фронтально, всі три ручки й лого), `pedal-angle.png` (3/4 ракурс),
`pedal-kit.png` (педаль + коробка + стікери). У `public/` їх немає і бути не повинно —
33 МБ у git це назавжди.

**Files:**
- Modify: `scripts/optimize-images.mjs`
- Modify: `lib/products.ts` (media/thumb/ogImage/gallery для `PEDAL01`)
- Modify: `lib/__tests__/products.test.ts`
- Create (згенеровані, комітяться): `public/pedal-front.webp`, `public/pedal-angle.webp`, `public/pedal-kit.webp`, `public/pedal-front.jpg`

**Interfaces:**
- Consumes: `Product`, `ProductMedia` з Task 1.
- Produces: `Product.gallery?: string[]` — додаткові фото для модалки замовлення.

- [ ] **Step 1: Написати падаючий тест**

Дописати в `lib/__tests__/products.test.ts`:

```ts
describe('медіа педалі', () => {
  it('героєм сторінки є фронтальне фото, а не плейсхолдер', () => {
    expect(PRODUCTS.PEDAL01.media).toEqual({
      kind: 'image',
      src: '/pedal-front.webp',
    });
  });

  it('мініатюра в модалці та OG-картинка задані', () => {
    expect(PRODUCTS.PEDAL01.thumb).toBe('/pedal-front.webp');
    // JSON-LD і OpenGraph: jpg, бо частина скраперів не читає webp.
    expect(PRODUCTS.PEDAL01.ogImage).toBe('/pedal-front.jpg');
  });

  it('галерея містить три фото, перше — те саме, що мініатюра', () => {
    expect(PRODUCTS.PEDAL01.gallery).toEqual([
      '/pedal-front.webp',
      '/pedal-angle.webp',
      '/pedal-kit.webp',
    ]);
  });

  it('футболка галереї не має — у неї своє відео', () => {
    expect(PRODUCTS.DROP01.gallery).toBeUndefined();
  });
});
```

- [ ] **Step 2: Запустити, переконатись що падає**

Run: `npm test -- products`
Expected: FAIL — `media` усе ще `{ kind: 'placeholder', caption: '【ФОТО ПЕДАЛІ】' }`, поля `gallery` немає.

- [ ] **Step 3: Додати педаль в `scripts/optimize-images.mjs`**

Наявний масив `photos` **не чіпати** — він читає файли з `source-assets/regenerated/`, яких може вже не бути, і використовує `.jpeg()` попри розширення `.webp` (успадкована дивина, не наша задача).

Замість цього додати окремий блок після масиву `photos` і **до** блоку логотипа:

```js
/**
 * Педаль «Димна Суміш». Оригінали — 10-12 МБ кожен, у public/ їм не місце.
 * Ширина 1400 — та сама, що й для решти фото товару.
 */
const pedalPhotos = [
  { src: "source-assets/pedal/pedal-front.png", out: "public/pedal-front.webp" },
  { src: "source-assets/pedal/pedal-angle.png", out: "public/pedal-angle.webp" },
  { src: "source-assets/pedal/pedal-kit.png", out: "public/pedal-kit.webp" },
];

for (const { src, out } of pedalPhotos) {
  const info = await sharp(p(src))
    .resize({ width: 1400, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(p(out));
  total += info.size;
  console.log(`${out.padEnd(26)} ${info.width}w  ${(info.size / 1024).toFixed(0)} KB`);
}

// JPEG-двійник фронтального фото: OpenGraph і JSON-LD читають деякі
// скрапери, що не розуміють webp.
const pedalOg = await sharp(p("source-assets/pedal/pedal-front.png"))
  .resize({ width: 1200, withoutEnlargement: true })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(p("public/pedal-front.jpg"));
total += pedalOg.size;
console.log(`${"public/pedal-front.jpg".padEnd(26)} ${pedalOg.width}w  ${(pedalOg.size / 1024).toFixed(0)} KB`);
```

- [ ] **Step 4: Прогнати оптимізацію**

Run: `npm run optimize:images`

Якщо скрипт падає на першому масиві `photos` (файлів `source-assets/regenerated/*.jpeg` може не бути) — **не чинити його**. Тимчасово закоментувати наявний цикл `photos` і блок логотипа, прогнати лише педальну частину, потім розкоментувати назад. У комміт має піти файл із незміненою секцією `photos`.

Expected: чотири файли в `public/`, кожен **менший за 400 КБ**. Перевірити: `ls -la public/pedal-*`.

Якщо котрийсь вийшов більший за 400 КБ — знизити `quality` до 78 і прогнати ще раз. Розмір важливіший за останні відсотки якості: це сторінка, яку відкриють з телефона.

- [ ] **Step 5: Оновити реєстр**

У `lib/products.ts`, інтерфейс `Product` — нове необовʼязкове поле поруч із `thumb`:

```ts
  /** Додаткові фото товару для модалки замовлення. */
  gallery?: string[];
```

У записі `PEDAL01` замінити три рядки:

```ts
    media: { kind: 'image', src: '/pedal-front.webp' },
    thumb: '/pedal-front.webp',
    gallery: ['/pedal-front.webp', '/pedal-angle.webp', '/pedal-kit.webp'],
    ogImage: '/pedal-front.jpg',
```

Плейсхолдер `【ФОТО ПЕДАЛІ】` із запису зникає. Гілка `kind: 'placeholder'` у типі `ProductMedia` **лишається** — вона знадобиться наступному товару без фото.

- [ ] **Step 6: Запустити тести**

Run: `npm test && npx tsc --noEmit`
Expected: PASS. Чотири нові тести зелені.

- [ ] **Step 7: Коміт**

```bash
git add scripts/optimize-images.mjs lib/products.ts lib/__tests__/products.test.ts public/pedal-front.webp public/pedal-angle.webp public/pedal-kit.webp public/pedal-front.jpg
git commit -m "feat: optimised pedal photos and registry media entries"
```

Перевірити, що жоден `.png` з `source-assets/` у коміт не потрапив: `git show --stat HEAD`.

---

## Ручна перевірка перед деплоєм

Не входить у задачі — робиться людиною після мержу.

1. `npm run seed:stock -- PEDAL01 10` на проді (документ складу треба створити, інакше `/pedal` одразу «розпродано»).
2. Тестовий платіж на `/pedal`: заявка в Telegram містить назву «Димна Суміш», кількість `STANDARD ×1` і правильні імʼя/прізвище (не переставлені).
3. Після оплати редірект веде на `/pedal`, не на `/`.
4. Друга педаль в один клік недоступна: у формі немає степпера кількості.
5. `npm run seed:stock -- PEDAL01 0` → `/pedal` показує неактивну «Розпродано», модалка не відкривається. Повернути `10`.
6. Оплата футболки, як і раніше, повертає на `/`.
7. У кабінеті WayForPay `serviceUrl` = `https://isusneisus.com/api/wayforpay-callback` (без змін).
8. Медіа педалі вже на місці (Task 12) — плейсхолдера в реєстрі більше немає.
9. Уточнити ціну педалі — зараз 3000 ₴ тимчасово.

## Відомий борг (свідомо не в скоупі)

- **WFP-5:** колбек не звіряє `body.amount` із сумою замовлення в базі. Підпис HMAC-MD5 робить підробку неможливою — ризик теоретичний.
- **Автоповернення складу при `Refunded`** не робиться: менеджер вирішує вручну.
- **Заміри розмірів футболки** (`widthCm`/`lengthCm`) досі `undefined` — чекаємо дані від команди.
