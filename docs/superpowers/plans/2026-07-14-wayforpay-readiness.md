# WayForPay Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Привести лендінг isusneisus.com у відповідність вимогам модерації WayForPay (реквізити, скасування/повернення, географія доставки, способи оплати) і додати операційні фічі: розмір S/M/L, перемикач доставки «Нова Пошта / Інше», міжнародний телефон, робочу доставку замовлення менеджеру в Telegram.

**Architecture:** Односторінковий Next.js 16 App Router лендінг. Дані продавця централізуються в `lib/seller.ts` (плейсхолдери `【…】`), розміри — в `lib/config.ts`. Схема замовлення (`lib/checkoutSchema.ts`, zod) отримує `size` і дискримінатор `deliveryMode: 'np' | 'other'`; клієнтська форма і `/api/checkout` валідують одною схемою. Повна інформація замовлення їде в Telegram із `/api/checkout` (заявка), колбек WayForPay шле коротке підтвердження оплати — це чинить наявний баг, коли адреса доставки взагалі не доходила до менеджера.

**Tech Stack:** Next.js 16.2.6 (App Router), React 19, zod 3.25, CSS Modules, vitest 4 (`npm test`), ESLint 9 (`npm run lint`).

## Global Constraints

- Спек: `docs/superpowers/specs/2026-07-14-wayforpay-readiness-design.md`.
- **AGENTS.md:** «This is NOT the Next.js you know» — перед використанням незнайомого API Next.js читай `node_modules/next/dist/docs/`. Цей план не вводить нових Next-API: тільки наявні патерни (route handlers, server/client components, CSS Modules).
- Уся видима користувачу копія — українською.
- Дані продавця, яких ще немає, — ТІЛЬКИ у форматі `【опис】` і ТІЛЬКИ в `lib/seller.ts`. Не вигадувати реальних ПІБ/ІПН/адрес.
- Заміри розмірів невідомі → `SIZE_MEASUREMENTS` = `null` для всіх розмірів; UI ховає рядок замірів, коли даних немає.
- Палітра/стилістика модалки: фон `var(--ink)`, беж `#c1baac`, акцент `var(--red)`, шрифт кнопок `var(--font-oswald)`, плоскі елементи без border-radius. Нові контроли — в цій мові.
- Ціна: `PRODUCT.price = 2600` (замість тестової 1).
- Доставка НЕ додається до суми оплати — «за рахунок отримувача, за тарифами перевізника».
- Кожна задача закінчується зеленими `npm test` і комітом. Повідомлення комітів — англійською, `feat:`/`fix:`/`test:` префікси.
- `docs/` у .gitignore — файли плану/спека комітяться через `git add -f` (уже так робиться).

## File Structure (що створюється/змінюється)

| Файл | Роль |
|---|---|
| `lib/seller.ts` (create) | Єдине джерело реквізитів продавця (плейсхолдери) |
| `lib/__tests__/seller.test.ts` (create) | Структурний тест реквізитів |
| `lib/config.ts` (modify) | Ціна 2600; `SIZES`, `Size`, `SIZE_MEASUREMENTS` |
| `lib/checkoutSchema.ts` (modify) | `size`, `deliveryMode`, міжнародний телефон, адреса «Інше»; тип `CheckoutFormState` |
| `lib/validateCheckout.ts` (modify) | Приймає `CheckoutFormState` |
| `lib/types.ts` (modify) | Реекспорт нових типів |
| `lib/telegram.ts` (modify) | `formatPendingOrderMessage` + `formatPaidMessage` замість `formatOrderMessage` |
| `lib/__tests__/checkout-schema.test.ts`, `validateCheckout.test.ts`, `telegram.test.ts` (modify) | Оновлені тести |
| `app/api/checkout/route.ts` (modify) | size у назві товару; телеграм-заявка з повною адресою |
| `app/api/wayforpay-callback/route.ts` (modify) | Коротке «оплачено» замість повного повідомлення |
| `components/Checkout/CheckoutForm.tsx` (modify) | Блок «РОЗМІР», перемикач доставки, вільний телефон, динамічна мета, рядок про доставку |
| `components/Checkout/OtherDeliveryFields.tsx` (create) | Універсальна адресна форма (Укрпошта/світ) |
| `components/Checkout/CheckoutModal.module.css` (modify) | `.segRow/.segBtn/.segLabel/.fieldRow/.deliveryNote`, stagger 3-го блока |
| `components/Footer/Footer.tsx` + `Footer.module.css` (modify) | Рядки реквізитів |
| `app/offer/page.tsx` (modify) | §5.2 Visa/Mastercard, §6 географія/строки/вартість, §13 Реквізити |
| `app/returns/page.tsx` (modify) | Розділ «Скасування замовлення» |

---

### Task 1: Виправити падаючий baseline-тест

Поточний `npm test` червоний: тест очікує «Вкажіть прізвище та ім'я», схема повертає «Вкажіть ім'я та прізвище» (лейбл форми — «ІМ'Я І ПРІЗВИЩЕ», канон — ім'я перше).

**Files:**
- Modify: `lib/__tests__/validateCheckout.test.ts:36`

**Interfaces:**
- Consumes: `validateCheckout` (без змін)
- Produces: зелений baseline для всіх наступних задач

- [ ] **Step 1: Запустити тести, побачити падіння**

Run: `npm test`
Expected: FAIL — `validateCheckout.test.ts` → `returns the name message for a single-word name`, expected `"Вкажіть прізвище та ім'я"`.

- [ ] **Step 2: Виправити очікуване повідомлення в тесті**

У `lib/__tests__/validateCheckout.test.ts` замінити рядок:

```ts
    expect(errs.fullName).toBe("Вкажіть прізвище та ім'я");
```

на:

```ts
    expect(errs.fullName).toBe("Вкажіть ім'я та прізвище");
```

- [ ] **Step 3: Переконатися, що всі тести зелені**

Run: `npm test`
Expected: `Tests  33 passed (33)`

- [ ] **Step 4: Commit**

```bash
git add lib/__tests__/validateCheckout.test.ts
git commit -m "test: align expected fullName message with schema copy"
```

---

### Task 2: Модуль реквізитів продавця + футер

**Files:**
- Create: `lib/seller.ts`
- Create: `lib/__tests__/seller.test.ts`
- Modify: `components/Footer/Footer.tsx`
- Modify: `components/Footer/Footer.module.css`

**Interfaces:**
- Produces: `SELLER: { name, taxId, legalAddress, actualAddress, phone, email }` (усі — string), `SELLER_HAS_PLACEHOLDERS: boolean` з `@/lib/seller`. Task 3 імпортує `SELLER` в оферту.

- [ ] **Step 1: Написати падаючий тест**

Створити `lib/__tests__/seller.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SELLER, SELLER_HAS_PLACEHOLDERS } from '../seller';

describe('SELLER', () => {
  it('has every requisite field non-empty', () => {
    const keys = ['name', 'taxId', 'legalAddress', 'actualAddress', 'phone', 'email'] as const;
    for (const k of keys) {
      expect(SELLER[k].trim().length, `SELLER.${k}`).toBeGreaterThan(0);
    }
  });

  it('flags placeholders until real data is filled in', () => {
    // Плейсхолдери мають формат 【…】. Поки реквізитів немає — прапорець true.
    // Коли команда дасть реальні дані, цей expect інвертувати на toBe(false)
    // у тому ж коміті, що заповнює реквізити.
    expect(SELLER_HAS_PLACEHOLDERS).toBe(true);
  });
});
```

- [ ] **Step 2: Запустити тест — переконатися, що падає**

Run: `npm test`
Expected: FAIL — `Cannot find module '../seller'` (або еквівалент resolve-помилки vitest).

- [ ] **Step 3: Створити `lib/seller.ts`**

```ts
/**
 * Реквізити продавця — єдине джерело для футера, оферти й сторінки повернень.
 * Значення у форматі 【…】 — плейсхолдери до отримання даних від команди.
 * Перед подачею на модерацію WayForPay тут не має лишитися жодної «【».
 */
export const SELLER = {
  name: '【ФОП Прізвище Імʼя По батькові — як у виписці з ЄДР】',
  taxId: '【РНОКПП, 10 цифр】',
  legalAddress: '【юридична адреса — як у реєстраційних документах】',
  actualAddress: '【фактична адреса, або «збігається з юридичною»】',
  phone: '【+380XXXXXXXXX】',
  email: '【email для клієнтів】',
} as const;

export const SELLER_HAS_PLACEHOLDERS = Object.values(SELLER).some((v) =>
  v.includes('【'),
);
```

- [ ] **Step 4: Прогнати тести**

Run: `npm test`
Expected: PASS (35 tests).

- [ ] **Step 5: Додати реквізити у футер**

Замінити вміст `components/Footer/Footer.tsx` на:

```tsx
import Link from 'next/link';
import { SELLER } from '@/lib/seller';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.linksRow}>
        <Link href="/offer">Публічна оферта</Link>
        <Link href="/returns">Умови повернення</Link>
      </div>
      <div className={styles.requisites}>
        <span>
          {SELLER.name} · РНОКПП {SELLER.taxId}
        </span>
        <span>
          Юридична адреса: {SELLER.legalAddress} · Фактична адреса: {SELLER.actualAddress}
        </span>
        <span>
          <a href={`tel:${SELLER.phone}`}>{SELLER.phone}</a>
          {' · '}
          <a href={`mailto:${SELLER.email}`}>{SELLER.email}</a>
        </span>
      </div>
    </footer>
  );
}
```

- [ ] **Step 6: Додати стилі реквізитів**

У кінець `components/Footer/Footer.module.css` додати:

```css
/* Рядки реквізитів — службовий підпис, тихіший за лінки. */
.requisites {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: center;
  color: #8a8a8a;
  font-size: 9px;
}
.requisites a {
  color: inherit;
  text-decoration: none;
  transition: color 160ms ease;
}
.requisites a:hover {
  color: var(--red);
}
@media (min-width: 768px) {
  .requisites { font-size: 10px; }
}
```

- [ ] **Step 7: Візуальна перевірка**

Run: `npm run dev` → відкрити `http://localhost:3000`, проскролити до футера.
Expected: під лінками — три центрованих сірих рядки з плейсхолдерами `【…】`; ховер по телефону/email підсвічує червоним; на мобільній ширині (DevTools ~375px) рядки не вилазять за екран (перенос допустимий).

- [ ] **Step 8: Lint і commit**

Run: `npm run lint`
Expected: без помилок.

```bash
git add lib/seller.ts lib/__tests__/seller.test.ts components/Footer/Footer.tsx components/Footer/Footer.module.css
git commit -m "feat: seller requisites module + footer requisites block"
```

---

### Task 3: Правки юридичних сторінок (оферта + повернення)

**Files:**
- Modify: `app/offer/page.tsx` (розділи 5, 6; новий розділ 13)
- Modify: `app/returns/page.tsx` (новий розділ «Скасування замовлення»)

**Interfaces:**
- Consumes: `SELLER` з `@/lib/seller` (Task 2)
- Produces: контент, що закриває вимоги WayForPay №1–3 (реквізити, скасування транзакції, географія/способи оплати)

- [ ] **Step 1: Оферта — імпорт SELLER**

У `app/offer/page.tsx` додати після наявного імпорту:

```tsx
import { SELLER } from '@/lib/seller';
```

- [ ] **Step 2: Оферта §5.2 — явні способи оплати**

Замінити абзац 5.2 (починається «5.2. Оплата здійснюється онлайн банківською карткою…») на:

```tsx
      <p>
        5.2. Оплата здійснюється онлайн банківською карткою Visa або Mastercard
        через платіжний сервіс <strong>WayForPay</strong>. Інші способи оплати
        не передбачені. Обробку платежів виконує платіжна система; Продавець не
        зберігає та не має доступу до повних реквізитів картки Покупця.
      </p>
```

- [ ] **Step 3: Оферта §6 — географія, служби, строки, вартість**

Замінити абзаци 6.1–6.3 на:

```tsx
      <p>
        6.1. Доставка по території України здійснюється службою «Нова Пошта» —
        у відділення або поштомат. Міжнародна доставка здійснюється
        АТ «Укрпошта» в усі країни, доступні за її правилами міжнародних
        відправлень; Укрпоштою також можлива доставка по Україні.
      </p>
      <p>
        6.2. Вартість доставки (за всіма напрямками) до ціни Товару не
        включається і сплачується отримувачем за тарифами перевізника.
      </p>
      <p>
        6.3. Товар передається перевізнику протягом 1–3 робочих днів після
        підтвердження та оплати замовлення. Орієнтовний строк доставки по
        Україні — 1–3 дні, міжнародної доставки — від 2 до 6 тижнів; строк
        залежить від роботи перевізника і Продавцем не контролюється.
      </p>
```

(Абзац 6.4 про перехід ризику лишається без змін.)

- [ ] **Step 4: Оферта — розділ 13 «Реквізити Продавця»**

Перед закриваючим `</LegalPage>` (після розділу 12) додати:

```tsx
      <h2>13. Реквізити Продавця</h2>
      <p>
        {SELLER.name}
        <br />
        РНОКПП: {SELLER.taxId}
        <br />
        Юридична адреса: {SELLER.legalAddress}
        <br />
        Фактична адреса: {SELLER.actualAddress}
        <br />
        Телефон: {SELLER.phone}
        <br />
        E-mail: {SELLER.email}
      </p>
```

- [ ] **Step 5: Повернення — розділ про скасування**

У `app/returns/page.tsx` після розділу 6 («Повернення коштів»), перед `</LegalPage>`, додати:

```tsx
      <h2>7. Скасування замовлення</h2>
      <p>
        7.1. Покупець має право скасувати оплачене замовлення до моменту його
        передачі перевізнику, звернувшись до Продавця за контактами, наведеними
        в розділі «Реквізити Продавця» Договору публічної оферти, і повідомивши
        номер замовлення.
      </p>
      <p>
        7.2. У разі скасування замовлення до відправлення Товару Продавець
        повертає сплачені кошти в повному обсязі протягом до 7 банківських днів
        на ту саму банківську картку, з якої здійснювалась оплата. Якщо Товар
        уже передано перевізнику, застосовується порядок повернення, описаний у
        розділах 3–6 цих Умов.
      </p>
```

- [ ] **Step 6: Перевірка**

Run: `npm run lint`
Expected: без помилок.

Run: `npm run dev` → відкрити `http://localhost:3000/offer` і `http://localhost:3000/returns`.
Expected: §5.2 згадує Visa/Mastercard; §6.1 називає обидві служби і географію; §13 показує плейсхолдери реквізитів; /returns має розділ 7 про скасування.

- [ ] **Step 7: Commit**

```bash
git add app/offer/page.tsx app/returns/page.tsx
git commit -m "feat: offer/returns legal copy for WayForPay moderation"
```

---

### Task 4: Конфіг — реальна ціна і розміри

**Files:**
- Modify: `lib/config.ts`

**Interfaces:**
- Produces: `PRODUCT.price === 2600`; `SIZES: readonly ['S','M','L']`; `type Size = 'S'|'M'|'L'`; `SIZE_MEASUREMENTS: Record<Size, { widthCm: number; lengthCm: number } | null>` — використовуються Tasks 5, 6, 8.

- [ ] **Step 1: Оновити `lib/config.ts`**

Замінити блок `PRODUCT` і додати розміри (решта файлу без змін):

```ts
export const PRODUCT = {
  name: 'too much яром too much долиною',
  price: 2600,
  currency: 'UAH',
  sku: 'DROP01-OVERSIZE',
} as const;

/** Доступні розміри оверсайз-футболки. */
export const SIZES = ['S', 'M', 'L'] as const;
export type Size = (typeof SIZES)[number];

/**
 * Заміри виробу в сантиметрах (ширина по грудях × довжина).
 * null = заміри ще не отримані від команди — UI тоді ховає рядок замірів.
 */
export const SIZE_MEASUREMENTS: Record<
  Size,
  { widthCm: number; lengthCm: number } | null
> = {
  S: null,
  M: null,
  L: null,
};
```

- [ ] **Step 2: Тести і lint**

Run: `npm test`
Expected: PASS — жоден наявний тест не залежить від ціни.

Run: `npm run lint`
Expected: без помилок.

- [ ] **Step 3: Commit**

```bash
git add lib/config.ts
git commit -m "feat: real price 2600 UAH, size list and measurements config"
```

---

### Task 5: Схема замовлення — size, deliveryMode, міжнародний телефон

Найбільша логічна задача. TDD: спочатку повністю переписати тести схеми, потім схему.

**Files:**
- Modify: `lib/checkoutSchema.ts` (повна заміна)
- Modify: `lib/validateCheckout.ts` (сигнатура)
- Modify: `lib/types.ts` (реекспорти)
- Test: `lib/__tests__/checkout-schema.test.ts` (повна заміна), `lib/__tests__/validateCheckout.test.ts` (повна заміна)

**Interfaces:**
- Consumes: `SIZES`, `Size` з `@/lib/config` (Task 4)
- Produces:
  - `checkoutSchema` — zod-схема; поля: `fullName, phone, email, quantity, size: Size, deliveryMode: 'np'|'other', city, cityRef, deliveryType: 'warehouse'|'courier', warehouse, country, street, building, flat, zip` (усі адресні — string)
  - `type CheckoutInput = z.infer<typeof checkoutSchema>`
  - `type CheckoutFormState = Omit<CheckoutInput, 'size'> & { size: Size | '' }` — стан клієнтської форми (розмір ще не обрано)
  - `type DeliveryMode = 'np' | 'other'`
  - `validateCheckout(data: CheckoutFormState): FieldErrors` — `FieldErrors = Partial<Record<keyof CheckoutInput, string>>`
  - Повідомлення помилок (дослівно, ними користуються тести і UI): «Вкажіть ім'я та прізвище», «Номер має починатися з «+» і коду країни», «Введіть 7–15 цифр після «+»», «Невірний e-mail», «Кількість має бути не менше 1», «Оберіть розмір», «Оберіть місто», «Оберіть відділення або поштомат», «Вкажіть вулицю», «Вкажіть будинок», «Вкажіть країну», «Вкажіть місто», «Вкажіть поштовий індекс»

- [ ] **Step 1: Переписати тести схеми**

Повністю замінити вміст `lib/__tests__/checkout-schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { checkoutSchema } from '../checkoutSchema';

const npOrder = {
  fullName: 'Чемеров Олександр',
  phone: '+380671234567',
  email: 'a@b.com',
  quantity: 1,
  size: 'M' as const,
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

const otherOrder = {
  ...npOrder,
  deliveryMode: 'other' as const,
  cityRef: '',
  warehouse: '',
  country: 'Польща',
  city: 'Kraków',
  street: 'ul. Floriańska',
  building: '12',
  flat: '3',
  zip: '31-019',
};

describe('checkoutSchema — базові поля', () => {
  it('accepts a valid NP order', () => {
    expect(checkoutSchema.safeParse(npOrder).success).toBe(true);
  });
  it('rejects a single-word name', () => {
    expect(checkoutSchema.safeParse({ ...npOrder, fullName: 'Іван' }).success).toBe(false);
  });
  it('rejects a bad email', () => {
    expect(checkoutSchema.safeParse({ ...npOrder, email: 'nope' }).success).toBe(false);
  });
  it('rejects quantity below 1', () => {
    expect(checkoutSchema.safeParse({ ...npOrder, quantity: 0 }).success).toBe(false);
  });
});

describe('checkoutSchema — телефон (міжнародний)', () => {
  it('accepts a Ukrainian number', () => {
    expect(checkoutSchema.safeParse({ ...npOrder, phone: '+380671234567' }).success).toBe(true);
  });
  it('accepts a foreign number', () => {
    expect(checkoutSchema.safeParse({ ...npOrder, phone: '+48123456789' }).success).toBe(true);
  });
  it('accepts spaces and dashes inside the number', () => {
    expect(checkoutSchema.safeParse({ ...npOrder, phone: '+48 123-456-789' }).success).toBe(true);
  });
  it('rejects a number without leading +', () => {
    const res = checkoutSchema.safeParse({ ...npOrder, phone: '380671234567' });
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === 'phone');
      expect(issue?.message).toBe('Номер має починатися з «+» і коду країни');
    }
  });
  it('rejects a too-short number', () => {
    const res = checkoutSchema.safeParse({ ...npOrder, phone: '+38012' });
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === 'phone');
      expect(issue?.message).toBe('Введіть 7–15 цифр після «+»');
    }
  });
  it('rejects a too-long number', () => {
    expect(checkoutSchema.safeParse({ ...npOrder, phone: '+1234567890123456' }).success).toBe(false);
  });
});

describe('checkoutSchema — розмір', () => {
  it('rejects a missing size with the Ukrainian message', () => {
    const res = checkoutSchema.safeParse({ ...npOrder, size: '' });
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === 'size');
      expect(issue?.message).toBe('Оберіть розмір');
    }
  });
  it('rejects an unknown size', () => {
    expect(checkoutSchema.safeParse({ ...npOrder, size: 'XXL' }).success).toBe(false);
  });
  it.each(['S', 'M', 'L'] as const)('accepts size %s', (size) => {
    expect(checkoutSchema.safeParse({ ...npOrder, size }).success).toBe(true);
  });
});

describe('checkoutSchema — режим «Нова Пошта»', () => {
  it('rejects a missing city', () => {
    const res = checkoutSchema.safeParse({ ...npOrder, city: '' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.find((i) => i.path[0] === 'city')?.message).toBe('Оберіть місто');
    }
  });
  it('rejects a missing warehouse with the Ukrainian message', () => {
    const res = checkoutSchema.safeParse({ ...npOrder, warehouse: '' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.find((i) => i.path[0] === 'warehouse')?.message).toBe(
        'Оберіть відділення або поштомат',
      );
    }
  });
  it('does not require country/street/zip in NP mode', () => {
    expect(
      checkoutSchema.safeParse({ ...npOrder, country: '', street: '', zip: '' }).success,
    ).toBe(true);
  });
});

describe('checkoutSchema — режим «Інше» (Укрпошта/світ)', () => {
  it('accepts a valid international order', () => {
    expect(checkoutSchema.safeParse(otherOrder).success).toBe(true);
  });
  it('does not require cityRef/warehouse in other mode', () => {
    expect(checkoutSchema.safeParse({ ...otherOrder, cityRef: '', warehouse: '' }).success).toBe(true);
  });
  it.each([
    ['country', 'Вкажіть країну'],
    ['city', 'Вкажіть місто'],
    ['street', 'Вкажіть вулицю'],
    ['building', 'Вкажіть будинок'],
    ['zip', 'Вкажіть поштовий індекс'],
  ] as const)('rejects a missing %s', (field, message) => {
    const res = checkoutSchema.safeParse({ ...otherOrder, [field]: '' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.find((i) => i.path[0] === field)?.message).toBe(message);
    }
  });
  it('accepts an empty flat (optional)', () => {
    expect(checkoutSchema.safeParse({ ...otherOrder, flat: '' }).success).toBe(true);
  });
});
```

- [ ] **Step 2: Переписати тести validateCheckout**

Повністю замінити вміст `lib/__tests__/validateCheckout.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateCheckout } from '../validateCheckout';
import type { CheckoutFormState } from '../checkoutSchema';

const valid: CheckoutFormState = {
  fullName: 'Іван Іванов',
  phone: '+380671234567',
  email: 'a@b.com',
  quantity: 1,
  size: 'M',
  deliveryMode: 'np',
  city: 'Львів',
  cityRef: 'ref-1',
  deliveryType: 'warehouse',
  warehouse: 'Відділення №1',
  country: 'Україна',
  street: '',
  building: '',
  flat: '',
  zip: '',
};

describe('validateCheckout', () => {
  it('returns an empty object for valid data', () => {
    expect(validateCheckout(valid)).toEqual({});
  });

  it('maps a missing size to the size field', () => {
    const errs = validateCheckout({ ...valid, size: '' });
    expect(errs.size).toBe('Оберіть розмір');
  });

  it('returns the phone message for a number without +', () => {
    const errs = validateCheckout({ ...valid, phone: '0671234567' });
    expect(errs.phone).toBe('Номер має починатися з «+» і коду країни');
  });

  it('returns the name message for a single-word name', () => {
    const errs = validateCheckout({ ...valid, fullName: 'Іван' });
    expect(errs.fullName).toBe("Вкажіть ім'я та прізвище");
  });

  it('returns other-mode address errors', () => {
    const errs = validateCheckout({
      ...valid,
      deliveryMode: 'other',
      country: '',
      street: '',
      building: '',
      zip: '',
    });
    expect(errs.country).toBe('Вкажіть країну');
    expect(errs.street).toBe('Вкажіть вулицю');
    expect(errs.building).toBe('Вкажіть будинок');
    expect(errs.zip).toBe('Вкажіть поштовий індекс');
  });

  it('returns multiple errors at once', () => {
    const errs = validateCheckout({ ...valid, fullName: '', email: 'nope', phone: '' });
    expect(errs.fullName).toBeDefined();
    expect(errs.email).toBeDefined();
    expect(errs.phone).toBeDefined();
  });
});
```

- [ ] **Step 3: Запустити тести — обидва файли мають падати**

Run: `npm test`
Expected: FAIL — помилки типів/парсингу (`size`, `deliveryMode` не існують у схемі).

- [ ] **Step 4: Переписати `lib/checkoutSchema.ts`**

Повна заміна вмісту:

```ts
import { z } from 'zod';
import { SIZES, type Size } from './config';

/** Нормалізує телефон перед перевіркою: прибирає пробіли, дужки, дефіси. */
const normalizePhone = (v: string) => v.replace(/[\s()-]/g, '');

/** Схема замовлення — спільна для клієнтської форми і /api/checkout. */
export const checkoutSchema = z
  .object({
    fullName: z
      .string()
      .refine(
        (v) => v.trim().split(/\s+/).filter(Boolean).length >= 2,
        "Вкажіть ім'я та прізвище",
      ),
    phone: z
      .string()
      .refine((v) => normalizePhone(v).startsWith('+'), 'Номер має починатися з «+» і коду країни')
      .refine((v) => /^\+\d{7,15}$/.test(normalizePhone(v)), 'Введіть 7–15 цифр після «+»'),
    email: z
      .string()
      .refine((v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Невірний e-mail'),
    quantity: z.number().int().min(1, 'Кількість має бути не менше 1'),
    size: z.enum(SIZES, { message: 'Оберіть розмір' }),
    deliveryMode: z.enum(['np', 'other']),
    // --- Нова Пошта ---
    city: z.string(),
    cityRef: z.string(),
    deliveryType: z.enum(['warehouse', 'courier']),
    warehouse: z.string(),
    // --- «Інше»: Укрпошта по Україні та за кордон ---
    country: z.string(),
    street: z.string(),
    building: z.string(),
    flat: z.string(),
    zip: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.deliveryMode === 'np') {
      if (!data.city.trim()) {
        ctx.addIssue({ code: 'custom', path: ['city'], message: 'Оберіть місто' });
      }
      if (data.deliveryType === 'warehouse' && !data.warehouse.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['warehouse'],
          message: 'Оберіть відділення або поштомат',
        });
      }
      if (data.deliveryType === 'courier') {
        if (!data.street.trim()) {
          ctx.addIssue({ code: 'custom', path: ['street'], message: 'Вкажіть вулицю' });
        }
        if (!data.building.trim()) {
          ctx.addIssue({ code: 'custom', path: ['building'], message: 'Вкажіть будинок' });
        }
      }
    } else {
      if (!data.country.trim()) {
        ctx.addIssue({ code: 'custom', path: ['country'], message: 'Вкажіть країну' });
      }
      if (!data.city.trim()) {
        ctx.addIssue({ code: 'custom', path: ['city'], message: 'Вкажіть місто' });
      }
      if (!data.street.trim()) {
        ctx.addIssue({ code: 'custom', path: ['street'], message: 'Вкажіть вулицю' });
      }
      if (!data.building.trim()) {
        ctx.addIssue({ code: 'custom', path: ['building'], message: 'Вкажіть будинок' });
      }
      if (!data.zip.trim()) {
        ctx.addIssue({ code: 'custom', path: ['zip'], message: 'Вкажіть поштовий індекс' });
      }
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type DeliveryType = CheckoutInput['deliveryType'];
export type DeliveryMode = CheckoutInput['deliveryMode'];

/**
 * Стан клієнтської форми: збігається зі схемою, але розмір може бути ще не
 * обраний (''). safeParse такого стану дає помилку «Оберіть розмір».
 */
export type CheckoutFormState = Omit<CheckoutInput, 'size'> & { size: Size | '' };
```

- [ ] **Step 5: Оновити `lib/validateCheckout.ts`**

Повна заміна вмісту:

```ts
import { checkoutSchema, type CheckoutFormState, type CheckoutInput } from './checkoutSchema';

export type FieldErrors = Partial<Record<keyof CheckoutInput, string>>;

export function validateCheckout(data: CheckoutFormState): FieldErrors {
  const result = checkoutSchema.safeParse(data);
  if (result.success) return {};
  const flat = result.error.flatten().fieldErrors;
  const out: FieldErrors = {};
  for (const k of Object.keys(flat) as (keyof CheckoutInput)[]) {
    const msg = flat[k]?.[0];
    if (msg) out[k] = msg;
  }
  return out;
}
```

- [ ] **Step 6: Оновити `lib/types.ts`**

Замінити перший рядок реекспорту на:

```ts
export type {
  CheckoutInput,
  CheckoutFormState,
  DeliveryType,
  DeliveryMode,
} from './checkoutSchema';
```

(Інтерфейс `WayForPayParams` нижче — без змін.)

- [ ] **Step 7: Прогнати тести**

Run: `npm test`
Expected: усі схемні/validateCheckout тести зелені. `CheckoutForm.tsx` поки не компілюється vitest'ом? — vitest ганяє тільки `lib/__tests__`, компоненти не імпортує, тож PASS. TypeScript-помилки форми виправляє Task 6 — **до Task 6 `npm run lint`/`next build` будуть червоні, це очікувано** (форма ще не знає про нові поля).

- [ ] **Step 8: Commit**

```bash
git add lib/checkoutSchema.ts lib/validateCheckout.ts lib/types.ts lib/__tests__/checkout-schema.test.ts lib/__tests__/validateCheckout.test.ts
git commit -m "feat: checkout schema v3 - size, delivery mode, intl phone"
```

---

### Task 6: Форма — розмір, телефон, мета-рядок, CSS сегментів

**Files:**
- Modify: `components/Checkout/CheckoutForm.tsx`
- Modify: `components/Checkout/CheckoutModal.module.css`

**Interfaces:**
- Consumes: `CheckoutFormState` (Task 5); `SIZES`, `SIZE_MEASUREMENTS`, `Size` з `@/lib/config` (Task 4)
- Produces: CSS-класи `.segRow`, `.segBtn`, `.segLabel`, `.fieldRow`, `.deliveryNote` — Task 7 використовує `.segRow/.segBtn` для перемикача доставки і `.fieldRow` в адресній формі

- [ ] **Step 1: Оновити імпорти і стан форми**

У `components/Checkout/CheckoutForm.tsx`:

Замінити:

```tsx
import { PRODUCT } from '@/lib/config';
import type { CheckoutInput } from '@/lib/types';
```

на:

```tsx
import { PRODUCT, SIZES, SIZE_MEASUREMENTS } from '@/lib/config';
import type { CheckoutFormState } from '@/lib/types';
```

Замінити `type FieldKey = keyof CheckoutInput;` на `type FieldKey = keyof CheckoutFormState;`

Замінити блок `EMPTY` (разом із коментарем над ним) на:

```tsx
const EMPTY: CheckoutFormState = {
  fullName: '',
  phone: '',
  email: '',
  quantity: 1,
  size: '',
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
};
```

Замінити `useState<CheckoutInput>(EMPTY)` на `useState<CheckoutFormState>(EMPTY)` і тип параметра `patch`: `(p: Partial<CheckoutFormState>)`.

- [ ] **Step 2: Телефон — прибрати українську маску**

Видалити цілком функцію `formatUkrainianPhone` (рядки з її JSDoc включно) і замінити:

```tsx
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData((d) => ({ ...d, phone: formatUkrainianPhone(e.target.value, d.phone) }));
  };
```

на:

```tsx
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Міжнародний формат без автоформатування: «+», код країни, 7–15 цифр.
    // Пробіли/дужки/дефіси дозволені — схема нормалізує їх перед перевіркою.
    patch({ phone: e.target.value });
  };
```

В JSX телефонного інпута замінити `maxLength={13}` на `maxLength={20}` і `placeholder="+380XXXXXXXXX"` на `placeholder="+380 …"`.

- [ ] **Step 3: Динамічний мета-рядок**

Замінити:

```tsx
          <div className={`${styles.orderMeta} mono`}>OVERSIZE · ОДИН РОЗМІР · ×{data.quantity}</div>
```

на:

```tsx
          <div className={`${styles.orderMeta} mono`}>
            OVERSIZE{data.size ? ` · ${data.size}` : ''} · ×{data.quantity}
          </div>
```

- [ ] **Step 4: Блок «РОЗМІР»**

Одразу після закриваючого `</div>` елемента `.order` (перед fieldset з ПІБ/телефоном) вставити:

```tsx
      <fieldset className={styles.block}>
        <span className={`${styles.fieldLabel} ${styles.segLabel} mono`}>РОЗМІР</span>
        <div className={styles.segRow} role="radiogroup" aria-label="Розмір">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              className={styles.segBtn}
              data-active={data.size === s ? 'true' : undefined}
              aria-pressed={data.size === s}
              onClick={() => {
                patch({ size: s });
                markTouched('size');
              }}
            >
              {s}
            </button>
          ))}
        </div>
        {visibleError('size') ? (
          <span className={`${styles.fieldError} mono`}>{visibleError('size')}</span>
        ) : (
          data.size &&
          SIZE_MEASUREMENTS[data.size] && (
            <span className={`${styles.fieldHint} mono`}>
              ШИРИНА {SIZE_MEASUREMENTS[data.size]!.widthCm} СМ · ДОВЖИНА{' '}
              {SIZE_MEASUREMENTS[data.size]!.lengthCm} СМ
            </span>
          )
        )}
      </fieldset>
```

- [ ] **Step 5: Рядок про доставку біля кнопки оплати**

Одразу після закриваючого `</div>` блока `.payRow` додати:

```tsx
      <p className={`${styles.deliveryNote} mono`}>
        Доставка — за рахунок отримувача, за тарифами перевізника
      </p>
```

- [ ] **Step 6: CSS — сегменти, ряд полів, нотатка, stagger**

У `components/Checkout/CheckoutModal.module.css` після блока `.qtyBtn`-правил додати:

```css
/* ---------- Segment controls (розмір, спосіб доставки) ---------- */
.segLabel { margin-bottom: 12px; }
.segRow { display: flex; gap: 8px; }
.segBtn {
  flex: 1; height: 52px;
  background: none; border: 1.5px solid #c1baac; color: #c1baac;
  cursor: pointer;
  font-family: var(--font-oswald); font-weight: 700;
  font-size: 17px; text-transform: uppercase; letter-spacing: .04em;
  transition: background 150ms ease, color 150ms ease,
              transform 150ms var(--ease-out);
}
.segBtn[data-active='true'] { background: #c1baac; color: var(--ink); }
.segBtn:not([data-active='true']):active { transform: scale(0.97); }
.segRow + .fieldError, .segRow + .fieldHint { margin-top: 10px; }

/* Два поля в один рядок (будинок + квартира). */
.fieldRow { display: flex; gap: 16px; }
.fieldRow .field { flex: 1; }

/* Тиха нотатка про доставку під кнопкою оплати. */
.deliveryNote {
  font-size: 8px; color: #8f8a7d; text-align: center;
  margin-top: 12px; letter-spacing: .05em; text-transform: uppercase;
}
```

Замінити stagger-блок:

```css
.block:nth-of-type(1) { animation-delay: 230ms; }
.block:nth-of-type(2) { animation-delay: 290ms; }
.payRow { animation-delay: 350ms; }
```

на:

```css
.block:nth-of-type(1) { animation-delay: 230ms; }
.block:nth-of-type(2) { animation-delay: 290ms; }
.block:nth-of-type(3) { animation-delay: 350ms; }
.payRow { animation-delay: 410ms; }
```

- [ ] **Step 7: Тести, lint, візуальна перевірка**

Run: `npm test` → PASS. Run: `npm run lint` → без помилок (форма знову типобезпечна).

Run: `npm run dev` → головна → кнопка купівлі → модалка:
- блок «РОЗМІР» з трьома контурними кнопками одразу під фото; клік по «M» інвертує її (беж, чорний текст), мета-рядок стає `OVERSIZE · M · ×1`;
- рядок замірів НЕ показується (SIZE_MEASUREMENTS — null);
- сабміт без розміру показує «Оберіть розмір» червоним під кнопками;
- телефон приймає `+48123456789` без перетворення на +380;
- під кнопкою оплати — «ДОСТАВКА — ЗА РАХУНОК ОТРИМУВАЧА…»;
- сума на кнопці — `2600 ₴ (×1)`.

- [ ] **Step 8: Commit**

```bash
git add components/Checkout/CheckoutForm.tsx components/Checkout/CheckoutModal.module.css
git commit -m "feat: size picker, intl phone input, delivery note in checkout"
```

---

### Task 7: Перемикач доставки + універсальна адресна форма

**Files:**
- Create: `components/Checkout/OtherDeliveryFields.tsx`
- Modify: `components/Checkout/CheckoutForm.tsx` (fieldset доставки)

**Interfaces:**
- Consumes: `CheckoutFormState` (Task 5); CSS-класи `.segRow/.segBtn/.segLabel/.fieldRow` (Task 6); `NovaPoshtaPicker` (наявний, без змін)
- Produces: `OtherDeliveryFields({ value, onChange, onBlur, errors })` — той самий контракт onChange/onBlur, що в NovaPoshtaPicker

- [ ] **Step 1: Створити `components/Checkout/OtherDeliveryFields.tsx`**

```tsx
'use client';

import styles from './CheckoutModal.module.css';
import type { CheckoutFormState } from '@/lib/types';

type OtherValue = Pick<
  CheckoutFormState,
  'country' | 'city' | 'street' | 'building' | 'flat' | 'zip'
>;

type OtherField = 'country' | 'city' | 'street' | 'building' | 'zip';

interface OtherErrors {
  country?: string;
  city?: string;
  street?: string;
  building?: string;
  zip?: string;
}

/**
 * Універсальна адресна форма для режиму «Інше»: Укрпошта по Україні та
 * міжнародні відправлення. Один набір полів покриває обидва кейси.
 */
export function OtherDeliveryFields({
  value,
  onChange,
  onBlur,
  errors,
}: {
  value: OtherValue;
  onChange: (patch: Partial<CheckoutFormState>) => void;
  onBlur?: (field: OtherField) => void;
  errors: OtherErrors;
}) {
  const text = (
    key: keyof OtherValue,
    label: string,
    opts?: { placeholder?: string; hint?: string; autoComplete?: string },
  ) => {
    const error = key === 'flat' ? undefined : errors[key as OtherField];
    return (
      <label className={styles.field}>
        <span className={`${styles.fieldLabel} mono`}>{label}</span>
        <input
          className={styles.input}
          data-invalid={error ? 'true' : undefined}
          value={value[key]}
          placeholder={opts?.placeholder}
          autoComplete={opts?.autoComplete}
          onChange={(e) => onChange({ [key]: e.target.value })}
          onBlur={() => {
            if (key !== 'flat') onBlur?.(key as OtherField);
          }}
        />
        {error ? (
          <span className={`${styles.fieldError} mono`}>{error}</span>
        ) : (
          opts?.hint && <span className={`${styles.fieldHint} mono`}>{opts.hint}</span>
        )}
      </label>
    );
  };

  return (
    <>
      {text('country', 'КРАЇНА', { autoComplete: 'country-name' })}
      {text('city', 'МІСТО', { autoComplete: 'address-level2' })}
      {text('street', 'ВУЛИЦЯ', {
        placeholder: 'вул. Шевченка',
        autoComplete: 'address-line1',
      })}
      <div className={styles.fieldRow}>
        {text('building', 'БУДИНОК', { placeholder: '12А' })}
        {text('flat', 'КВАРТИРА', { placeholder: '45' })}
      </div>
      {text('zip', 'ПОШТОВИЙ ІНДЕКС', {
        placeholder: '01001',
        autoComplete: 'postal-code',
      })}
    </>
  );
}
```

- [ ] **Step 2: Вбудувати перемикач у CheckoutForm**

У `components/Checkout/CheckoutForm.tsx` додати імпорт:

```tsx
import { OtherDeliveryFields } from './OtherDeliveryFields';
```

Замінити fieldset доставки:

```tsx
      <fieldset className={styles.block}>
        <NovaPoshtaPicker
          value={data}
          onChange={patch}
          onBlur={markTouched}
          errors={{ city: visibleError('city'), warehouse: visibleError('warehouse') }}
        />
      </fieldset>
```

на:

```tsx
      <fieldset className={styles.block}>
        <span className={`${styles.fieldLabel} ${styles.segLabel} mono`}>ДОСТАВКА</span>
        <div className={styles.segRow} role="radiogroup" aria-label="Спосіб доставки">
          <button
            type="button"
            className={styles.segBtn}
            data-active={data.deliveryMode === 'np' ? 'true' : undefined}
            aria-pressed={data.deliveryMode === 'np'}
            onClick={() => patch({ deliveryMode: 'np' })}
          >
            НОВА ПОШТА
          </button>
          <button
            type="button"
            className={styles.segBtn}
            data-active={data.deliveryMode === 'other' ? 'true' : undefined}
            aria-pressed={data.deliveryMode === 'other'}
            onClick={() => patch({ deliveryMode: 'other' })}
          >
            ІНШЕ
          </button>
        </div>
        <span className={`${styles.fieldHint} mono`}>
          Інше — Укрпошта: по Україні та за кордон
        </span>
        {data.deliveryMode === 'np' ? (
          <NovaPoshtaPicker
            value={data}
            onChange={patch}
            onBlur={markTouched}
            errors={{ city: visibleError('city'), warehouse: visibleError('warehouse') }}
          />
        ) : (
          <OtherDeliveryFields
            value={data}
            onChange={patch}
            onBlur={markTouched}
            errors={{
              country: visibleError('country'),
              city: visibleError('city'),
              street: visibleError('street'),
              building: visibleError('building'),
              zip: visibleError('zip'),
            }}
          />
        )}
      </fieldset>
```

Примітка: хінт «Інше — Укрпошта…» іде одразу після segRow; перший `.field` усередині гілки додає стандартний відступ, додаткових стилів не треба. Якщо візуально хінт злипається з полями — додати `margin-bottom: 16px` через клас `.segHint` (не inline-style).

- [ ] **Step 3: Підказка про латиницю біля ПІБ у режимі «Інше»**

Спек вимагає підказку саме біля ПІБ. У `CheckoutForm.tsx` в `<Field label="ІМ'Я І ПРІЗВИЩЕ" …>` додати проп:

```tsx
          hint={data.deliveryMode === 'other' ? 'для закордону — латиницею, як у паспорті' : undefined}
```

(Компонент `Field` вже вміє показувати hint, коли немає помилки.)

- [ ] **Step 4: Перевірити перемикання станів**

Run: `npm run dev` → модалка:
- дефолт — «НОВА ПОШТА» активна, місто/відділення як раніше;
- клік «ІНШЕ» → поля КРАЇНА (передзаповнено «Україна»), МІСТО, ВУЛИЦЯ, БУДИНОК+КВАРТИРА в ряд, ІНДЕКС; біля індексу хінт про латиницю;
- сабміт з порожніми полями в «Іншому» підсвічує кожне обовʼязкове поле своїм повідомленням; КВАРТИРА помилки не дає;
- перемикання назад на «НОВА ПОШТА» не губить місто/відділення, і навпаки — значення «Іншого» переживають перемикання;
- у режимі «ІНШЕ» валідна форма активує кнопку оплати (місто НП не вимагається).

- [ ] **Step 5: Тести, lint, commit**

Run: `npm test` → PASS. Run: `npm run lint` → без помилок.

```bash
git add components/Checkout/OtherDeliveryFields.tsx components/Checkout/CheckoutForm.tsx
git commit -m "feat: NP/other delivery toggle with universal address form"
```

---

### Task 8: Telegram-потік — заявка з /api/checkout, коротке «оплачено» з колбека

Чинить баг: зараз колбек читає `body.deliveryCity`/`body.deliveryWarehouse`, яких WayForPay не шле — менеджер отримує «—» замість адреси. Повні дані замовлення тепер ідуть у Telegram у момент створення заявки (до оплати), а колбек лише підтверджує оплату за №.

**Files:**
- Modify: `lib/telegram.ts` (повна заміна)
- Modify: `lib/__tests__/telegram.test.ts` (повна заміна)
- Modify: `app/api/checkout/route.ts`
- Modify: `app/api/wayforpay-callback/route.ts`

**Interfaces:**
- Consumes: `CheckoutInput` (Task 5), `PRODUCT` (Task 4)
- Produces:
  - `formatPendingOrderMessage(o: PendingOrder): string`, де `PendingOrder = { orderReference: string; fullName: string; phone: string; email: string; size: string; quantity: number; amount: number; deliveryMode: 'np' | 'other'; city: string; warehouse: string; country: string; street: string; building: string; flat: string; zip: string }`
  - `formatPaidMessage(orderReference: string, amount: number): string`
  - `sendToTelegram(botToken, chatId, text)` — без змін

- [ ] **Step 1: Переписати тести telegram**

Повністю замінити вміст `lib/__tests__/telegram.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatPendingOrderMessage, formatPaidMessage } from '../telegram';

const base = {
  orderReference: 'DROP01-9',
  fullName: 'Чемеров Олександр',
  phone: '+380671234567',
  email: 'sasha@mail.com',
  size: 'M',
  quantity: 2,
  amount: 5200,
  deliveryMode: 'np' as const,
  city: 'Львів',
  warehouse: 'Відділення №1',
  country: '',
  street: '',
  building: '',
  flat: '',
  zip: '',
};

describe('formatPendingOrderMessage', () => {
  it('includes order, buyer and NP delivery fields', () => {
    const msg = formatPendingOrderMessage(base);
    expect(msg).toContain('DROP01-9');
    expect(msg).toContain('розмір M');
    expect(msg).toContain('×2');
    expect(msg).toContain('5200');
    expect(msg).toContain('Чемеров Олександр');
    expect(msg).toContain('+380671234567');
    expect(msg).toContain('sasha@mail.com');
    expect(msg).toContain('Нова Пошта');
    expect(msg).toContain('Львів');
    expect(msg).toContain('Відділення №1');
    expect(msg).toContain('очікує оплати');
  });

  it('formats the other-mode address with country, street and zip', () => {
    const msg = formatPendingOrderMessage({
      ...base,
      deliveryMode: 'other',
      city: 'Kraków',
      warehouse: '',
      country: 'Польща',
      street: 'ul. Floriańska',
      building: '12',
      flat: '3',
      zip: '31-019',
    });
    expect(msg).toContain('Укрпошта');
    expect(msg).toContain('Польща');
    expect(msg).toContain('Kraków');
    expect(msg).toContain('ul. Floriańska');
    expect(msg).toContain('буд. 12');
    expect(msg).toContain('кв. 3');
    expect(msg).toContain('31-019');
  });

  it('omits the flat part when flat is empty', () => {
    const msg = formatPendingOrderMessage({
      ...base,
      deliveryMode: 'other',
      country: 'Польща',
      street: 'ul. Floriańska',
      building: '12',
      flat: '',
      zip: '31-019',
    });
    expect(msg).not.toContain('кв.');
  });
});

describe('formatPaidMessage', () => {
  it('mentions the order reference and amount', () => {
    const msg = formatPaidMessage('DROP01-9', 5200);
    expect(msg).toContain('DROP01-9');
    expect(msg).toContain('5200');
    expect(msg).toContain('Оплату підтверджено');
  });
});
```

- [ ] **Step 2: Запустити — тести падають**

Run: `npm test`
Expected: FAIL — `formatPendingOrderMessage` не існує.

- [ ] **Step 3: Переписати `lib/telegram.ts`**

Повна заміна вмісту:

```ts
export interface PendingOrder {
  orderReference: string;
  fullName: string;
  phone: string;
  email: string;
  size: string;
  quantity: number;
  amount: number;
  deliveryMode: 'np' | 'other';
  // Нова Пошта
  city: string;
  warehouse: string;
  // «Інше»: Укрпошта по Україні та за кордон
  country: string;
  street: string;
  building: string;
  flat: string;
  zip: string;
}

/**
 * Повідомлення про створену заявку — шлеться з /api/checkout ДО оплати,
 * бо WayForPay-колбек не повертає адресу доставки. Менеджер відправляє
 * посилку лише після другого повідомлення «Оплату підтверджено» з тим же №.
 */
export function formatPendingOrderMessage(o: PendingOrder): string {
  const delivery =
    o.deliveryMode === 'np'
      ? `Нова Пошта: ${o.city}, ${o.warehouse}`
      : `Укрпошта: ${o.country}, ${o.city}, ${o.street}, буд. ${o.building}` +
        (o.flat ? `, кв. ${o.flat}` : '') +
        `, індекс ${o.zip}`;
  return [
    '🕓 <b>Заявка (очікує оплати)</b>',
    `<b>№:</b> ${o.orderReference}`,
    `<b>Товар:</b> too much яром too much долиною · розмір ${o.size} · ×${o.quantity}`,
    `<b>Сума:</b> ${o.amount} ₴`,
    '',
    `<b>Покупець:</b> ${o.fullName}`,
    `<b>Телефон:</b> ${o.phone}`,
    `<b>E-mail:</b> ${o.email}`,
    '',
    `<b>Доставка:</b> ${delivery}`,
  ].join('\n');
}

/** Підтвердження оплати — шлеться з WayForPay-колбека після Approved. */
export function formatPaidMessage(orderReference: string, amount: number): string {
  return [
    '✅ <b>Оплату підтверджено</b>',
    `<b>№:</b> ${orderReference}`,
    `<b>Сума:</b> ${amount} ₴`,
  ].join('\n');
}

/** Надсилає повідомлення в чат менеджерів. */
export async function sendToTelegram(botToken: string, chatId: string, text: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  if (!res.ok) throw new Error(`Telegram sendMessage failed: ${res.status}`);
}
```

- [ ] **Step 4: Прогнати тести**

Run: `npm test`
Expected: telegram-тести зелені; колбек-роут ще ссилається на старий `formatOrderMessage` — це TypeScript, тестами не ловиться, чинимо в наступних кроках.

- [ ] **Step 5: /api/checkout — розмір у назві товару + телеграм-заявка**

У `app/api/checkout/route.ts`:

Додати імпорт:

```ts
import { formatPendingOrderMessage, sendToTelegram } from '@/lib/telegram';
```

Замінити рядок productName у `base`:

```ts
    productName: [`Футболка - ${PRODUCT.name}`],
```

на:

```ts
    productName: [`Футболка - ${PRODUCT.name} (${input.size})`],
```

Замінити рядок телефону:

```ts
    clientPhone: input.phone.replace(/\s/g, ''),
```

на:

```ts
    clientPhone: input.phone.replace(/[\s()-]/g, ''),
```

Перед фінальним `return NextResponse.json(params);` додати:

```ts
  // Повні дані замовлення (розмір, адреса) WayForPay назад не повертає,
  // тому заявка їде менеджеру вже зараз; колбек підтвердить оплату за №.
  // Падіння Telegram не блокує оплату.
  try {
    const text = formatPendingOrderMessage({
      orderReference,
      fullName: input.fullName,
      phone: input.phone.replace(/[\s()-]/g, ''),
      email: input.email,
      size: input.size,
      quantity,
      amount: base.amount,
      deliveryMode: input.deliveryMode,
      city: input.city,
      warehouse: input.warehouse,
      country: input.country,
      street: input.street,
      building: input.building,
      flat: input.flat,
      zip: input.zip,
    });
    await sendToTelegram(
      requireEnv('TELEGRAM_BOT_TOKEN'),
      requireEnv('TELEGRAM_CHAT_ID'),
      text,
    );
  } catch (err) {
    console.error('Telegram pending-order notify failed', err);
  }
```

- [ ] **Step 6: Колбек — коротке «оплачено»**

У `app/api/wayforpay-callback/route.ts` замінити імпорт:

```ts
import { formatOrderMessage, sendToTelegram } from '@/lib/telegram';
```

на:

```ts
import { formatPaidMessage, sendToTelegram } from '@/lib/telegram';
```

і замінити блок `try { … } catch` усередині `if (expected === body.merchantSignature && …)` на:

```ts
    try {
      await sendToTelegram(
        requireEnv('TELEGRAM_BOT_TOKEN'),
        requireEnv('TELEGRAM_CHAT_ID'),
        formatPaidMessage(body.orderReference, body.amount),
      );
    } catch (err) {
      console.error('Telegram notify failed', err);
    }
```

- [ ] **Step 7: Тести, lint, commit**

Run: `npm test` → PASS. Run: `npm run lint` → без помилок.

```bash
git add lib/telegram.ts lib/__tests__/telegram.test.ts app/api/checkout/route.ts app/api/wayforpay-callback/route.ts
git commit -m "feat: pending-order Telegram message with full address, short paid confirmation"
```

---

### Task 9: Фінальна верифікація

**Files:** нічого нового — прогін усього.

- [ ] **Step 1: Повний прогін**

Run: `npm test` → усі зелені.
Run: `npm run lint` → без помилок.
Run: `npm run build` → збірка успішна (build локально потребує env-змінних лише в рантаймі роутів, не на збірці).

- [ ] **Step 2: Ручний E2E (dev-сервер)**

Run: `npm run dev`. Пройти чек-лист:

1. Головна: футер показує реквізити-плейсхолдери; лінки /offer і /returns працюють.
2. /offer: §5.2 Visa/Mastercard; §6 обидві служби + строки; §13 реквізити.
3. /returns: розділ 7 «Скасування замовлення».
4. Модалка: розмір обовʼязковий; мета `OVERSIZE · M · ×N`; сума 2600 ₴ × кількість.
5. Режим НП: місто/відділення як раніше. Режим «Інше»: країна/місто/вулиця/будинок/індекс обовʼязкові, квартира — ні.
6. Телефон: `+380671234567` і `+48 123-456-789` проходять; `0671234567` — помилка.
7. З валідною формою і тестовими WayForPay-кредами в `.env.local`: клік «Оплатити» відкриває віджет; у Telegram приходить «🕓 Заявка…» з розміром і повною адресою; після тестової оплати — «✅ Оплату підтверджено» з тим самим №. (Без кредів — перевірити, що POST /api/checkout повертає підписані параметри, а падіння Telegram лише логується.)

- [ ] **Step 3: Commit фіксів (якщо були)**

Будь-які знахідки чинити і комітити атомарно: `fix: <що саме>`.

- [ ] **Step 4: Чек-лист перед поданням на модерацію (виконується, коли команда дасть дані)**

1. Заповнити `lib/seller.ts` реальними даними; у `lib/__tests__/seller.test.ts` інвертувати expect на `toBe(false)`.
2. Вписати заміри в `SIZE_MEASUREMENTS` (`lib/config.ts`).
3. Переконатися: `git grep -n "【"` не знаходить нічого поза `docs/`.
4. Env на проді: `WAYFORPAY_MERCHANT_ACCOUNT`, `WAYFORPAY_MERCHANT_DOMAIN`, `WAYFORPAY_SECRET_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `NEXT_PUBLIC_SITE_URL=https://isusneisus.com`.
5. Задеплоїти, пройти одну реальну тестову оплату, повідомити WayForPay про готовність.
