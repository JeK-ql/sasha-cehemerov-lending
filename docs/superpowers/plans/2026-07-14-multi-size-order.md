# Multi-Size Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Покупець набирає кількість по кожному з трьох розмірів (МАЛЕНЬКИЙ/СЕРЕДНІЙ/ВЕЛИКИЙ) і оплачує одним платежем WayForPay; менеджер бачить розбивку по розмірах у Telegram.

**Architecture:** Пара полів `size` + `quantity` замінюється одним `sizes: Record<Size, number>` наскрізь: zod-схема (єдина валідація для форми і API) → стан форми → `/api/checkout` (позиція WayForPay на кожен розмір з N>0; `purchaseSignature` уже розгортає масиви) → Telegram-заявка. UI: тап по кнопці розміру = +1, під рядом сегментів міні-степпер на кожен вибраний розмір; глобальний степпер біля кнопки оплати видаляється.

**Tech Stack:** Next.js 16.2.6 (App Router), React 19, zod 3.25, CSS Modules, vitest 4 (`npm test`), ESLint 9 (`npm run lint`).

## Global Constraints

- Спек: `docs/superpowers/specs/2026-07-14-multi-size-order-design.md`.
- **AGENTS.md:** «This is NOT the Next.js you know» — незнайомі API Next.js звіряй з `node_modules/next/dist/docs/`. План нових Next-API не вводить.
- Розміри — рівно `SIZES` з `lib/config.ts`: `['МАЛЕНЬКИЙ', 'СЕРЕДНІЙ', 'ВЕЛИКИЙ']`. Ключі обʼєкта `sizes` — ці самі рядки.
- Ліміти: кожен розмір 0–10, сумарно 1–10. Повідомлення дослівно: «Оберіть розмір» (сумарно 0) і «Максимум 10 штук у замовленні» (сумарно >10).
- Експортована назва `CheckoutFormState` ЛИШАЄТЬСЯ (стає аліасом `CheckoutInput`) — компоненти її імпортують.
- Ціна одна для всіх розмірів: `PRODUCT.price` (2600). `amount` = `PRODUCT.price × сумарна кількість`, рахується на сервері.
- Стилістика модалки: плоскі елементи, беж `#c1baac`, `var(--ink)`, `var(--red)`; нові контроли — існуюча мова `.qtyBtn`.
- Уся видима копія — українською. Коміти — англійською з `feat:`/`fix:`/`test:` префіксом.
- Кожна задача закінчується зеленим `npm test` і комітом. `npx tsc --noEmit` буде тимчасово червоним після Task 1 (CheckoutForm.tsx і route.ts ще на старих полях) — повністю зелений після Task 3.
- `docs/` у .gitignore — файли плану/спеку комітяться `git add -f` (уже так робиться).

## File Structure

| Файл | Зміна |
|---|---|
| `lib/checkoutSchema.ts` (modify) | `sizes` замість `size`+`quantity`; хелпер `totalQuantity`; `CheckoutFormState` = аліас |
| `lib/__tests__/checkout-schema.test.ts` (modify) | Фікстури + правила sizes |
| `lib/__tests__/validateCheckout.test.ts` (modify) | Фікстури + мапінг помилки `sizes` |
| `components/Checkout/CheckoutForm.tsx` (modify) | Кнопки-лічильники, міні-степпери, мета, одна кнопка оплати |
| `components/Checkout/CheckoutModal.module.css` (modify) | `.sizeQtyRow/.sizeQtyLabel/.sizeQtyCount/.qtyBtnSmall` |
| `app/api/checkout/route.ts` (modify) | По-розмірний clamp, позиції WayForPay, telegram-виклик |
| `lib/telegram.ts` (modify) | `PendingOrder.sizes`, розбивка в повідомленні |
| `lib/__tests__/telegram.test.ts` (modify) | Тести розбивки |
| `lib/__tests__/wayforpay.test.ts` (modify) | Тест підпису з двома позиціями |

`lib/types.ts`, `lib/validateCheckout.ts`, `NovaPoshtaPicker`, `OtherDeliveryFields`, колбек — БЕЗ змін (типи протікають через реекспорти).

---

### Task 1: Схема — `sizes` замість `size`+`quantity`

**Files:**
- Modify: `lib/checkoutSchema.ts`
- Test: `lib/__tests__/checkout-schema.test.ts`, `lib/__tests__/validateCheckout.test.ts`

**Interfaces:**
- Consumes: `SIZES`, `Size` з `@/lib/config` (без змін)
- Produces:
  - `checkoutSchema` — поля `size` і `quantity` ВИДАЛЕНІ; додано `sizes: { МАЛЕНЬКИЙ: number; СЕРЕДНІЙ: number; ВЕЛИКИЙ: number }` (кожне int 0–10)
  - `totalQuantity(sizes: Record<Size, number>): number` — сума по всіх розмірах
  - `type CheckoutFormState = CheckoutInput` (аліас збережено)
  - Повідомлення: сумарно 0 → `sizes`: «Оберіть розмір»; сумарно >10 → `sizes`: «Максимум 10 штук у замовленні»
  - ОЧІКУВАНО після цієї задачі: `npm test` зелений, але `npx tsc --noEmit` червоний РІВНО у двох файлах — `components/Checkout/CheckoutForm.tsx` і `app/api/checkout/route.ts` (їх чинять Tasks 2 і 3). Червоне деінде — твоя помилка.

- [ ] **Step 1: Переписати тести схеми**

У `lib/__tests__/checkout-schema.test.ts`:

Замінити обидві фікстури (`npOrder`, `otherOrder`) — прибрати `quantity: 1` і `size: 'СЕРЕДНІЙ' as const`, додати `sizes`:

```ts
const npOrder = {
  fullName: 'Чемеров Олександр',
  phone: '+380671234567',
  email: 'a@b.com',
  sizes: { МАЛЕНЬКИЙ: 0, СЕРЕДНІЙ: 1, ВЕЛИКИЙ: 0 },
  deliveryMode: 'np' as const,
  city: 'Львів',
  cityRef: 'ref-1',
  deliveryType: 'warehouse' as const,
  warehouse: 'Відділення №1',
  country: 'Україна',
  street: '',
  building: '',
  flat: '',
  zip: '',
};
```

(`otherOrder` лишається `{ ...npOrder, deliveryMode: 'other' as const, ... }` — без власних size/quantity, як і було.)

Видалити тест `rejects quantity below 1` і повністю замінити describe-блок «розмір» на:

```ts
describe('checkoutSchema — розміри (мультирозмірне замовлення)', () => {
  it('accepts a single size with quantity', () => {
    expect(
      checkoutSchema.safeParse({
        ...npOrder,
        sizes: { МАЛЕНЬКИЙ: 0, СЕРЕДНІЙ: 3, ВЕЛИКИЙ: 0 },
      }).success,
    ).toBe(true);
  });
  it('accepts a mix of sizes in one order', () => {
    expect(
      checkoutSchema.safeParse({
        ...npOrder,
        sizes: { МАЛЕНЬКИЙ: 2, СЕРЕДНІЙ: 1, ВЕЛИКИЙ: 0 },
      }).success,
    ).toBe(true);
  });
  it('rejects an all-zero order with the size message', () => {
    const res = checkoutSchema.safeParse({
      ...npOrder,
      sizes: { МАЛЕНЬКИЙ: 0, СЕРЕДНІЙ: 0, ВЕЛИКИЙ: 0 },
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === 'sizes');
      expect(issue?.message).toBe('Оберіть розмір');
    }
  });
  it('rejects more than 10 items total', () => {
    const res = checkoutSchema.safeParse({
      ...npOrder,
      sizes: { МАЛЕНЬКИЙ: 5, СЕРЕДНІЙ: 5, ВЕЛИКИЙ: 1 },
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === 'sizes');
      expect(issue?.message).toBe('Максимум 10 штук у замовленні');
    }
  });
  it('rejects a negative count', () => {
    expect(
      checkoutSchema.safeParse({
        ...npOrder,
        sizes: { МАЛЕНЬКИЙ: -1, СЕРЕДНІЙ: 2, ВЕЛИКИЙ: 0 },
      }).success,
    ).toBe(false);
  });
  it('rejects a fractional count', () => {
    expect(
      checkoutSchema.safeParse({
        ...npOrder,
        sizes: { МАЛЕНЬКИЙ: 1.5, СЕРЕДНІЙ: 0, ВЕЛИКИЙ: 0 },
      }).success,
    ).toBe(false);
  });
  it('rejects a missing size key', () => {
    expect(
      checkoutSchema.safeParse({
        ...npOrder,
        sizes: { МАЛЕНЬКИЙ: 1, СЕРЕДНІЙ: 0 },
      }).success,
    ).toBe(false);
  });
  it('keeps schema keys in sync with SIZES', () => {
    // Якщо в SIZES додасться четвертий розмір, а обʼєкт sizes у схемі — ні,
    // totalQuantity почне читати undefined і валідація «зʼїде» мовчки.
    // checkoutSchema — ZodEffects (через superRefine), тому .shape бере
    // innerType().
    expect(Object.keys(checkoutSchema.innerType().shape.sizes.shape)).toEqual([...SIZES]);
  });
});
```

Додати імпорт у шапку файлу: `import { SIZES } from '../config';`

- [ ] **Step 2: Переписати тести validateCheckout**

У `lib/__tests__/validateCheckout.test.ts` замінити у фікстурі `valid` рядки `quantity: 1,` і `size: 'СЕРЕДНІЙ',` на:

```ts
  sizes: { МАЛЕНЬКИЙ: 0, СЕРЕДНІЙ: 1, ВЕЛИКИЙ: 0 },
```

і замінити тест `maps a missing size to the size field` на:

```ts
  it('maps an all-zero sizes object to the sizes field', () => {
    const errs = validateCheckout({
      ...valid,
      sizes: { МАЛЕНЬКИЙ: 0, СЕРЕДНІЙ: 0, ВЕЛИКИЙ: 0 },
    });
    expect(errs.sizes).toBe('Оберіть розмір');
  });
```

- [ ] **Step 3: Запустити тести — мають падати**

Run: `npm test`
Expected: FAIL — схема ще не знає поля `sizes` (`unrecognized key` / невідповідність типів у тестах).

- [ ] **Step 4: Оновити `lib/checkoutSchema.ts`**

Замінити рядки полів `quantity` і `size` (зараз:
`quantity: z.number().int().min(1, 'Кількість має бути не менше 1'),` та
`size: z.enum(SIZES, { message: 'Оберіть розмір' }),`) на:

```ts
    sizes: z.object({
      МАЛЕНЬКИЙ: sizeCount,
      СЕРЕДНІЙ: sizeCount,
      ВЕЛИКИЙ: sizeCount,
    }),
```

Перед `export const checkoutSchema` додати:

```ts
/** Кількість одного розміру: ціле, 0–10. Сумарні межі — у superRefine. */
const sizeCount = z.number().int().min(0).max(10);

/** Сумарна кількість штук у замовленні. */
export const totalQuantity = (sizes: Record<Size, number>): number =>
  SIZES.reduce((sum, s) => sum + sizes[s], 0);
```

На початку `superRefine` (перед гілками deliveryMode) додати:

```ts
    const total = totalQuantity(data.sizes);
    if (total < 1) {
      ctx.addIssue({ code: 'custom', path: ['sizes'], message: 'Оберіть розмір' });
    } else if (total > 10) {
      ctx.addIssue({
        code: 'custom',
        path: ['sizes'],
        message: 'Максимум 10 штук у замовленні',
      });
    }
```

Внизу файлу замінити блок `CheckoutFormState` (JSDoc + type) на:

```ts
/**
 * Стан клієнтської форми. З переходом на `sizes` (усі нулі — валідна форма
 * типу, помилку дає superRefine) окремий widened-тип не потрібен; назва
 * збережена, бо її імпортують CheckoutForm/OtherDeliveryFields.
 */
export type CheckoutFormState = CheckoutInput;
```

Імпорт `Size` у шапці вже є (`import { SIZES, type Size } from './config';`) — не чіпати.

- [ ] **Step 5: Прогнати тести**

Run: `npm test`
Expected: PASS (усі файли; тести компонентів не існують, vitest ганяє лише lib).

Run: `npx tsc --noEmit`
Expected: помилки РІВНО у `components/Checkout/CheckoutForm.tsx` і `app/api/checkout/route.ts` (посилаються на видалені `size`/`quantity`). Будь-де ще — розберися перед комітом.

- [ ] **Step 6: Commit**

```bash
git add lib/checkoutSchema.ts lib/__tests__/checkout-schema.test.ts lib/__tests__/validateCheckout.test.ts
git commit -m "feat: multi-size order schema - sizes record replaces size+quantity"
```

---

### Task 2: Форма — кнопки-лічильники і міні-степпери

**Files:**
- Modify: `components/Checkout/CheckoutForm.tsx`
- Modify: `components/Checkout/CheckoutModal.module.css`

**Interfaces:**
- Consumes: `totalQuantity` з `@/lib/checkoutSchema`; `SIZES`, `SIZE_MEASUREMENTS`, `Size` з `@/lib/config`; `CheckoutFormState` (тепер = `CheckoutInput`)
- Produces: CSS-класи `.sizeQtyRow`, `.sizeQtyLabel`, `.sizeQtyCount`, `.qtyBtnSmall`. Після цієї задачі tsc-червоним лишається ТІЛЬКИ `app/api/checkout/route.ts`.

- [ ] **Step 1: Імпорти і стан**

У `components/Checkout/CheckoutForm.tsx`:

Додати `Size` і `totalQuantity` до імпортів — замінити:

```tsx
import { PRODUCT, SIZES, SIZE_MEASUREMENTS } from '@/lib/config';
import type { CheckoutFormState } from '@/lib/types';
import { validateCheckout } from '@/lib/validateCheckout';
```

на:

```tsx
import { PRODUCT, SIZES, SIZE_MEASUREMENTS, type Size } from '@/lib/config';
import type { CheckoutFormState } from '@/lib/types';
import { totalQuantity } from '@/lib/checkoutSchema';
import { validateCheckout } from '@/lib/validateCheckout';
```

В `EMPTY` замінити рядки `quantity: 1,` і `size: '',` на:

```tsx
  sizes: { МАЛЕНЬКИЙ: 0, СЕРЕДНІЙ: 0, ВЕЛИКИЙ: 0 },
```

Коментар над `MAX_QUANTITY` замінити на `// Сумарний ліміт штук на замовлення — синхронно з superRefine схеми і серверним clamp.`

- [ ] **Step 2: Хелпери кількості замість handleIncrease/handleDecrease**

Замінити цілком блок від коментаря `// Increment quantity AND pulse the price number via the Web Animations API.` до кінця `handleDecrease` (включно) на:

```tsx
  // Пульс ціни через Web Animations API — явний (без анімації на маунті),
  // повторні кліки замінюють анімацію в польоті.
  const pulsePrice = () => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    priceRef.current?.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }],
      { duration: 320, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
    );
  };

  const totalCount = totalQuantity(data.sizes);
  const canAdd = totalCount < MAX_QUANTITY;

  const setSizeCount = (s: Size, next: number) => {
    setData((d) => ({
      ...d,
      sizes: { ...d.sizes, [s]: Math.max(0, Math.min(MAX_QUANTITY, next)) },
    }));
  };

  // Тап по кнопці розміру або «+» у міні-степпері: +1 в межах сумарного ліміту.
  const addSize = (s: Size) => {
    if (!canAdd) return;
    setSizeCount(s, data.sizes[s] + 1);
    markTouched('sizes');
    pulsePrice();
  };
```

Замінити рядок `const total = PRODUCT.price * data.quantity;` (з коментарем над ним) на:

```tsx
  // Display only — the authoritative amount that gets signed by the WayForPay
  // HMAC is recomputed server-side from the sizes record.
  const total = PRODUCT.price * totalCount;
```

- [ ] **Step 3: Мета-рядок**

Замінити:

```tsx
          <div className={`${styles.orderMeta} mono`}>
            OVERSIZE{data.size ? ` · ${data.size}` : ''} · ×{data.quantity}
          </div>
```

на:

```tsx
          <div className={`${styles.orderMeta} mono`}>
            OVERSIZE
            {SIZES.filter((s) => data.sizes[s] > 0)
              .map((s) => ` · ${s} ×${data.sizes[s]}`)
              .join('')}
          </div>
```

- [ ] **Step 4: Блок «РОЗМІР» — лічильники в кнопках + міні-степпери**

Замінити вміст fieldset РОЗМІРУ (від `<div className={styles.segRow} role="radiogroup" aria-label="Розмір">` до закриття умовного блока помилки/замірів включно, НЕ чіпаючи `<span …>РОЗМІР</span>`) на:

```tsx
        <div className={styles.segRow} role="group" aria-label="Розмір">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              className={styles.segBtn}
              data-active={data.sizes[s] > 0 ? 'true' : undefined}
              aria-pressed={data.sizes[s] > 0}
              onClick={() => addSize(s)}
            >
              {s}
              {data.sizes[s] > 0 ? ` ×${data.sizes[s]}` : ''}
            </button>
          ))}
        </div>
        {SIZES.filter((s) => data.sizes[s] > 0).map((s) => (
          <div key={s}>
            <div className={styles.sizeQtyRow}>
              <span className={`${styles.sizeQtyLabel} mono`}>{s}</span>
              <button
                type="button"
                className={`${styles.qtyBtn} ${styles.qtyBtnSmall}`}
                onClick={() => setSizeCount(s, data.sizes[s] - 1)}
                aria-label={`Менше: ${s}`}
              >
                −
              </button>
              <span className={`${styles.sizeQtyCount} mono`}>{data.sizes[s]}</span>
              <button
                type="button"
                className={`${styles.qtyBtn} ${styles.qtyBtnSmall}`}
                aria-disabled={!canAdd}
                onClick={() => addSize(s)}
                aria-label={`Більше: ${s}`}
              >
                +
              </button>
            </div>
            {SIZE_MEASUREMENTS[s] && (
              <span className={`${styles.fieldHint} mono`}>
                ШИРИНА {SIZE_MEASUREMENTS[s]!.widthCm} СМ · ДОВЖИНА{' '}
                {SIZE_MEASUREMENTS[s]!.lengthCm} СМ
              </span>
            )}
          </div>
        ))}
        {visibleError('sizes') && (
          <span className={`${styles.fieldError} mono`}>{visibleError('sizes')}</span>
        )}
```

(`role="group"` замість `radiogroup`: це більше не взаємовиключний вибір, а лічильники — семантика радіо тут була б неправдою.)

- [ ] **Step 5: payRow — одна кнопка оплати**

Замінити цілком блок `.payRow` (коментар над ним + `<div className={styles.payRow}>…</div>` з трьома кнопками) на:

```tsx
      <div className={styles.payRow}>
        <button
          type="submit"
          className={styles.pay}
          aria-disabled={!valid || submitting}
        >
          {submitting ? 'ЗАЧЕКАЙТЕ…' : (
            <span ref={priceRef} className={styles.payAmount}>
              {total} ₴ (×{totalCount})
            </span>
          )}
        </button>
      </div>
```

- [ ] **Step 6: CSS**

У `components/Checkout/CheckoutModal.module.css` після блока правил `.qtyBtn[aria-disabled='true']…` додати:

```css
/* ---------- per-size mini steppers (мультирозмірне замовлення) ---------- */
.sizeQtyRow { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.sizeQtyLabel { flex: 1; font-size: 11px; letter-spacing: .04em; }
.sizeQtyCount { min-width: 26px; text-align: center; font-size: 15px; }
.qtyBtnSmall { width: 40px; height: 40px; font-size: 20px; line-height: 40px; }
```

`.qtyBtn` та решту наявних правил НЕ видаляти — база стилю для `.qtyBtnSmall`.

- [ ] **Step 7: Верифікація**

Run: `npm test` → PASS.
Run: `npm run lint` → чисто.
Run: `npx tsc --noEmit` → помилки ТІЛЬКИ в `app/api/checkout/route.ts` (чинить Task 3).
Smoke: `npm run dev` у фоні → curl головної без 500 → зупинити.

- [ ] **Step 8: Commit**

```bash
git add components/Checkout/CheckoutForm.tsx components/Checkout/CheckoutModal.module.css
git commit -m "feat: per-size counters in checkout, single full-width pay button"
```

---

### Task 3: Сервер і Telegram — позиції по розмірах

**Files:**
- Modify: `app/api/checkout/route.ts`
- Modify: `lib/telegram.ts`
- Test: `lib/__tests__/telegram.test.ts`, `lib/__tests__/wayforpay.test.ts`

**Interfaces:**
- Consumes: `checkoutSchema` з `sizes` (Task 1); `SIZES`, `Size`, `PRODUCT` з `@/lib/config`; `totalQuantity` з `@/lib/checkoutSchema`
- Produces:
  - `PendingOrder`: поля `size: string; quantity: number` ЗАМІНЕНІ на `sizes: Record<string, number>`
  - `formatPendingOrderMessage` рендерить `<b>Товар:</b> too much яром too much долиною · МАЛЕНЬКИЙ ×2, СЕРЕДНІЙ ×1` (тільки N>0)
  - `/api/checkout` шле у WayForPay одну позицію на кожен розмір з N>0
  - Після цієї задачі `npx tsc --noEmit` повністю зелений

- [ ] **Step 1: Переписати тести telegram**

У `lib/__tests__/telegram.test.ts` замінити у фікстурі `base` рядки `size: 'СЕРЕДНІЙ',` і `quantity: 2,` на:

```ts
  sizes: { МАЛЕНЬКИЙ: 0, СЕРЕДНІЙ: 2, ВЕЛИКИЙ: 0 },
```

Замінити перший тест (`includes order, buyer and NP delivery fields`) — рядки перевірок розміру:

```ts
    expect(msg).toContain('СЕРЕДНІЙ ×2');
    expect(msg).not.toContain('МАЛЕНЬКИЙ');
```

(замість `expect(msg).toContain('розмір СЕРЕДНІЙ');` та `expect(msg).toContain('×2');`; решта перевірок без змін).

Додати новий тест у describe `formatPendingOrderMessage`:

```ts
  it('lists every size with a non-zero count, comma-separated', () => {
    const msg = formatPendingOrderMessage({
      ...base,
      sizes: { МАЛЕНЬКИЙ: 2, СЕРЕДНІЙ: 1, ВЕЛИКИЙ: 0 },
    });
    expect(msg).toContain('МАЛЕНЬКИЙ ×2, СЕРЕДНІЙ ×1');
    expect(msg).not.toContain('ВЕЛИКИЙ');
  });
```

- [ ] **Step 2: Додати тест мультипозиційного підпису**

У `lib/__tests__/wayforpay.test.ts`, у describe `purchaseSignature`, додати:

```ts
  it('expands multiple product positions in order: names, counts, prices', () => {
    const sig = purchaseSignature(SECRET, {
      merchantAccount: 'test_merch',
      merchantDomainName: 'isusneisus.com',
      orderReference: 'DROP01-2',
      orderDate: 1000,
      amount: 7800,
      currency: 'UAH',
      productName: ['Tee (МАЛЕНЬКИЙ)', 'Tee (СЕРЕДНІЙ)'],
      productCount: [2, 1],
      productPrice: [2600, 2600],
    });
    expect(sig).toBe(
      hmacMd5(
        SECRET,
        'test_merch;isusneisus.com;DROP01-2;1000;7800;UAH;Tee (МАЛЕНЬКИЙ);Tee (СЕРЕДНІЙ);2;1;2600;2600',
      ),
    );
  });
```

- [ ] **Step 3: Запустити тести — telegram-тести падають**

Run: `npm test`
Expected: FAIL у telegram-тестах (`sizes` не існує в `PendingOrder`); wayforpay-тест ПРОХОДИТЬ одразу (підпис уже вміє масиви — це регрес-фіксація).

- [ ] **Step 4: Оновити `lib/telegram.ts`**

В інтерфейсі `PendingOrder` замінити рядки `size: string;` і `quantity: number;` на:

```ts
  /** Кількість по кожному розміру; в повідомлення потрапляють лише N>0. */
  sizes: Record<string, number>;
```

У `formatPendingOrderMessage` замінити рядок товару:

```ts
    `<b>Товар:</b> too much яром too much долиною · розмір ${o.size} · ×${o.quantity}`,
```

на (і додати обчислення перед `return`):

```ts
  const sizesLine = Object.entries(o.sizes)
    .filter(([, n]) => n > 0)
    .map(([size, n]) => `${size} ×${n}`)
    .join(', ');
```

```ts
    `<b>Товар:</b> too much яром too much долиною · ${sizesLine}`,
```

- [ ] **Step 5: Оновити `app/api/checkout/route.ts`**

Додати до імпортів: `SIZES` і `type Size` у рядок config-імпорту, `totalQuantity` до schema-імпорту:

```ts
import { checkoutSchema, totalQuantity } from '@/lib/checkoutSchema';
import { PRODUCT, SITE_URL, SIZES, requireEnv, type Size } from '@/lib/config';
```

Замінити блок clamp (коментар + `const quantity = Math.min(10, input.quantity);`) на:

```ts
  // Схема вже валідувала межі, але серверу не можна довіряти клієнту:
  // clamp по-розмірно і перевірка сумарних меж ще раз.
  const sizes = Object.fromEntries(
    SIZES.map((s) => [s, Math.max(0, Math.min(10, input.sizes[s]))]),
  ) as Record<Size, number>;
  const totalCount = totalQuantity(sizes);
  if (totalCount < 1 || totalCount > 10) {
    return NextResponse.json({ error: 'invalid quantity' }, { status: 400 });
  }
  const positions = SIZES.filter((s) => sizes[s] > 0);
```

Замінити три product-рядки і amount у `base`:

```ts
    amount: PRODUCT.price * totalCount,
    currency: PRODUCT.currency,
    productName: positions.map((s) => `Футболка - ${PRODUCT.name} (${s})`),
    productCount: positions.map((s) => sizes[s]),
    productPrice: positions.map(() => PRODUCT.price),
```

У виклику `formatPendingOrderMessage` замінити рядки `size: input.size,` і `quantity,` на:

```ts
      sizes,
```

- [ ] **Step 6: Верифікація**

Run: `npm test` → PASS (усі, включно з новими).
Run: `npm run lint` → чисто.
Run: `npx tsc --noEmit` → повністю чисто.

- [ ] **Step 7: Commit**

```bash
git add lib/telegram.ts lib/__tests__/telegram.test.ts lib/__tests__/wayforpay.test.ts app/api/checkout/route.ts
git commit -m "feat: per-size WayForPay positions and Telegram size breakdown"
```

---

### Task 4: Фінальна верифікація

**Files:** нічого нового.

- [ ] **Step 1: Повний прогін**

Run: `npm test` → усі зелені. `npm run lint` → чисто. `npx tsc --noEmit` → чисто. `npm run build` → успішно.

- [ ] **Step 2: Ручний E2E (dev-сервер)**

`npm run dev` (якщо порт зайнято — будь-який вільний), чек-лист у модалці:

1. Тап «СЕРЕДНІЙ» → кнопка інвертується, показує «СЕРЕДНІЙ ×1», під рядом з'являється `СЕРЕДНІЙ [−] 1 [+]`, кнопка оплати `2600 ₴ (×1)`.
2. Тап «МАЛЕНЬКИЙ» двічі → друга кнопка «МАЛЕНЬКИЙ ×2», окремий степпер, оплата `7800 ₴ (×3)`, мета `OVERSIZE · МАЛЕНЬКИЙ ×2 · СЕРЕДНІЙ ×1`.
3. «−» до нуля → рядок зникає, кнопка втрачає інверсію.
4. Сумарно 10 штук → усі «+» soft-disabled (тап нічого не додає).
5. Сабміт із нулем штук → «Оберіть розмір» під сегментами.
6. Глобального степпера біля оплати немає; кнопка на всю ширину.
7. Обидва режими доставки працюють як раніше.

- [ ] **Step 3: Знахідки**

Фікси — атомарними комітами `fix: …`. Суттєве — у звіт.
