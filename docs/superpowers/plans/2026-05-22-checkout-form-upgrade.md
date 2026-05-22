# Checkout Form Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Розширити чекаут-модалку степером кількості, зручним вибором міста/точки Нової Пошти (популярні міста, відділення/поштомат/кур'єр) та екраном подяки після замовлення.

**Architecture:** Наявні компоненти (`CheckoutForm`, `NovaPoshtaPicker`) розширюються на місці; додаються два дрібні компоненти (`QuantityStepper`, `OrderSuccess`). Валідація переїжджає з саморобного `lib/validate.ts` на Zod-схему `lib/checkoutSchema.ts`, спільну для клієнта і `/api/checkout`. Оплата лишається через WayForPay: на сабміті форма одразу показує екран подяки й паралельно відкриває віджет оплати.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Zod · Vitest · CSS Modules.

**Specka:** `docs/superpowers/specs/2026-05-22-checkout-form-upgrade-design.md`

---

## Примітка щодо популярних міст

Спека описувала константу популярних міст як масив `{ label, ref }` із зашитими
Ref Нової Пошти. У плані реалізовано простіше й надійніше: константа — це
масив назв (`string[]`), а клік по місту резолвить його Ref через наявний
ендпоінт `/api/novaposhta?type=cities`. Поведінка для користувача та сама
(вибір в один клік, без кешу, без нового ендпоінта), але без крихких зашитих
Ref. Решта спеки реалізується дослівно.

---

## File Structure

**Нові файли:**

| Файл | Відповідальність |
| ---- | ---------------- |
| `lib/checkoutSchema.ts` | Zod-схема замовлення + укр. повідомлення + типи `CheckoutInput`, `DeliveryType` |
| `lib/popularCities.ts` | Константа `POPULAR_CITIES` — назви популярних міст |
| `lib/__tests__/checkout-schema.test.ts` | Тести Zod-схеми |
| `components/Checkout/QuantityStepper.tsx` | Степер `+ / −` |
| `components/Checkout/OrderSuccess.tsx` | Екран «Дякую за замовлення» |

**Змінені файли:**

| Файл | Зміна |
| ---- | ----- |
| `package.json` / `package-lock.json` | Додати `zod` |
| `lib/types.ts` | Re-export `CheckoutInput`/`DeliveryType` зі схеми; `WayForPayParams` без змін |
| `lib/novaposhta.ts` | Тип `NpWarehouse` (+`type`,`number`); `mapWarehouses` визначає тип і сортує |
| `lib/__tests__/novaposhta.test.ts` | Оновлені кейси `mapWarehouses` |
| `app/api/checkout/route.ts` | Валідація через схему; `quantity` → `amount`/`productCount` |
| `components/Checkout/CheckoutModal.module.css` | Стилі степера, перемикача, помилок, екрана подяки |
| `components/Checkout/NovaPoshtaPicker.tsx` | Популярні міста, перемикач доставки, поля кур'єра, мітки типу точок |
| `components/Checkout/CheckoutForm.tsx` | Кількість, плейсхолдери, підказки, Zod-помилки, екран подяки |

**Видалені файли:**

| Файл | Причина |
| ---- | ------- |
| `lib/validate.ts` | Замінено `lib/checkoutSchema.ts` |
| `lib/__tests__/checkout-validate.test.ts` | Замінено `lib/__tests__/checkout-schema.test.ts` |

---

## Task 1: Додати залежність Zod

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Встановити zod**

Run:
```bash
npm install zod@3
```
Expected: `package.json` отримує `zod` у `dependencies`; створюється/оновлюється `package-lock.json`; без помилок.

- [ ] **Step 2: Переконатися, що збірка не зламалась**

Run:
```bash
npm run build
```
Expected: `✓ Compiled successfully`, без помилок типів.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "$(printf 'chore: add zod for checkout validation\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>')"
```

---

## Task 2: Zod-схема замовлення (TDD)

**Files:**
- Create: `lib/checkoutSchema.ts`
- Test: `lib/__tests__/checkout-schema.test.ts`

- [ ] **Step 1: Написати тест, що падає**

Create `lib/__tests__/checkout-schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { checkoutSchema } from '../checkoutSchema';

const base = {
  fullName: 'Чемеров Олександр',
  phone: '+380671234567',
  email: 'a@b.com',
  quantity: 1,
  city: 'Львів',
  cityRef: 'ref-1',
  deliveryType: 'warehouse' as const,
  warehouse: 'Відділення №1',
  street: '',
  building: '',
  flat: '',
};

const courier = {
  ...base,
  deliveryType: 'courier' as const,
  warehouse: '',
  street: 'вул. Шевченка',
  building: '12',
};

describe('checkoutSchema', () => {
  it('accepts a valid warehouse order', () => {
    expect(checkoutSchema.safeParse(base).success).toBe(true);
  });
  it('accepts a valid courier order', () => {
    expect(checkoutSchema.safeParse(courier).success).toBe(true);
  });
  it('rejects a single-word name', () => {
    expect(checkoutSchema.safeParse({ ...base, fullName: 'Іван' }).success).toBe(false);
  });
  it('rejects a bad email', () => {
    expect(checkoutSchema.safeParse({ ...base, email: 'nope' }).success).toBe(false);
  });
  it('rejects a bad phone', () => {
    expect(checkoutSchema.safeParse({ ...base, phone: '123' }).success).toBe(false);
  });
  it('rejects quantity below 1', () => {
    expect(checkoutSchema.safeParse({ ...base, quantity: 0 }).success).toBe(false);
  });
  it('rejects a warehouse order with no warehouse', () => {
    expect(checkoutSchema.safeParse({ ...base, warehouse: '' }).success).toBe(false);
  });
  it('rejects a courier order with no street', () => {
    expect(checkoutSchema.safeParse({ ...courier, street: '' }).success).toBe(false);
  });
  it('rejects a courier order with no building', () => {
    expect(checkoutSchema.safeParse({ ...courier, building: '' }).success).toBe(false);
  });
  it('reports the Ukrainian message for a missing warehouse', () => {
    const res = checkoutSchema.safeParse({ ...base, warehouse: '' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toBe('Оберіть відділення або поштомат');
    }
  });
});
```

- [ ] **Step 2: Запустити тест — має впасти**

Run:
```bash
npm test
```
Expected: FAIL — `Cannot find module '../checkoutSchema'`.

- [ ] **Step 3: Створити схему**

Create `lib/checkoutSchema.ts`:

```ts
import { z } from 'zod';

/** Схема замовлення — спільна для клієнтської форми і /api/checkout. */
export const checkoutSchema = z
  .object({
    fullName: z
      .string()
      .refine(
        (v) => v.trim().split(/\s+/).filter(Boolean).length >= 2,
        "Вкажіть прізвище та ім'я",
      ),
    phone: z
      .string()
      .refine((v) => /^\+?\d{9,15}$/.test(v.replace(/\s/g, '')), 'Невірний номер телефону'),
    email: z
      .string()
      .refine((v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Невірний e-mail'),
    quantity: z.number().int().min(1, 'Кількість має бути не менше 1'),
    city: z.string().min(1, 'Оберіть місто'),
    cityRef: z.string(),
    deliveryType: z.enum(['warehouse', 'courier']),
    warehouse: z.string(),
    street: z.string(),
    building: z.string(),
    flat: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.deliveryType === 'warehouse') {
      if (!data.warehouse.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['warehouse'],
          message: 'Оберіть відділення або поштомат',
        });
      }
    } else {
      if (!data.street.trim()) {
        ctx.addIssue({ code: 'custom', path: ['street'], message: 'Вкажіть вулицю' });
      }
      if (!data.building.trim()) {
        ctx.addIssue({ code: 'custom', path: ['building'], message: 'Вкажіть будинок' });
      }
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type DeliveryType = CheckoutInput['deliveryType'];
```

- [ ] **Step 4: Запустити тест — має пройти**

Run:
```bash
npm test
```
Expected: PASS — усі тести зелені.

- [ ] **Step 5: Commit**

```bash
git add lib/checkoutSchema.ts lib/__tests__/checkout-schema.test.ts
git commit -m "$(printf 'feat: zod checkout schema with Ukrainian messages\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>')"
```

---

## Task 3: Перевести `/api/checkout` і типи на схему

**Files:**
- Modify: `lib/types.ts`
- Modify: `app/api/checkout/route.ts`
- Delete: `lib/validate.ts`
- Delete: `lib/__tests__/checkout-validate.test.ts`

- [ ] **Step 1: Оновити `lib/types.ts`**

Замінити повний вміст `lib/types.ts` на:

```ts
export type { CheckoutInput, DeliveryType } from './checkoutSchema';

export interface WayForPayParams {
  merchantAccount: string;
  merchantDomainName: string;
  merchantSignature: string;
  orderReference: string;
  orderDate: number;
  amount: number;
  currency: string;
  productName: string[];
  productCount: number[];
  productPrice: number[];
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  clientPhone: string;
  language: string;
}
```

- [ ] **Step 2: Оновити `app/api/checkout/route.ts`**

Замінити повний вміст `app/api/checkout/route.ts` на:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { purchaseSignature } from '@/lib/wayforpay';
import { checkoutSchema } from '@/lib/checkoutSchema';
import { PRODUCT, SITE_URL, requireEnv } from '@/lib/config';
import type { WayForPayParams } from '@/lib/types';

export async function POST(req: NextRequest) {
  const parsed = checkoutSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const merchantAccount = requireEnv('WAYFORPAY_MERCHANT_ACCOUNT');
  const merchantDomainName = requireEnv('WAYFORPAY_MERCHANT_DOMAIN');
  const secret = requireEnv('WAYFORPAY_SECRET_KEY');

  const orderReference = `DROP01-${Date.now()}`;
  const orderDate = Math.floor(Date.now() / 1000);
  const [lastName, ...firstParts] = input.fullName.trim().split(/\s+/);
  const amount = PRODUCT.price * input.quantity;

  const base = {
    merchantAccount,
    merchantDomainName,
    orderReference,
    orderDate,
    amount,
    currency: PRODUCT.currency,
    productName: [PRODUCT.name],
    productCount: [input.quantity],
    productPrice: [PRODUCT.price],
  };

  const params: WayForPayParams & {
    serviceUrl: string;
    returnUrl: string;
    merchantTransactionSecureType: string;
  } = {
    ...base,
    merchantSignature: purchaseSignature(secret, base),
    clientFirstName: firstParts.join(' ') || '-',
    clientLastName: lastName,
    clientEmail: input.email,
    clientPhone: input.phone.replace(/\s/g, ''),
    language: 'UA',
    serviceUrl: `${SITE_URL}/api/wayforpay-callback`,
    returnUrl: SITE_URL,
    merchantTransactionSecureType: 'AUTO',
  };

  return NextResponse.json(params);
}
```

- [ ] **Step 3: Видалити застарілі файли**

Run:
```bash
git rm lib/validate.ts lib/__tests__/checkout-validate.test.ts
```
Expected: обидва файли видалено зі стейджа і з диска.

- [ ] **Step 4: Перевірити збірку й тести**

Run:
```bash
npm run build
npm test
```
Expected: `✓ Compiled successfully`; усі тести зелені (`checkout-validate.test.ts` більше немає, `checkout-schema.test.ts` проходить).

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts app/api/checkout/route.ts
git commit -m "$(printf 'refactor: validate checkout via zod schema, support quantity\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>')"
```

---

## Task 4: Тип і сортування точок Нової Пошти (TDD)

**Files:**
- Modify: `lib/novaposhta.ts`
- Test: `lib/__tests__/novaposhta.test.ts`

- [ ] **Step 1: Оновити тест `mapWarehouses` — має впасти**

У файлі `lib/__tests__/novaposhta.test.ts` замінити весь блок `describe('mapWarehouses', ...)` (рядки 14-19) на:

```ts
describe('mapWarehouses', () => {
  it('maps a branch with type and number', () => {
    const raw = [
      { Description: 'Відділення №5', Ref: 'wh-5', Number: '5', CategoryOfWarehouse: 'Branch' },
    ];
    expect(mapWarehouses(raw)).toEqual([
      { label: 'Відділення №5', ref: 'wh-5', type: 'branch', number: '5' },
    ]);
  });
  it('detects a postbox from CategoryOfWarehouse', () => {
    const raw = [
      { Description: 'Поштомат №3', Ref: 'pb-3', Number: '3', CategoryOfWarehouse: 'Postomat' },
    ];
    expect(mapWarehouses(raw)[0].type).toBe('postbox');
  });
  it('falls back to the description when category is absent', () => {
    const raw = [{ Description: 'Поштомат "Сільпо"', Ref: 'pb-x', Number: '9' }];
    expect(mapWarehouses(raw)[0].type).toBe('postbox');
  });
  it('sorts branches before postboxes, then by number', () => {
    const raw = [
      { Description: 'Поштомат №2', Ref: 'p2', Number: '2', CategoryOfWarehouse: 'Postomat' },
      { Description: 'Відділення №10', Ref: 'b10', Number: '10', CategoryOfWarehouse: 'Branch' },
      { Description: 'Відділення №3', Ref: 'b3', Number: '3', CategoryOfWarehouse: 'Branch' },
    ];
    expect(mapWarehouses(raw).map((w) => w.ref)).toEqual(['b3', 'b10', 'p2']);
  });
  it('returns an empty array for missing input', () => {
    expect(mapWarehouses(undefined)).toEqual([]);
  });
});
```

(Блок `describe('mapCities', ...)` лишається без змін.)

- [ ] **Step 2: Запустити тест — має впасти**

Run:
```bash
npm test
```
Expected: FAIL — `mapWarehouses` повертає `{label,ref}` без `type`/`number`.

- [ ] **Step 3: Оновити `lib/novaposhta.ts`**

У `lib/novaposhta.ts` додати після рядка `export interface NpOption { label: string; ref: string; }` новий тип:

```ts
export interface NpWarehouse {
  label: string;
  ref: string;
  type: 'branch' | 'postbox';
  number: string;
}
```

І замінити функцію `mapWarehouses` (рядки 13-19) на:

```ts
export function mapWarehouses(raw: unknown): NpWarehouse[] {
  if (!Array.isArray(raw)) return [];
  const items: NpWarehouse[] = raw.map(
    (w: {
      Description?: string;
      Ref: string;
      Number?: string;
      CategoryOfWarehouse?: string;
    }) => {
      const description = w.Description ?? '';
      const isPostbox = w.CategoryOfWarehouse
        ? w.CategoryOfWarehouse === 'Postomat'
        : /поштомат/i.test(description);
      return {
        label: description,
        ref: w.Ref,
        type: (isPostbox ? 'postbox' : 'branch') as NpWarehouse['type'],
        number: w.Number ?? '',
      };
    },
  );
  return items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'branch' ? -1 : 1;
    return (parseInt(a.number, 10) || 0) - (parseInt(b.number, 10) || 0);
  });
}
```

- [ ] **Step 4: Запустити тести — мають пройти**

Run:
```bash
npm test
```
Expected: PASS — усі тести зелені.

- [ ] **Step 5: Commit**

```bash
git add lib/novaposhta.ts lib/__tests__/novaposhta.test.ts
git commit -m "$(printf 'feat: warehouse type and sort in Nova Poshta mapping\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>')"
```

---

## Task 5: Константа популярних міст

**Files:**
- Create: `lib/popularCities.ts`

- [ ] **Step 1: Створити константу**

Create `lib/popularCities.ts`:

```ts
/**
 * Популярні міста для швидкого вибору в полі «Місто».
 * Просто константа — без кешу і без окремого API-ендпоінта.
 * Клік по місту резолвить його Ref через /api/novaposhta?type=cities.
 */
export const POPULAR_CITIES = [
  'Київ',
  'Харків',
  'Одеса',
  'Львів',
  'Дніпро',
  'Запоріжжя',
  'Вінниця',
  'Полтава',
] as const;
```

- [ ] **Step 2: Переконатися, що збірка проходить**

Run:
```bash
npm run build
```
Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
git add lib/popularCities.ts
git commit -m "$(printf 'feat: popular cities constant for city picker\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>')"
```

---

## Task 6: Стилі нових елементів модалки

**Files:**
- Modify: `components/Checkout/CheckoutModal.module.css`

- [ ] **Step 1: Додати CSS у кінець файлу**

Додати в кінець `components/Checkout/CheckoutModal.module.css` блок:

```css
/* ---------- quantity stepper ---------- */
.stepper { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
.stepBtn {
  width: 24px; height: 24px; flex: none;
  background: none; border: 1.5px solid #5a5a5a; color: #fff;
  font-size: 15px; line-height: 1; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: border-color 140ms ease, transform 140ms var(--ease-out);
}
.stepBtn:hover:not(:disabled) { border-color: #fff; }
.stepBtn:active:not(:disabled) { transform: scale(0.88); }
.stepBtn:disabled { opacity: .35; cursor: not-allowed; }
.stepValue { font-size: 13px; min-width: 18px; text-align: center; }

/* ---------- field error ---------- */
.fieldError {
  font-size: 8px; color: var(--red); margin-top: 8px; display: block;
  letter-spacing: .03em; text-transform: uppercase;
}
.input[data-invalid='true'] { border-color: var(--red); }

/* ---------- delivery mode switch ---------- */
.modes { display: flex; margin-bottom: 20px; border: 1.5px solid #5a5a5a; }
.modeBtn {
  flex: 1; background: none; border: none; color: var(--grey); cursor: pointer;
  font-family: inherit; font-size: 10px; letter-spacing: .04em; text-transform: uppercase;
  padding: 11px 6px; transition: background 140ms ease, color 140ms ease;
}
.modeBtn[data-active='true'] { background: #fff; color: var(--ink); }

/* ---------- two fields in a row ---------- */
.fieldRow { display: flex; gap: 14px; }
.fieldRow .field { flex: 1; }

/* ---------- autocomplete header + warehouse tag ---------- */
.acHead {
  padding: 9px 12px 5px; font-size: 8px; letter-spacing: .08em;
  text-transform: uppercase; color: #6a6a6a;
}
.acRow { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.acTag {
  font-size: 7.5px; letter-spacing: .06em; text-transform: uppercase;
  color: #9a9a9a; border: 1px solid #3a3a3a; padding: 2px 5px; flex: none;
}

/* ---------- order success screen ---------- */
.success {
  padding: 44px 4px 8px; text-align: center;
  animation: riseIn 460ms var(--ease-out) both;
}
.successMark { font-size: 30px; color: var(--red); margin-bottom: 18px; }
.successTitle { font-size: 26px; line-height: 1.05; }
.successText { font-size: 12px; color: var(--grey); margin-top: 14px; }
.successRef { font-size: 9px; color: #6a6a6a; margin-top: 18px; }
.successClose {
  width: 100%; background: #fff; color: var(--ink); border: none; cursor: pointer;
  font-family: var(--font-oswald); font-weight: 700; text-transform: uppercase;
  font-size: 18px; padding: 17px; margin-top: 30px;
  transition: transform 150ms var(--ease-out);
}
.successClose:active { transform: scale(0.985); }
```

- [ ] **Step 2: Переконатися, що збірка проходить**

Run:
```bash
npm run build
```
Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
git add components/Checkout/CheckoutModal.module.css
git commit -m "$(printf 'style: checkout modal — stepper, modes, errors, success\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>')"
```

---

## Task 7: Компоненти `QuantityStepper` і `OrderSuccess`

**Files:**
- Create: `components/Checkout/QuantityStepper.tsx`
- Create: `components/Checkout/OrderSuccess.tsx`

- [ ] **Step 1: Створити `QuantityStepper`**

Create `components/Checkout/QuantityStepper.tsx`:

```tsx
'use client';

import styles from './CheckoutModal.module.css';

/** Степер кількості: мінімум 1, верхньої межі немає. */
export function QuantityStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className={styles.stepper}>
      <button
        type="button"
        className={styles.stepBtn}
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Зменшити кількість"
      >
        −
      </button>
      <span className={`${styles.stepValue} mono`}>{value}</span>
      <button
        type="button"
        className={styles.stepBtn}
        onClick={() => onChange(value + 1)}
        aria-label="Збільшити кількість"
      >
        +
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Створити `OrderSuccess`**

Create `components/Checkout/OrderSuccess.tsx`:

```tsx
'use client';

import { useCheckout } from './CheckoutProvider';
import styles from './CheckoutModal.module.css';

/** Екран подяки після оформлення замовлення. */
export function OrderSuccess({ orderReference }: { orderReference: string }) {
  const { close } = useCheckout();
  return (
    <div className={styles.success}>
      <div className={styles.successMark}>✓</div>
      <div className={`${styles.successTitle} display`}>ДЯКУЮ ЗА ЗАМОВЛЕННЯ</div>
      <div className={styles.successText}>
        Очікуйте на товар — ми звʼяжемося з вами найближчим часом.
      </div>
      <div className={`${styles.successRef} mono`}>№ {orderReference}</div>
      <button type="button" className={styles.successClose} onClick={close}>
        Закрити
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Переконатися, що збірка проходить**

Run:
```bash
npm run build
```
Expected: `✓ Compiled successfully` (нові компоненти ще не використовуються — це нормально).

- [ ] **Step 4: Commit**

```bash
git add components/Checkout/QuantityStepper.tsx components/Checkout/OrderSuccess.tsx
git commit -m "$(printf 'feat: QuantityStepper and OrderSuccess components\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>')"
```

---

## Task 8: Перебудувати `NovaPoshtaPicker` і `CheckoutForm`

Ці два файли міняються разом: `CheckoutForm` передає `NovaPoshtaPicker` новий
інтерфейс пропсів (`value`/`onChange`/`errors`), тож зміни мають бути в одній задачі.

**Files:**
- Modify (повна заміна): `components/Checkout/NovaPoshtaPicker.tsx`
- Modify (повна заміна): `components/Checkout/CheckoutForm.tsx`

- [ ] **Step 1: Замінити `NovaPoshtaPicker.tsx`**

Замінити повний вміст `components/Checkout/NovaPoshtaPicker.tsx` на:

```tsx
'use client';

import { useState, useEffect } from 'react';
import styles from './CheckoutModal.module.css';
import { POPULAR_CITIES } from '@/lib/popularCities';
import type { NpOption, NpWarehouse } from '@/lib/novaposhta';
import type { CheckoutInput } from '@/lib/types';

type DeliveryValue = Pick<
  CheckoutInput,
  'city' | 'cityRef' | 'deliveryType' | 'warehouse' | 'street' | 'building' | 'flat'
>;

interface DeliveryErrors {
  city?: string;
  warehouse?: string;
  street?: string;
  building?: string;
}

export function NovaPoshtaPicker({
  value,
  onChange,
  errors,
}: {
  value: DeliveryValue;
  onChange: (patch: Partial<CheckoutInput>) => void;
  errors: DeliveryErrors;
}) {
  const [cityQuery, setCityQuery] = useState('');
  const [cities, setCities] = useState<NpOption[]>([]);
  const [cityOpen, setCityOpen] = useState(false);

  const [warehouses, setWarehouses] = useState<NpWarehouse[]>([]);
  const [whQuery, setWhQuery] = useState('');
  const [whOpen, setWhOpen] = useState(false);

  const citySelected = value.cityRef.length > 0;

  // Живий пошук міста, щойно введено 2+ символи.
  useEffect(() => {
    if (citySelected || cityQuery.trim().length < 2) {
      setCities([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/novaposhta?type=cities&q=${encodeURIComponent(cityQuery)}`,
        );
        const json = await res.json();
        setCities(json.items ?? []);
      } catch {
        setCities([]);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [cityQuery, citySelected]);

  // Завантажуємо точки видачі при зміні обраного міста.
  useEffect(() => {
    if (!value.cityRef) {
      setWarehouses([]);
      return;
    }
    let active = true;
    fetch(`/api/novaposhta?type=warehouses&ref=${encodeURIComponent(value.cityRef)}`)
      .then((r) => r.json())
      .then((j) => {
        if (active) setWarehouses(j.items ?? []);
      })
      .catch(() => {
        if (active) setWarehouses([]);
      });
    return () => {
      active = false;
    };
  }, [value.cityRef]);

  function selectCity(city: NpOption) {
    setCityOpen(false);
    setCities([]);
    setWhQuery('');
    onChange({ city: city.label, cityRef: city.ref, warehouse: '' });
  }

  // Клік по популярному місту — резолвимо його Ref через звичайний пошук.
  async function selectPopularCity(name: string) {
    try {
      const res = await fetch(`/api/novaposhta?type=cities&q=${encodeURIComponent(name)}`);
      const json = await res.json();
      const first: NpOption | undefined = (json.items ?? [])[0];
      if (first) selectCity(first);
    } catch {
      /* мовчки ігноруємо — користувач може ввести місто вручну */
    }
  }

  function editCity(text: string) {
    setCityQuery(text);
    onChange({ city: '', cityRef: '', warehouse: '' });
  }

  const showPopular = cityOpen && !citySelected && cityQuery.trim().length < 2;
  const showCityResults = cityOpen && !citySelected && cities.length > 0;

  const filteredWh = whQuery.trim()
    ? warehouses.filter((w) => w.label.toLowerCase().includes(whQuery.trim().toLowerCase()))
    : warehouses;

  return (
    <>
      {/* ---- місто ---- */}
      <label className={styles.field}>
        <span className={`${styles.fieldLabel} mono`}>Місто</span>
        <input
          className={styles.input}
          data-invalid={errors.city ? 'true' : undefined}
          placeholder="Почніть вводити назву"
          value={citySelected ? value.city : cityQuery}
          onChange={(e) => editCity(e.target.value)}
          onFocus={() => setCityOpen(true)}
          onBlur={() => setTimeout(() => setCityOpen(false), 150)}
        />
        {showPopular && (
          <ul className={styles.ac}>
            <li className={`${styles.acHead} mono`}>Популярні міста</li>
            {POPULAR_CITIES.map((name) => (
              <li
                key={name}
                className={styles.acItem}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectPopularCity(name)}
              >
                {name}
              </li>
            ))}
          </ul>
        )}
        {showCityResults && (
          <ul className={styles.ac}>
            {cities.map((c) => (
              <li
                key={c.ref}
                className={styles.acItem}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectCity(c)}
              >
                {c.label}
              </li>
            ))}
          </ul>
        )}
        {errors.city ? (
          <span className={`${styles.fieldError} mono`}>{errors.city}</span>
        ) : (
          <span className={`${styles.fieldHint} mono`}>
            оберіть зі списку популярних або почніть вводити назву
          </span>
        )}
      </label>

      {/* ---- режим доставки + точка (після вибору міста) ---- */}
      {citySelected && (
        <>
          <div className={styles.modes}>
            <button
              type="button"
              className={styles.modeBtn}
              data-active={value.deliveryType === 'warehouse'}
              onClick={() =>
                onChange({ deliveryType: 'warehouse', street: '', building: '', flat: '' })
              }
            >
              Відділення / поштомат
            </button>
            <button
              type="button"
              className={styles.modeBtn}
              data-active={value.deliveryType === 'courier'}
              onClick={() => onChange({ deliveryType: 'courier', warehouse: '' })}
            >
              Курʼєр
            </button>
          </div>

          {value.deliveryType === 'warehouse' ? (
            <label className={styles.field}>
              <span className={`${styles.fieldLabel} mono`}>Відділення або поштомат</span>
              <input
                className={styles.input}
                data-invalid={errors.warehouse ? 'true' : undefined}
                placeholder="Номер або адреса"
                value={value.warehouse || whQuery}
                onChange={(e) => {
                  setWhQuery(e.target.value);
                  if (value.warehouse) onChange({ warehouse: '' });
                }}
                onFocus={() => setWhOpen(true)}
                onBlur={() => setTimeout(() => setWhOpen(false), 150)}
              />
              {whOpen && !value.warehouse && filteredWh.length > 0 && (
                <ul className={styles.ac}>
                  {filteredWh.slice(0, 60).map((w) => (
                    <li
                      key={w.ref}
                      className={`${styles.acItem} ${styles.acRow}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onChange({ warehouse: w.label });
                        setWhQuery('');
                        setWhOpen(false);
                      }}
                    >
                      <span>{w.label}</span>
                      <span className={`${styles.acTag} mono`}>
                        {w.type === 'postbox' ? 'Поштомат' : 'Відділення'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {errors.warehouse ? (
                <span className={`${styles.fieldError} mono`}>{errors.warehouse}</span>
              ) : (
                <span className={`${styles.fieldHint} mono`}>
                  {warehouses.length ? 'оберіть точку видачі Нової Пошти' : 'завантаження точок…'}
                </span>
              )}
            </label>
          ) : (
            <>
              <label className={styles.field}>
                <span className={`${styles.fieldLabel} mono`}>Вулиця</span>
                <input
                  className={styles.input}
                  data-invalid={errors.street ? 'true' : undefined}
                  placeholder="вул. Шевченка"
                  value={value.street}
                  onChange={(e) => onChange({ street: e.target.value })}
                />
                {errors.street ? (
                  <span className={`${styles.fieldError} mono`}>{errors.street}</span>
                ) : (
                  <span className={`${styles.fieldHint} mono`}>назва вулиці у вибраному місті</span>
                )}
              </label>
              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  <span className={`${styles.fieldLabel} mono`}>Будинок</span>
                  <input
                    className={styles.input}
                    data-invalid={errors.building ? 'true' : undefined}
                    placeholder="12А"
                    value={value.building}
                    onChange={(e) => onChange({ building: e.target.value })}
                  />
                  {errors.building && (
                    <span className={`${styles.fieldError} mono`}>{errors.building}</span>
                  )}
                </label>
                <label className={styles.field}>
                  <span className={`${styles.fieldLabel} mono`}>Квартира</span>
                  <input
                    className={styles.input}
                    placeholder="45"
                    value={value.flat}
                    onChange={(e) => onChange({ flat: e.target.value })}
                  />
                </label>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
```

- [ ] **Step 2: Замінити `CheckoutForm.tsx`**

Замінити повний вміст `components/Checkout/CheckoutForm.tsx` на:

```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PRODUCT } from '@/lib/config';
import { checkoutSchema } from '@/lib/checkoutSchema';
import type { CheckoutInput } from '@/lib/types';
import styles from './CheckoutModal.module.css';
import { NovaPoshtaPicker } from './NovaPoshtaPicker';
import { QuantityStepper } from './QuantityStepper';
import { OrderSuccess } from './OrderSuccess';

const EMPTY: CheckoutInput = {
  fullName: '',
  phone: '',
  email: '',
  quantity: 1,
  city: '',
  cityRef: '',
  deliveryType: 'warehouse',
  warehouse: '',
  street: '',
  building: '',
  flat: '',
};

type Errors = Partial<Record<keyof CheckoutInput, string>>;

/** Перша помилка по кожному полю з результату Zod-розбору. */
function collectErrors(data: CheckoutInput): Errors {
  const res = checkoutSchema.safeParse(data);
  if (res.success) return {};
  const errs: Errors = {};
  for (const issue of res.error.issues) {
    const key = issue.path[0] as keyof CheckoutInput;
    if (key && !errs[key]) errs[key] = issue.message;
  }
  return errs;
}

export function CheckoutForm() {
  const [data, setData] = useState<CheckoutInput>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [tried, setTried] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);

  const errors = tried ? collectErrors(data) : {};

  const patch = (p: Partial<CheckoutInput>) => setData((d) => ({ ...d, ...p }));
  const setField =
    (k: 'fullName' | 'phone' | 'email') => (e: React.ChangeEvent<HTMLInputElement>) =>
      patch({ [k]: e.target.value });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setTried(true);
    if (!checkoutSchema.safeParse(data).success) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('checkout failed');
      const params = await res.json();
      if (!window.Wayforpay) throw new Error('widget not loaded');
      setPlaced(String(params.orderReference));
      new window.Wayforpay().run(params);
    } catch {
      alert('Не вдалося оформити замовлення. Спробуйте ще раз.');
      setSubmitting(false);
    }
  }

  if (placed) return <OrderSuccess orderReference={placed} />;

  const total = PRODUCT.price * data.quantity;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.order}>
        <Image src="/front.webp" alt="" width={54} height={54} className={styles.thumb} />
        <div className={styles.orderInfo}>
          <div className={styles.orderName}>{PRODUCT.name}</div>
          <div className={`${styles.orderMeta} mono`}>OVERSIZE · ОДИН РОЗМІР</div>
          <QuantityStepper value={data.quantity} onChange={(q) => patch({ quantity: q })} />
        </div>
        <div className={`${styles.orderPrice} poster`}>{total}&nbsp;₴</div>
      </div>

      <fieldset className={styles.block}>
        <legend className={`${styles.legend} mono`}>01 — Хто ти</legend>
        <Field
          label="Прізвище та імʼя"
          placeholder="Чемеров Олександр"
          hint="так підпишемо посилку"
          value={data.fullName}
          onChange={setField('fullName')}
          error={errors.fullName}
        />
        <Field
          label="Телефон"
          placeholder="+380 67 123 45 67"
          hint="зателефонуємо, якщо щось не так із замовленням"
          value={data.phone}
          onChange={setField('phone')}
          type="tel"
          inputMode="tel"
          error={errors.phone}
        />
        <Field
          label="E-mail"
          placeholder="you@example.com"
          hint="сюди WayForPay надішле фіскальний чек"
          value={data.email}
          onChange={setField('email')}
          type="email"
          inputMode="email"
          error={errors.email}
        />
      </fieldset>

      <fieldset className={styles.block}>
        <legend className={`${styles.legend} mono`}>02 — Куди везти</legend>
        <NovaPoshtaPicker value={data} onChange={patch} errors={errors} />
      </fieldset>

      <button type="submit" className={styles.pay} disabled={submitting}>
        {submitting ? 'ЗАЧЕКАЙТЕ…' : 'ЗАМОВИТИ'}
        <span className={`${styles.payWp} mono`}>
          ОПЛАТА КАРТКОЮ · WAYFORPAY · APPLE PAY · GOOGLE PAY
        </span>
      </button>
    </form>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  inputMode?: 'tel' | 'email' | 'text';
  placeholder?: string;
  hint?: string;
  error?: string;
}) {
  return (
    <label className={styles.field}>
      <span className={`${styles.fieldLabel} mono`}>{props.label}</span>
      <input
        className={styles.input}
        data-invalid={props.error ? 'true' : undefined}
        type={props.type ?? 'text'}
        inputMode={props.inputMode}
        placeholder={props.placeholder}
        value={props.value}
        onChange={props.onChange}
      />
      {props.error ? (
        <span className={`${styles.fieldError} mono`}>{props.error}</span>
      ) : (
        props.hint && <span className={`${styles.fieldHint} mono`}>{props.hint}</span>
      )}
    </label>
  );
}
```

- [ ] **Step 3: Перевірити збірку, тести й лінт**

Run:
```bash
npm run build
npm test
npm run lint
```
Expected: `✓ Compiled successfully`; усі тести зелені; лінт без помилок.

- [ ] **Step 4: Commit**

```bash
git add components/Checkout/NovaPoshtaPicker.tsx components/Checkout/CheckoutForm.tsx
git commit -m "$(printf 'feat: checkout form — quantity, delivery modes, success screen\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>')"
```

---

## Task 9: Фінальна перевірка

**Files:** немає змін коду (якщо щось червоне — чинити і повертатись до відповідної задачі).

- [ ] **Step 1: Збірка, тести, лінт**

Run:
```bash
npm run build
npm test
npm run lint
```
Expected: усі три — зелені. `✓ Compiled successfully`; усі тест-файли проходять; лінт без помилок.

- [ ] **Step 2: Ручна перевірка в браузері**

Run:
```bash
npm run dev
```
Відкрити сайт, натиснути CTA «ЗАМОВИТИ» — відкривається модалка. Перевірити:

1. **Степер:** `+` збільшує кількість, `−` зменшує; на 1 кнопка `−` неактивна;
   верхньої межі немає; рядок ціни = `кількість × 2200 ₴`.
2. **Плейсхолдери й підказки:** кожне поле має плейсхолдер і сірий рядок-підказку знизу.
3. **Помилки:** натиснути «ЗАМОВИТИ» з порожніми полями — під кожним проблемним полем
   зʼявляється червона помилка українською; межа інпута стає червоною; форма не відправляється.
   Виправлення поля прибирає помилку.
4. **Популярні міста:** клік у порожнє поле «Місто» показує список із 8 міст
   із заголовком «Популярні міста»; клік обирає місто; ввід 2+ символів перемикає
   на живий пошук.
5. **Точка доставки:** після вибору міста — перемикач «Відділення / поштомат» ↔ «Курʼєр».
   У режимі точок — список із пошуком, мітки «Відділення»/«Поштомат», відділення першими.
   У режимі курʼєра — поля Вулиця / Будинок / Квартира.
6. **Екран подяки:** із валідними даними натиснути «ЗАМОВИТИ» — вміст модалки
   змінюється на «ДЯКУЮ ЗА ЗАМОВЛЕННЯ · Очікуйте на товар» з номером і кнопкою
   «Закрити»; одночасно поверх відкривається віджет WayForPay.

- [ ] **Step 3: Звіт**

Якщо всі перевірки зелені — задача завершена. Якщо ні — зафіксувати, що саме
червоне, виправити у відповідному файлі, перезапустити Step 1–2.

---

## Self-Review (виконано автором плану)

**Покриття спеки:**
- Кількість +/− (спека §3) → Task 8 (`QuantityStepper` у Task 7, інтеграція + ціна в Task 8) + `quantity` у схемі Task 2, у роуті Task 3. ✅
- Плейсхолдери, підказки, Zod-помилки (§4) → схема Task 2, `Field` і `NovaPoshtaPicker` Task 8, стилі Task 6. ✅
- Популярні міста (§5) → Task 5 + інтеграція Task 8 (з поясненою відмовою від зашитих Ref). ✅
- Відділення/поштомат + сорт + курʼєр (§6) → `mapWarehouses` Task 4, UI Task 8, стилі Task 6. ✅
- Оплата WayForPay + екран подяки (§7) → `OrderSuccess` Task 7, потік сабміту Task 8. ✅
- Модель даних (§8) → схема Task 2, типи Task 3. ✅
- Видалення `lib/validate.ts` (§9) → Task 3. ✅

**Узгодженість типів:** `CheckoutInput`/`DeliveryType` визначені в `lib/checkoutSchema.ts`
(Task 2), реекспортуються з `lib/types.ts` (Task 3), використовуються в усіх компонентах.
`NpWarehouse` визначений у Task 4, використовується в `NovaPoshtaPicker` (Task 8).
`checkoutSchema` — однакова назва скрізь. Пропси `NovaPoshtaPicker` (`value`/`onChange`/`errors`)
збігаються з тим, що передає `CheckoutForm`. Розбіжностей немає.

**Плейсхолдери в плані:** немає «TBD»/«TODO»; кожен крок містить повний код або точну команду.
