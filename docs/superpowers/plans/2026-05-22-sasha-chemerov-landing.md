# Sasha Chemerov Landing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Збудувати односторінковий лендинг для продажу однієї футболки Саші Чемерова з виїзною чекаут-модалкою, оплатою WayForPay, доставкою Нової Пошти та сповіщеннями менеджерам у Telegram.

**Architecture:** Next.js (App Router) на Vercel. Головна та юридичні сторінки — статичні (SSG). Інтерактив (галерея, модалка) — клієнтські компоненти. Платіж, проксі Нової Пошти й сповіщення Telegram — серверні Route Handlers; усі секрети в env Vercel.

**Tech Stack:** Next.js 15 (App Router, TypeScript), React 19, CSS Modules + глобальні CSS-токени, next/font, Vitest, WayForPay widget, Nova Poshta API, Telegram Bot API.

**Джерела істини:**
- Дизайн-специфікація: `docs/superpowers/specs/2026-05-22-sasha-chemerov-lending-design.md`
- Затверджені макети (точні значення верстки/CSS): `docs/superpowers/reference/landing-final.html`, `docs/superpowers/reference/modal-mock.html`

**Вихідні фото** (вже у репозиторії, корінь проєкту): `front.png`, `back.png`, `logo.png`; перегенеровані — у теці `new/`: `hero.jpeg`, `font.jpeg`, `back.jpeg`, `artist-front.jpeg`, `artist-back.jpeg`.

---

## File Structure

```
app/
  layout.tsx                      кореневий layout, шрифти, метадані
  page.tsx                        головна (SSG) — композиція секцій
  globals.css                     CSS-токени + база
  offer/page.tsx                  Публічна оферта (SSG)
  returns/page.tsx                Умови повернення (SSG)
  api/
    checkout/route.ts             створює параметри платежу WayForPay
    wayforpay-callback/route.ts   колбек оплати → Telegram
    novaposhta/route.ts           проксі Нової Пошти (міста, відділення)
components/
  Header/Header.tsx + .module.css
  Hero/Hero.tsx + .module.css
  Gallery/Gallery.tsx + .module.css            (client — авто-слайдер)
  OrderBar/OrderBar.tsx + .module.css          (client — CTA)
  Footer/Footer.tsx + .module.css
  Legal/LegalPage.tsx + .module.css
  Checkout/CheckoutProvider.tsx                (client — контекст + стан модалки)
  Checkout/CheckoutModal.tsx + .module.css     (client)
  Checkout/CheckoutForm.tsx
  Checkout/NovaPoshtaPicker.tsx
lib/
  config.ts                       константи товару, доступ до env
  types.ts                        спільні типи
  wayforpay.ts                    генерація/перевірка підписів
  novaposhta.ts                   клієнт API Нової Пошти
  telegram.ts                     формат + надсилання повідомлення
  __tests__/                      Vitest-тести
public/
  hero.jpg front.jpg back.jpg artist-front.jpg artist-back.jpg logo.png
vitest.config.ts
.env.local.example
```

Кожен компонент — одна відповідальність, свій CSS-модуль. `lib/*` — чисті функції, тестовані ізольовано. Route Handlers — тонкі, уся логіка в `lib/`.

---

## Phase 0 — Налаштування проєкту

### Task 1: Скаффолд Next.js

**Files:**
- Create: весь каркас Next.js у корені проєкту

- [ ] **Step 1: Прибрати вихідні фото з кореня, щоб не заважали скаффолду**

```bash
mkdir -p source-assets
mv front.png back.png logo.png *.jpg "ChatGPT Image"*.png source-assets/ 2>/dev/null || true
mv new source-assets/regenerated
```

- [ ] **Step 2: Згенерувати застосунок у тимчасовій теці**

```bash
npx create-next-app@latest temp-app --typescript --app --no-tailwind --no-src-dir --import-alias "@/*" --eslint --use-npm --no-turbopack
```

- [ ] **Step 3: Перенести каркас у корінь і прибрати тимчасову теку**

```bash
cp -r temp-app/. .
rm -rf temp-app
```
Якщо `create-next-app` перезаписав `.gitignore` — додати назад рядок `.superpowers/` і `source-assets/` нагору файлу.

- [ ] **Step 4: Перевірити, що застосунок піднімається**

Run: `npm run dev`
Expected: dev-сервер стартує на `http://localhost:3000`, відкривається стартова сторінка Next.js. Зупинити сервер (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app"
```

---

### Task 2: Налаштувати Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (скрипт `test`)
- Create: `lib/__tests__/smoke.test.ts`

- [ ] **Step 1: Встановити залежності**

```bash
npm install -D vitest
```

- [ ] **Step 2: Створити `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Додати скрипт у `package.json`**

У розділ `"scripts"` додати:
```json
"test": "vitest run"
```

- [ ] **Step 4: Створити димовий тест `lib/__tests__/smoke.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Запустити тести**

Run: `npm test`
Expected: PASS — 1 тест проходить.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: add vitest"
```

---

### Task 3: CSS-токени та шрифти

**Files:**
- Modify: `app/globals.css` (повністю замінити)
- Modify: `app/layout.tsx`

- [ ] **Step 1: Замінити вміст `app/globals.css`**

```css
:root {
  --bg: #FAFAFA;
  --ink: #0D0D0D;
  --red: #F14933;
  --grey: #7A7A7A;
  --maxw: 1280px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body { background: var(--bg); color: var(--ink); }

body {
  font-family: var(--font-inter), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  line-height: 1.5;
}

a { color: inherit; }

.mono {
  font-family: var(--font-mono), monospace;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.poster {
  font-family: var(--font-oswald), sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  line-height: 0.82;
  letter-spacing: 0.004em;
}

.display {
  font-family: var(--font-display), sans-serif;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.01em;
}
```

- [ ] **Step 2: Налаштувати шрифти в `app/layout.tsx`**

Повністю замінити файл:
```tsx
import type { Metadata } from 'next';
import { Inter, Montserrat, Oswald, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' });
const display = Montserrat({ subsets: ['latin', 'cyrillic'], weight: ['900'], variable: '--font-display' });
const oswald = Oswald({ subsets: ['latin', 'cyrillic'], weight: ['600', '700'], variable: '--font-oswald' });
const mono = IBM_Plex_Mono({ subsets: ['latin', 'cyrillic'], weight: ['400', '500'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'too much яром too much долиною — Sasha Chemerov',
  description: 'Дроп 01 — оверсайз-футболка від Саші Чемерова та гурту «Димна Суміш».',
  metadataBase: new URL('https://isusneisus.com'),
  openGraph: {
    title: 'too much яром too much долиною — Sasha Chemerov',
    description: 'Дроп 01 — оверсайз-футболка.',
    images: ['/hero.jpg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={`${inter.variable} ${display.variable} ${oswald.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Перевірити збірку**

Run: `npm run build`
Expected: збірка успішна, без помилок типів.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: design tokens and fonts"
```

---

### Task 4: Зображення та конфіг товару

**Files:**
- Create: `public/hero.jpg`, `public/front.jpg`, `public/back.jpg`, `public/artist-front.jpg`, `public/artist-back.jpg`, `public/logo.png`
- Create: `lib/config.ts`
- Create: `lib/types.ts`

- [ ] **Step 1: Скопіювати фінальні фото в `public/`**

```bash
cp source-assets/regenerated/hero.jpeg public/hero.jpg
cp source-assets/regenerated/font.jpeg public/front.jpg
cp source-assets/regenerated/back.jpeg public/back.jpg
cp source-assets/regenerated/artist-front.jpeg public/artist-front.jpg
cp source-assets/regenerated/artist-back.jpeg public/artist-back.jpg
cp source-assets/logo.png public/logo.png
```

- [ ] **Step 2: Створити `lib/types.ts`**

```typescript
export interface CheckoutInput {
  fullName: string;
  phone: string;
  email: string;
  city: string;
  cityRef: string;
  warehouse: string;
}

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

- [ ] **Step 3: Створити `lib/config.ts`**

```typescript
export const PRODUCT = {
  name: 'too much яром too much долиною',
  price: 2200,
  currency: 'UAH',
  sku: 'DROP01-OVERSIZE',
} as const;

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://isusneisus.com';

/** Доступ до серверних env зі зрозумілою помилкою за відсутності. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}
```

- [ ] **Step 4: Перевірити збірку**

Run: `npm run build`
Expected: успішно.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: product config, types, image assets"
```

---

## Phase 1 — Статичний лендинг

> Для всіх UI-завдань: точні значення верстки, розмірів і CSS брати з `docs/superpowers/reference/landing-final.html` (відповідна секція). Перевірка — `npm run dev` і візуальний огляд у браузері (мобільна та десктоп ширина).

### Task 5: Хедер

**Files:**
- Create: `components/Header/Header.tsx`
- Create: `components/Header/Header.module.css`

- [ ] **Step 1: Створити `components/Header/Header.tsx`**

```tsx
import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <span className={`${styles.sub} mono`}>димна суміш</span>
        <span className={`${styles.name} display`}>САША ЧЄМЄРОВ</span>
      </div>
      <span className={`${styles.drop} mono`}>DROP 01 // ONE SIZE (OVERSIZE)</span>
    </header>
  );
}
```

- [ ] **Step 2: Створити `components/Header/Header.module.css`**

Портувати зі стилів `.dHead` / `.pHead` макета. Базова структура:
```css
.header {
  position: fixed; top: 0; left: 0; right: 0; z-index: 40;
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 24px;
  background: var(--bg);
  border-bottom: 1.5px solid var(--ink);
}
.logo { display: flex; flex-direction: column; line-height: 1; }
.sub { font-size: 8px; color: var(--ink); }
.name { font-size: 14px; margin-top: 3px; }
.drop { font-size: 9px; color: var(--grey); text-align: right; }
@media (min-width: 768px) {
  .header { padding: 18px 40px; }
  .name { font-size: 18px; }
  .drop { font-size: 10px; }
}
```

- [ ] **Step 3: Тимчасово підключити в `app/page.tsx` для перегляду**

Замінити вміст `app/page.tsx`:
```tsx
import { Header } from '@/components/Header/Header';

export default function Home() {
  return <main><Header /></main>;
}
```

- [ ] **Step 4: Візуальна перевірка**

Run: `npm run dev`, відкрити `http://localhost:3000`.
Expected: закріплений угорі тонкий хедер; зліва лого у два рядки, справа сірий маркер DROP 01. Перевірити мобільну ширину (DevTools).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: header component"
```

---

### Task 6: Герой

**Files:**
- Create: `components/Hero/Hero.tsx`
- Create: `components/Hero/Hero.module.css`
- Modify: `app/page.tsx`

- [ ] **Step 1: Створити `components/Hero/Hero.tsx`**

```tsx
import Image from 'next/image';
import styles from './Hero.module.css';

export function Hero() {
  return (
    <section className={styles.hero}>
      <Image src="/hero.jpg" alt="Саша Чемеров" fill priority className={styles.photo} sizes="100vw" />
      <div className={styles.grad} />
      <h1 className={`${styles.title} poster`}>
        <span>TOO MUCH ЯРОМ</span>
        <span>TOO MUCH <span className={styles.red}>ДОЛИНОЮ</span></span>
      </h1>
      <span className={`${styles.cue} mono`}>↓ АРТЕФАКТ</span>
    </section>
  );
}
```

- [ ] **Step 2: Створити `components/Hero/Hero.module.css`**

Портувати з `.dHero` макета. Структура:
```css
.hero { position: relative; height: 88vh; min-height: 520px; overflow: hidden; background: #000; }
.photo { object-fit: cover; object-position: 50% 30%; }
.grad {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,.92) 2%, rgba(0,0,0,0) 46%),
              linear-gradient(to right, rgba(0,0,0,.55), rgba(0,0,0,0) 55%);
}
.title {
  position: absolute; left: 24px; bottom: 28px; z-index: 3; color: #fff;
  display: flex; flex-direction: column;
  font-size: clamp(46px, 9vw, 118px);
}
.red { color: var(--red); }
.cue { position: absolute; right: 24px; bottom: 32px; z-index: 3; font-size: 9px; color: #d6d6d6; }
@media (min-width: 768px) { .title { left: 38px; bottom: 34px; } }
```
Заголовок поки набраний шрифтом Oswald (`.poster`). Коли клієнт надасть кастомний леттеринг — замінити `<h1>` на `<Image>` з SVG (окреме завдання поза цим планом).

- [ ] **Step 3: Додати в `app/page.tsx`**

```tsx
import { Header } from '@/components/Header/Header';
import { Hero } from '@/components/Hero/Hero';

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
    </main>
  );
}
```

- [ ] **Step 4: Візуальна перевірка**

Run: `npm run dev`
Expected: фото Чемерова на весь екран, затемнення знизу, величезний заголовок знизу-зліва, «ДОЛИНОЮ» червоне. Мобільна ширина — заголовок зменшується, фото кропиться по центру.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: hero section"
```

---

### Task 7: Галерея «Артефакт»

**Files:**
- Create: `components/Gallery/Gallery.tsx`
- Create: `components/Gallery/Gallery.module.css`
- Modify: `app/page.tsx`

- [ ] **Step 1: Створити `components/Gallery/Gallery.tsx`**

Клієнтський компонент: на мобільному — авто-слайдер (4 кадри, зміна кожні 2800 мс), на десктопі — диптих із ховером (CSS). Обидва режими в одному DOM; перемикання — через CSS media queries.

```tsx
'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import styles from './Gallery.module.css';

const SLIDES = [
  { src: '/front.jpg', cap: 'ПЕРЕД' },
  { src: '/back.jpg', cap: 'СПИНА' },
  { src: '/artist-front.jpg', cap: 'ЧЕМЕРОВ · ПЕРЕД' },
  { src: '/artist-back.jpg', cap: 'ЧЕМЕРОВ · СПИНА' },
];

export function Gallery() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <section className={styles.gallery}>
      <h2 className={`${styles.heading} display`}>Артефакт</h2>

      {/* Мобільний авто-слайдер */}
      <div className={styles.slider} aria-hidden={false}>
        <div className={styles.stage}>
          {SLIDES.map((s, i) => (
            <div key={s.src} className={`${styles.frame} ${i === active ? styles.on : ''}`}>
              <Image src={s.src} alt={s.cap} fill sizes="100vw" className={styles.frameImg} />
            </div>
          ))}
        </div>
        <div className={styles.bar}><span style={{ width: `${((active + 1) / SLIDES.length) * 100}%` }} /></div>
        <div className={`${styles.cap} mono`}>
          <span>{SLIDES[active].cap}</span>
          <span>{String(active + 1).padStart(2, '0')} / 0{SLIDES.length}</span>
        </div>
      </div>

      {/* Десктоп-диптих з ховером */}
      <div className={styles.diptych}>
        <Plate product="/front.jpg" reveal="/artist-front.jpg" tag="FRONT" />
        <Plate product="/back.jpg" reveal="/artist-back.jpg" tag="BACK" />
      </div>
    </section>
  );
}

function Plate({ product, reveal, tag }: { product: string; reveal: string; tag: string }) {
  return (
    <div className={styles.plate}>
      <Image src={product} alt={tag} fill sizes="50vw" className={styles.plateImg} />
      <Image src={reveal} alt={`${tag} на Чемерові`} fill sizes="50vw" className={styles.plateReveal} />
      <span className={`${styles.tag} mono`}>{tag}</span>
    </div>
  );
}
```

- [ ] **Step 2: Створити `components/Gallery/Gallery.module.css`**

Портувати з `.dGal` / `.pGal` макета. Ключові правила:
```css
.gallery { background: var(--bg); padding: 56px 24px; }
.heading { font-size: 30px; margin-bottom: 24px; }

/* slider — лише мобільний */
.slider { display: block; }
.diptych { display: none; }
@media (min-width: 768px) {
  .slider { display: none; }
  .diptych { display: flex; gap: 24px; }
  .gallery { padding: 64px 40px; }
}

.stage { position: relative; width: 100%; aspect-ratio: 3/2; background: #000; overflow: hidden; }
.frame { position: absolute; inset: 0; opacity: 0; transform: scale(1.05);
  transition: opacity .7s ease, transform .7s ease; }
.frame.on { opacity: 1; transform: scale(1); }
.frameImg { object-fit: cover; }
.bar { height: 2px; background: #e2e2e2; }
.bar span { display: block; height: 100%; background: var(--red); transition: width .7s ease; }
.cap { display: flex; justify-content: space-between; padding-top: 9px; font-size: 9px; color: var(--grey); }

.plate { position: relative; flex: 1; aspect-ratio: 3/2; background: #000; overflow: hidden; cursor: crosshair; }
.plateImg, .plateReveal { object-fit: cover; transition: opacity .45s ease; }
.plateReveal { opacity: 0; }
.plate:hover .plateImg { opacity: 0; }
.plate:hover .plateReveal { opacity: 1; }
.tag { position: absolute; top: 13px; left: 13px; z-index: 3; font-size: 9px; color: #fff;
  background: rgba(0,0,0,.5); padding: 5px 9px; }
```

- [ ] **Step 3: Додати в `app/page.tsx`**

Додати `<Gallery />` після `<Hero />` (імпорт з `@/components/Gallery/Gallery`).

- [ ] **Step 4: Візуальна перевірка**

Run: `npm run dev`
Expected: на мобільній ширині — слайдер сам перемикається кожні ~2.8 с з кросфейдом, прогрес-смужка рухається. На десктопі — два фото поруч, при наведенні кадр кросфейдить на Чемерова.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: gallery with auto-slider and hover diptych"
```

---

### Task 8: OrderBar (CTA) і контекст чекауту

**Files:**
- Create: `components/Checkout/CheckoutProvider.tsx`
- Create: `components/OrderBar/OrderBar.tsx`
- Create: `components/OrderBar/OrderBar.module.css`
- Modify: `app/page.tsx`

- [ ] **Step 1: Створити `components/Checkout/CheckoutProvider.tsx`**

Контекст із станом модалки. Поки що модалку рендеримо заглушкою — реальну додамо в Task 12.

```tsx
'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface CheckoutContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

export function useCheckout() {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error('useCheckout must be used within CheckoutProvider');
  return ctx;
}

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <CheckoutContext.Provider value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
      {children}
    </CheckoutContext.Provider>
  );
}
```

- [ ] **Step 2: Створити `components/OrderBar/OrderBar.tsx`**

```tsx
'use client';

import { useCheckout } from '@/components/Checkout/CheckoutProvider';
import { PRODUCT } from '@/lib/config';
import styles from './OrderBar.module.css';

export function OrderBar() {
  const { open } = useCheckout();
  return (
    <section className={styles.wrap}>
      <p className={`${styles.spec} mono`}>
        HEAVYWEIGHT COTTON · 100% БАВОВНА · OVERSIZE · ОДИН РОЗМІР
      </p>
      <button className={`${styles.cta} poster`} onClick={open}>
        Замовити — {PRODUCT.price}&nbsp;₴
      </button>
    </section>
  );
}
```

- [ ] **Step 3: Створити `components/OrderBar/OrderBar.module.css`**

Портувати з `.dSpec` / `.dCta` / `.pCta` макета.
```css
.wrap { background: var(--bg); }
.spec { display: flex; justify-content: center; gap: 24px; flex-wrap: wrap;
  padding: 14px 20px 32px; font-size: 11px; color: var(--grey); }
.cta {
  display: block; width: 100%; border: none; cursor: pointer;
  background: var(--red); color: #fff;
  font-size: clamp(28px, 5vw, 48px); padding: 30px 20px;
  transition: background .25s;
}
.cta:hover { background: var(--ink); }
/* На мобільному CTA закріплена донизу */
@media (max-width: 767px) {
  .cta { position: fixed; bottom: 0; left: 0; right: 0; z-index: 35;
    font-size: 17px; padding: 20px; }
  .spec { padding-bottom: 24px; }
}
```
У `app/globals.css` додати `body { padding-bottom: 64px; }` лише для мобільного через media query, щоб закріплена кнопка не перекривала футер:
```css
@media (max-width: 767px) { body { padding-bottom: 60px; } }
```

- [ ] **Step 4: Підключити в `app/page.tsx`**

Обгорнути вміст у `<CheckoutProvider>` і додати `<OrderBar />` після `<Gallery />`:
```tsx
import { CheckoutProvider } from '@/components/Checkout/CheckoutProvider';
import { OrderBar } from '@/components/OrderBar/OrderBar';
// ...
export default function Home() {
  return (
    <CheckoutProvider>
      <main>
        <Header />
        <Hero />
        <Gallery />
        <OrderBar />
      </main>
    </CheckoutProvider>
  );
}
```

- [ ] **Step 5: Візуальна перевірка**

Run: `npm run dev`
Expected: рядок специфікації + червона кнопка. Десктоп — широка кнопка, інвертується в чорну при наведенні. Мобайл — кнопка прибита донизу екрана. Клік поки нічого не робить (модалка — Task 12).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: order bar, CTA and checkout context"
```

---

### Task 9: Футер

**Files:**
- Create: `components/Footer/Footer.tsx`
- Create: `components/Footer/Footer.module.css`
- Modify: `app/page.tsx`

- [ ] **Step 1: Створити `components/Footer/Footer.tsx`**

```tsx
import Link from 'next/link';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <span className="mono">ДИМНА СУМІШ © 2026</span>
      <nav className={styles.links}>
        <Link href="/offer" className="mono">Публічна оферта</Link>
        <Link href="/returns" className="mono">Умови повернення</Link>
      </nav>
      <span className="mono">НОВА ПОШТА · WAYFORPAY</span>
    </footer>
  );
}
```

- [ ] **Step 2: Створити `components/Footer/Footer.module.css`**

```css
.footer {
  display: flex; flex-wrap: wrap; gap: 12px 24px;
  justify-content: space-between; align-items: center;
  padding: 22px 24px; background: var(--bg);
  border-top: 1.5px solid var(--ink);
  font-size: 9px; color: var(--grey);
}
.links { display: flex; gap: 20px; }
.links a:hover { color: var(--red); }
@media (min-width: 768px) { .footer { padding: 22px 40px; } }
```

- [ ] **Step 3: Додати `<Footer />` останнім у `<main>` у `app/page.tsx`**

- [ ] **Step 4: Візуальна перевірка**

Run: `npm run dev`
Expected: мінімальний футер; посилання «Публічна оферта» / «Умови повернення» наводяться червоним (сторінки поки 404 — Task 11).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: footer with legal links"
```

---

## Phase 2 — Юридичні сторінки

### Task 10: Сторінки оферти та повернення

**Files:**
- Create: `components/Legal/LegalPage.tsx`
- Create: `components/Legal/LegalPage.module.css`
- Create: `app/offer/page.tsx`
- Create: `app/returns/page.tsx`

- [ ] **Step 1: Створити `components/Legal/LegalPage.tsx`**

```tsx
import Link from 'next/link';
import styles from './LegalPage.module.css';

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className={styles.page}>
      <Link href="/" className={`${styles.back} mono`}>← На головну</Link>
      <h1 className={`${styles.title} display`}>{title}</h1>
      <article className={styles.body}>{children}</article>
    </main>
  );
}
```

- [ ] **Step 2: Створити `components/Legal/LegalPage.module.css`**

```css
.page { max-width: 760px; margin: 0 auto; padding: 80px 24px 100px; }
.back { font-size: 10px; color: var(--grey); }
.back:hover { color: var(--red); }
.title { font-size: clamp(30px, 6vw, 56px); margin: 20px 0 32px; }
.body { font-size: 15px; line-height: 1.7; }
.body h2 { font-size: 18px; margin: 28px 0 10px; }
.body p { margin-bottom: 12px; }
```

- [ ] **Step 3: Створити `app/offer/page.tsx`**

```tsx
import { LegalPage } from '@/components/Legal/LegalPage';

export const metadata = { title: 'Публічна оферта — Sasha Chemerov' };

export default function OfferPage() {
  return (
    <LegalPage title="Публічна оферта">
      <p>
        Текст публічної оферти надає клієнт/юрист. Документ обовʼязковий для
        підключення платіжного шлюзу WayForPay.
      </p>
      <h2>1. Загальні положення</h2>
      <p>[Контент від клієнта]</p>
      <h2>2. Предмет договору</h2>
      <p>[Контент від клієнта]</p>
      <h2>3. Оплата та доставка</h2>
      <p>[Контент від клієнта]</p>
    </LegalPage>
  );
}
```

- [ ] **Step 4: Створити `app/returns/page.tsx`**

```tsx
import { LegalPage } from '@/components/Legal/LegalPage';

export const metadata = { title: 'Умови повернення — Sasha Chemerov' };

export default function ReturnsPage() {
  return (
    <LegalPage title="Умови повернення">
      <p>Текст умов повернення надає клієнт/юрист.</p>
      <h2>1. Строк повернення</h2>
      <p>[Контент від клієнта]</p>
      <h2>2. Порядок повернення</h2>
      <p>[Контент від клієнта]</p>
    </LegalPage>
  );
}
```
Примітка: реальний юридичний текст підставляє клієнт. Структура сторінок і маршрути — готові.

- [ ] **Step 5: Візуальна перевірка**

Run: `npm run dev`, відкрити `/offer` і `/returns`.
Expected: обидві сторінки відкриваються, посилання з футера працюють, кнопка «← На головну» повертає.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: legal pages (offer, returns)"
```

---

## Phase 3 — Чекаут-модалка (UI)

### Task 11: Каркас модалки

**Files:**
- Create: `components/Checkout/CheckoutModal.tsx`
- Create: `components/Checkout/CheckoutModal.module.css`
- Modify: `components/Checkout/CheckoutProvider.tsx`

- [ ] **Step 1: Створити `components/Checkout/CheckoutModal.tsx`**

Поки що — порожня оболонка (шторка/панель) із заголовком, ✕ і слотом для форми.

```tsx
'use client';

import { useCheckout } from './CheckoutProvider';
import styles from './CheckoutModal.module.css';

export function CheckoutModal() {
  const { isOpen, close } = useCheckout();
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={close}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.grab} />
        <div className={styles.scroll}>
          <div className={styles.head}>
            <span className={`${styles.title} display`}>Оформлення</span>
            <button className={styles.x} onClick={close} aria-label="Закрити">✕</button>
          </div>
          {/* CheckoutForm — Task 13 */}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Створити `components/Checkout/CheckoutModal.module.css`**

Портувати з `.sheet` / `.panel` макета `modal-mock.html`. Інверсія: тло `--ink`, текст білий.
```css
.overlay { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.55); }
.panel {
  position: fixed; background: var(--ink); color: #fff;
  display: flex; flex-direction: column;
}
/* мобайл — шторка знизу */
.panel { left: 0; right: 0; bottom: 0; top: 40px; border-radius: 24px 24px 0 0; }
.grab { width: 38px; height: 4px; background: #3a3a3a; border-radius: 3px; margin: 9px auto 2px; }
.scroll { flex: 1; overflow-y: auto; padding: 8px 22px 26px; }
/* десктоп — бічна панель справа */
@media (min-width: 768px) {
  .panel { top: 0; left: auto; width: 432px; border-radius: 0; }
  .grab { display: none; }
  .scroll { padding: 30px 34px 34px; }
}
.head { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 17px; }
.x { width: 30px; height: 30px; background: none; border: 1.5px solid #444;
  color: #9a9a9a; cursor: pointer; }
```

- [ ] **Step 3: Рендерити модалку в `CheckoutProvider`**

У `CheckoutProvider.tsx` імпортувати `CheckoutModal` і рендерити її всередині провайдера після `{children}`:
```tsx
import { CheckoutModal } from './CheckoutModal';
// ...у JSX, всередині Provider:
{children}
<CheckoutModal />
```

- [ ] **Step 4: Візуальна перевірка**

Run: `npm run dev`, натиснути «Замовити».
Expected: мобайл — чорна шторка виїжджає знизу, закриває майже весь екран; десктоп — чорна панель справа. ✕ і клік по затемненню — закривають.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: checkout modal shell"
```

---

### Task 12: Форма чекауту

**Files:**
- Create: `components/Checkout/CheckoutForm.tsx`
- Modify: `components/Checkout/CheckoutModal.tsx`
- Modify: `components/Checkout/CheckoutModal.module.css`

- [ ] **Step 1: Створити `components/Checkout/CheckoutForm.tsx`**

Форма з полями (без `NovaPoshtaPicker` поки — буде Task 14, тут місто/відділення звичайними `input`). Кнопка оплати поки `disabled` із текстом — реальну дію додамо в Task 18.

```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PRODUCT } from '@/lib/config';
import type { CheckoutInput } from '@/lib/types';
import styles from './CheckoutModal.module.css';

const EMPTY: CheckoutInput = { fullName: '', phone: '', email: '', city: '', cityRef: '', warehouse: '' };

export function CheckoutForm() {
  const [data, setData] = useState<CheckoutInput>(EMPTY);
  const set = (k: keyof CheckoutInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }));

  const valid =
    data.fullName.trim().length > 2 &&
    /^\+?\d{9,15}$/.test(data.phone.replace(/\s/g, '')) &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email) &&
    data.city.trim().length > 0 &&
    data.warehouse.trim().length > 0;

  return (
    <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
      <div className={styles.order}>
        <Image src="/front.jpg" alt="" width={54} height={54} className={styles.thumb} />
        <div className={styles.orderInfo}>
          <div className={styles.orderName}>{PRODUCT.name}</div>
          <div className={`${styles.orderMeta} mono`}>OVERSIZE · ОДИН РОЗМІР · ×1</div>
        </div>
        <div className={`${styles.orderPrice} poster`}>{PRODUCT.price}&nbsp;₴</div>
      </div>

      <fieldset className={styles.block}>
        <legend className={`${styles.legend} mono`}>01 — Хто ти</legend>
        <Field label="Прізвище та ім'я" value={data.fullName} onChange={set('fullName')} />
        <Field label="Телефон" value={data.phone} onChange={set('phone')} type="tel" inputMode="tel" />
        <Field label="E-mail" value={data.email} onChange={set('email')} type="email"
          hint="сюди WayForPay надішле фіскальний чек" />
      </fieldset>

      <fieldset className={styles.block}>
        <legend className={`${styles.legend} mono`}>02 — Куди везти</legend>
        <Field label="Місто" value={data.city} onChange={set('city')} />
        <Field label="Відділення / поштомат Нової Пошти" value={data.warehouse} onChange={set('warehouse')} />
      </fieldset>

      <button type="submit" className={styles.pay} disabled={!valid}>
        ОПЛАТИТИ КАРТОЮ
        <span className={`${styles.payWp} mono`}>WAYFORPAY · APPLE PAY · GOOGLE PAY</span>
      </button>
    </form>
  );
}

function Field(props: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; inputMode?: 'tel' | 'email' | 'text'; hint?: string;
}) {
  return (
    <label className={styles.field}>
      <span className={`${styles.fieldLabel} mono`}>{props.label}</span>
      <input
        className={styles.input}
        type={props.type ?? 'text'}
        inputMode={props.inputMode}
        value={props.value}
        onChange={props.onChange}
      />
      {props.hint && <span className={`${styles.fieldHint} mono`}>{props.hint}</span>}
    </label>
  );
}
```

- [ ] **Step 2: Додати стилі форми в `CheckoutModal.module.css`**

Портувати з `.m-order` / `.fld` / `.m-pay` макета `modal-mock.html`:
```css
.form { margin-top: 6px; }
.order { display: flex; gap: 13px; align-items: center; padding: 14px 0;
  border-top: 1px solid #2a2a2a; border-bottom: 1px solid #2a2a2a; }
.thumb { object-fit: cover; flex: none; }
.orderInfo { flex: 1; min-width: 0; }
.orderName { font-size: 12px; font-weight: 600; }
.orderMeta { font-size: 8.5px; color: var(--grey); margin-top: 4px; }
.orderPrice { font-size: 22px; }
.block { border: none; margin-top: 24px; }
.legend { font-size: 10px; color: #fff; margin-bottom: 16px; }
.field { display: block; margin-bottom: 20px; }
.fieldLabel { font-size: 9px; color: var(--grey); display: block; margin-bottom: 9px; }
.input { width: 100%; background: none; border: none; border-bottom: 1.5px solid #5a5a5a;
  padding-bottom: 9px; font-size: 15px; color: #fff; font-family: inherit; }
.input:focus { outline: none; border-color: var(--red); }
.fieldHint { font-size: 8px; color: #6a6a6a; margin-top: 8px; display: block; }
.pay { width: 100%; background: #fff; color: var(--ink); border: none; cursor: pointer;
  font-family: var(--font-oswald); font-weight: 700; text-transform: uppercase;
  font-size: 20px; padding: 19px; margin-top: 28px;
  display: flex; flex-direction: column; align-items: center; gap: 2px; }
.pay:disabled { opacity: .45; cursor: not-allowed; }
.payWp { font-weight: 400; font-size: 9px; color: #555; }
```

- [ ] **Step 3: Підключити форму в `CheckoutModal.tsx`**

Імпортувати `CheckoutForm` і вставити замість коментаря `{/* CheckoutForm */}`.

- [ ] **Step 4: Візуальна перевірка**

Run: `npm run dev`, відкрити модалку.
Expected: видно зведення замовлення, два блоки полів, поля — лише підкреслення (без рамок), активне підсвічене червоним. Кнопка «Оплатити» неактивна, поки форма невалідна; стає активною при коректних даних.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: checkout form with validation"
```

---

### Task 13: NovaPoshtaPicker (UI з заглушкою даних)

**Files:**
- Create: `components/Checkout/NovaPoshtaPicker.tsx`
- Modify: `components/Checkout/CheckoutForm.tsx`
- Modify: `components/Checkout/CheckoutModal.module.css`

- [ ] **Step 1: Створити `components/Checkout/NovaPoshtaPicker.tsx`**

Поле з автопідказкою. Дані тягне з `/api/novaposhta` (роут створюється в Task 16 — поки fetch може повертати порожньо, компонент має це переживати).

```tsx
'use client';

import { useState, useEffect } from 'react';
import styles from './CheckoutModal.module.css';

interface Option { label: string; ref: string; }

export function NovaPoshtaPicker({
  onSelect,
}: {
  onSelect: (city: string, cityRef: string, warehouse: string) => void;
}) {
  const [cityQuery, setCityQuery] = useState('');
  const [cities, setCities] = useState<Option[]>([]);
  const [city, setCity] = useState<Option | null>(null);
  const [warehouses, setWarehouses] = useState<Option[]>([]);
  const [warehouse, setWarehouse] = useState('');

  useEffect(() => {
    if (city || cityQuery.trim().length < 2) { setCities([]); return; }
    const id = setTimeout(async () => {
      const res = await fetch(`/api/novaposhta?type=cities&q=${encodeURIComponent(cityQuery)}`);
      const json = await res.json();
      setCities(json.items ?? []);
    }, 250);
    return () => clearTimeout(id);
  }, [cityQuery, city]);

  useEffect(() => {
    if (!city) return;
    fetch(`/api/novaposhta?type=warehouses&ref=${encodeURIComponent(city.ref)}`)
      .then((r) => r.json())
      .then((j) => setWarehouses(j.items ?? []));
  }, [city]);

  return (
    <>
      <label className={styles.field}>
        <span className={`${styles.fieldLabel} mono`}>Місто</span>
        <input
          className={styles.input}
          value={city ? city.label : cityQuery}
          onChange={(e) => { setCity(null); setWarehouse(''); setCityQuery(e.target.value); }}
        />
        {!city && cities.length > 0 && (
          <ul className={styles.ac}>
            {cities.map((c) => (
              <li key={c.ref} className={styles.acItem}
                onClick={() => { setCity(c); setCities([]); onSelect(c.label, c.ref, ''); }}>
                {c.label}
              </li>
            ))}
          </ul>
        )}
      </label>

      <label className={styles.field}>
        <span className={`${styles.fieldLabel} mono`}>Відділення / поштомат Нової Пошти</span>
        <select
          className={styles.input}
          value={warehouse}
          disabled={!city}
          onChange={(e) => { setWarehouse(e.target.value); if (city) onSelect(city.label, city.ref, e.target.value); }}
        >
          <option value="">{city ? 'Оберіть зі списку' : 'Спочатку оберіть місто'}</option>
          {warehouses.map((w) => <option key={w.ref} value={w.label}>{w.label}</option>)}
        </select>
      </label>
    </>
  );
}
```

- [ ] **Step 2: Додати стилі автопідказки в `CheckoutModal.module.css`**

```css
.ac { position: absolute; left: 0; right: 0; top: 100%; margin-top: 2px;
  background: #161616; border: 1px solid #303030; z-index: 5; list-style: none;
  max-height: 180px; overflow-y: auto; }
.acItem { padding: 10px 12px; font-size: 13px; color: #cfcfcf; cursor: pointer;
  border-bottom: 1px solid #242424; }
.acItem:hover { background: #1f1f1f; color: #fff; }
```
Також переконатися, що `.field` має `position: relative;` — додати, якщо немає.

- [ ] **Step 3: Замінити поля «Місто»/«Відділення» в `CheckoutForm.tsx` на `<NovaPoshtaPicker />`**

У блоці «02 — Куди везти» замість двох `<Field>` вставити:
```tsx
<NovaPoshtaPicker
  onSelect={(city, cityRef, warehouse) => setData((d) => ({ ...d, city, cityRef, warehouse }))}
/>
```
Додати імпорт `NovaPoshtaPicker`.

- [ ] **Step 4: Візуальна перевірка**

Run: `npm run dev`
Expected: поле «Місто» приймає введення; список відділень заблокований, поки місто не обране. (Реальні дані запрацюють після Task 16 — зараз підказки можуть бути порожні, помилок у консолі бути не повинно.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: nova poshta picker component"
```

---

## Phase 4 — Інтеграції (бекенд)

### Task 14: lib/wayforpay — підписи (TDD)

**Files:**
- Create: `lib/wayforpay.ts`
- Create: `lib/__tests__/wayforpay.test.ts`

- [ ] **Step 1: Написати тест `lib/__tests__/wayforpay.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { hmacMd5, purchaseSignature, callbackSignature, responseSignature } from '../wayforpay';

const SECRET = 'flk3409refn54t54t*FNJRET';

describe('hmacMd5', () => {
  it('produces a 32-char hex digest', () => {
    expect(hmacMd5(SECRET, 'a;b;c')).toMatch(/^[a-f0-9]{32}$/);
  });
  it('is deterministic', () => {
    expect(hmacMd5(SECRET, 'x')).toBe(hmacMd5(SECRET, 'x'));
  });
});

describe('purchaseSignature', () => {
  it('joins fields with semicolons and expands product arrays', () => {
    const sig = purchaseSignature(SECRET, {
      merchantAccount: 'test_merch',
      merchantDomainName: 'isusneisus.com',
      orderReference: 'DROP01-1',
      orderDate: 1000,
      amount: 2200,
      currency: 'UAH',
      productName: ['Tee'],
      productCount: [1],
      productPrice: [2200],
    });
    expect(sig).toMatch(/^[a-f0-9]{32}$/);
    // підпис рядка зібраний у відомому порядку
    const expected = hmacMd5(SECRET,
      'test_merch;isusneisus.com;DROP01-1;1000;2200;UAH;Tee;1;2200');
    expect(sig).toBe(expected);
  });
});

describe('callbackSignature', () => {
  it('builds signature from callback fields', () => {
    const sig = callbackSignature(SECRET, {
      merchantAccount: 'test_merch', orderReference: 'DROP01-1', amount: 2200,
      currency: 'UAH', authCode: '123', cardPan: '44**11',
      transactionStatus: 'Approved', reasonCode: 1100,
    });
    expect(sig).toBe(hmacMd5(SECRET,
      'test_merch;DROP01-1;2200;UAH;123;44**11;Approved;1100'));
  });
});

describe('responseSignature', () => {
  it('signs orderReference;status;time', () => {
    expect(responseSignature(SECRET, 'DROP01-1', 'accept', 1700))
      .toBe(hmacMd5(SECRET, 'DROP01-1;accept;1700'));
  });
});
```

- [ ] **Step 2: Запустити тест — переконатися, що падає**

Run: `npm test`
Expected: FAIL — модуль `../wayforpay` не існує.

- [ ] **Step 3: Реалізувати `lib/wayforpay.ts`**

```typescript
import { createHmac } from 'crypto';

/** HMAC-MD5 hex — формат підпису WayForPay. */
export function hmacMd5(secret: string, data: string): string {
  return createHmac('md5', secret).update(data, 'utf8').digest('hex');
}

interface PurchaseFields {
  merchantAccount: string;
  merchantDomainName: string;
  orderReference: string;
  orderDate: number;
  amount: number;
  currency: string;
  productName: string[];
  productCount: number[];
  productPrice: number[];
}

/** Підпис форми оплати: поля через ";", масиви товарів розгорнуті. */
export function purchaseSignature(secret: string, f: PurchaseFields): string {
  const parts: (string | number)[] = [
    f.merchantAccount, f.merchantDomainName, f.orderReference, f.orderDate,
    f.amount, f.currency,
    ...f.productName, ...f.productCount, ...f.productPrice,
  ];
  return hmacMd5(secret, parts.join(';'));
}

interface CallbackFields {
  merchantAccount: string;
  orderReference: string;
  amount: number;
  currency: string;
  authCode: string;
  cardPan: string;
  transactionStatus: string;
  reasonCode: number;
}

/** Підпис, яким WayForPay підписує колбек — для перевірки автентичності. */
export function callbackSignature(secret: string, f: CallbackFields): string {
  return hmacMd5(secret, [
    f.merchantAccount, f.orderReference, f.amount, f.currency,
    f.authCode, f.cardPan, f.transactionStatus, f.reasonCode,
  ].join(';'));
}

/** Підпис нашої відповіді на колбек. */
export function responseSignature(secret: string, orderReference: string, status: string, time: number): string {
  return hmacMd5(secret, [orderReference, status, time].join(';'));
}
```

- [ ] **Step 4: Запустити тести — переконатися, що проходять**

Run: `npm test`
Expected: PASS — усі тести `wayforpay` зелені.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: wayforpay signature helpers"
```

---

### Task 15: lib/novaposhta та роут проксі

**Files:**
- Create: `lib/novaposhta.ts`
- Create: `lib/__tests__/novaposhta.test.ts`
- Create: `app/api/novaposhta/route.ts`

- [ ] **Step 1: Написати тест `lib/__tests__/novaposhta.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { mapCities, mapWarehouses } from '../novaposhta';

describe('mapCities', () => {
  it('maps NP settlement payload to options', () => {
    const raw = [{ Present: 'Львів, Львівська обл.', Ref: 'ref-1' }];
    expect(mapCities(raw)).toEqual([{ label: 'Львів, Львівська обл.', ref: 'ref-1' }]);
  });
  it('returns empty array for missing input', () => {
    expect(mapCities(undefined)).toEqual([]);
  });
});

describe('mapWarehouses', () => {
  it('maps NP warehouse payload to options', () => {
    const raw = [{ Description: 'Відділення №1', Ref: 'wh-1' }];
    expect(mapWarehouses(raw)).toEqual([{ label: 'Відділення №1', ref: 'wh-1' }]);
  });
});
```

- [ ] **Step 2: Запустити тест — переконатися, що падає**

Run: `npm test`
Expected: FAIL — `../novaposhta` не існує.

- [ ] **Step 3: Реалізувати `lib/novaposhta.ts`**

```typescript
export interface NpOption { label: string; ref: string; }

const NP_ENDPOINT = 'https://api.novaposhta.ua/v2.0/json/';

export function mapCities(raw: unknown): NpOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c: { Present?: string; Description?: string; Ref: string }) => ({
    label: c.Present ?? c.Description ?? '',
    ref: c.Ref,
  }));
}

export function mapWarehouses(raw: unknown): NpOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((w: { Description: string; Ref: string }) => ({
    label: w.Description,
    ref: w.Ref,
  }));
}

/** Пошук населених пунктів за частиною назви. */
export async function searchCities(apiKey: string, query: string): Promise<NpOption[]> {
  const res = await fetch(NP_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey, modelName: 'Address', calledMethod: 'searchSettlements',
      methodProperties: { CityName: query, Limit: '8' },
    }),
  });
  const json = await res.json();
  const addresses = json?.data?.[0]?.Addresses;
  return mapCities(addresses);
}

/** Список відділень/поштоматів для населеного пункту. */
export async function listWarehouses(apiKey: string, settlementRef: string): Promise<NpOption[]> {
  const res = await fetch(NP_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey, modelName: 'Address', calledMethod: 'getWarehouses',
      methodProperties: { SettlementRef: settlementRef },
    }),
  });
  const json = await res.json();
  return mapWarehouses(json?.data);
}
```

- [ ] **Step 4: Запустити тести — переконатися, що проходять**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Створити роут `app/api/novaposhta/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { searchCities, listWarehouses } from '@/lib/novaposhta';
import { requireEnv } from '@/lib/config';

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type');
  const apiKey = requireEnv('NOVAPOSHTA_API_KEY');

  try {
    if (type === 'cities') {
      const q = req.nextUrl.searchParams.get('q') ?? '';
      return NextResponse.json({ items: await searchCities(apiKey, q) });
    }
    if (type === 'warehouses') {
      const ref = req.nextUrl.searchParams.get('ref') ?? '';
      return NextResponse.json({ items: await listWarehouses(apiKey, ref) });
    }
    return NextResponse.json({ error: 'unknown type' }, { status: 400 });
  } catch {
    return NextResponse.json({ items: [] }, { status: 502 });
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: nova poshta proxy and client"
```

---

### Task 16: lib/telegram — формат і надсилання (TDD)

**Files:**
- Create: `lib/telegram.ts`
- Create: `lib/__tests__/telegram.test.ts`

- [ ] **Step 1: Написати тест `lib/__tests__/telegram.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { formatOrderMessage } from '../telegram';

describe('formatOrderMessage', () => {
  it('includes all order fields', () => {
    const msg = formatOrderMessage({
      orderReference: 'DROP01-9',
      fullName: 'Чемеров Олександр',
      phone: '+380671234567',
      email: 'sasha@mail.com',
      city: 'Львів',
      warehouse: 'Відділення №1',
      amount: 2200,
    });
    expect(msg).toContain('DROP01-9');
    expect(msg).toContain('Чемеров Олександр');
    expect(msg).toContain('+380671234567');
    expect(msg).toContain('sasha@mail.com');
    expect(msg).toContain('Львів');
    expect(msg).toContain('Відділення №1');
    expect(msg).toContain('2200');
  });
});
```

- [ ] **Step 2: Запустити тест — переконатися, що падає**

Run: `npm test`
Expected: FAIL — `../telegram` не існує.

- [ ] **Step 3: Реалізувати `lib/telegram.ts`**

```typescript
interface OrderMessage {
  orderReference: string;
  fullName: string;
  phone: string;
  email: string;
  city: string;
  warehouse: string;
  amount: number;
}

/** HTML-повідомлення для чату менеджерів. */
export function formatOrderMessage(o: OrderMessage): string {
  return [
    '🛒 <b>Нове замовлення</b>',
    `<b>№:</b> ${o.orderReference}`,
    `<b>Товар:</b> too much яром too much долиною`,
    `<b>Сума:</b> ${o.amount} ₴`,
    '',
    `<b>Покупець:</b> ${o.fullName}`,
    `<b>Телефон:</b> ${o.phone}`,
    `<b>E-mail:</b> ${o.email}`,
    '',
    `<b>Доставка:</b> ${o.city}, ${o.warehouse}`,
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

- [ ] **Step 4: Запустити тести — переконатися, що проходять**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: telegram order notification"
```

---

### Task 17: Роут створення платежу `/api/checkout`

**Files:**
- Create: `app/api/checkout/route.ts`
- Create: `lib/__tests__/checkout-validate.test.ts`
- Create: `lib/validate.ts`

- [ ] **Step 1: Написати тест валідації `lib/__tests__/checkout-validate.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { validateCheckout } from '../validate';

const ok = {
  fullName: 'Чемеров Олександр', phone: '+380671234567', email: 'a@b.com',
  city: 'Львів', cityRef: 'ref-1', warehouse: 'Відділення №1',
};

describe('validateCheckout', () => {
  it('accepts a valid payload', () => {
    expect(validateCheckout(ok).ok).toBe(true);
  });
  it('rejects bad email', () => {
    expect(validateCheckout({ ...ok, email: 'nope' }).ok).toBe(false);
  });
  it('rejects short name', () => {
    expect(validateCheckout({ ...ok, fullName: 'X' }).ok).toBe(false);
  });
  it('rejects missing warehouse', () => {
    expect(validateCheckout({ ...ok, warehouse: '' }).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Запустити тест — переконатися, що падає**

Run: `npm test`
Expected: FAIL — `../validate` не існує.

- [ ] **Step 3: Реалізувати `lib/validate.ts`**

```typescript
import type { CheckoutInput } from './types';

export function validateCheckout(input: Partial<CheckoutInput>): { ok: boolean; reason?: string } {
  if (!input.fullName || input.fullName.trim().length < 3) return { ok: false, reason: 'fullName' };
  if (!input.phone || !/^\+?\d{9,15}$/.test(input.phone.replace(/\s/g, ''))) return { ok: false, reason: 'phone' };
  if (!input.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) return { ok: false, reason: 'email' };
  if (!input.city || !input.city.trim()) return { ok: false, reason: 'city' };
  if (!input.warehouse || !input.warehouse.trim()) return { ok: false, reason: 'warehouse' };
  return { ok: true };
}
```

- [ ] **Step 4: Запустити тести — переконатися, що проходять**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Реалізувати `app/api/checkout/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { purchaseSignature } from '@/lib/wayforpay';
import { validateCheckout } from '@/lib/validate';
import { PRODUCT, SITE_URL, requireEnv } from '@/lib/config';
import type { CheckoutInput, WayForPayParams } from '@/lib/types';

export async function POST(req: NextRequest) {
  const input = (await req.json()) as Partial<CheckoutInput>;

  const check = validateCheckout(input);
  if (!check.ok) {
    return NextResponse.json({ error: `invalid:${check.reason}` }, { status: 400 });
  }

  const merchantAccount = requireEnv('WAYFORPAY_MERCHANT_ACCOUNT');
  const merchantDomainName = requireEnv('WAYFORPAY_MERCHANT_DOMAIN');
  const secret = requireEnv('WAYFORPAY_SECRET_KEY');

  const orderReference = `DROP01-${Date.now()}`;
  const orderDate = Math.floor(Date.now() / 1000);
  const [lastName, ...firstParts] = input.fullName!.trim().split(/\s+/);

  const base = {
    merchantAccount, merchantDomainName, orderReference, orderDate,
    amount: PRODUCT.price, currency: PRODUCT.currency,
    productName: [PRODUCT.name], productCount: [1], productPrice: [PRODUCT.price],
  };

  const params: WayForPayParams & { serviceUrl: string; returnUrl: string } = {
    ...base,
    merchantSignature: purchaseSignature(secret, base),
    clientFirstName: firstParts.join(' ') || '-',
    clientLastName: lastName,
    clientEmail: input.email!,
    clientPhone: input.phone!.replace(/\s/g, ''),
    language: 'UA',
    serviceUrl: `${SITE_URL}/api/wayforpay-callback`,
    returnUrl: SITE_URL,
  };

  return NextResponse.json(params);
}
```

- [ ] **Step 6: Перевірити збірку**

Run: `npm run build`
Expected: успішно.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: checkout route creates wayforpay payment params"
```

---

### Task 18: Підключити віджет WayForPay до форми

**Files:**
- Modify: `components/Checkout/CheckoutForm.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Підключити скрипт віджета в `app/layout.tsx`**

У `<body>` додати компонент `next/script` (імпорт `import Script from 'next/script'`):
```tsx
<body>
  {children}
  <Script src="https://secure.wayforpay.com/server/pay-widget.js" strategy="afterInteractive" />
</body>
```

- [ ] **Step 2: Додати тип віджета — створити `types/wayforpay-widget.d.ts`**

```typescript
interface WayforpayInstance {
  run(params: Record<string, unknown>): void;
}
interface Window {
  Wayforpay?: new () => WayforpayInstance;
}
```

- [ ] **Step 3: Реалізувати сабміт у `CheckoutForm.tsx`**

Замінити `onSubmit={(e) => e.preventDefault()}` на справжній обробник; додати стан `submitting`:
```tsx
const [submitting, setSubmitting] = useState(false);

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!valid || submitting) return;
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
    new window.Wayforpay().run(params);
  } catch {
    alert('Не вдалося почати оплату. Спробуйте ще раз.');
  } finally {
    setSubmitting(false);
  }
}
```
Кнопку: `disabled={!valid || submitting}`, текст — `submitting ? 'ЗАЧЕКАЙТЕ…' : 'ОПЛАТИТИ КАРТОЮ'`.

- [ ] **Step 4: Перевірити збірку**

Run: `npm run build`
Expected: успішно, без помилок типів.

- [ ] **Step 5: Візуальна перевірка**

Run: `npm run dev`, заповнити форму валідними даними, натиснути «Оплатити».
Expected: відкривається віджет WayForPay (у тестовому режимі — за наявності тестових ключів; без ключів буде помилка `Missing env var` — це нормально до Task 19).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: wire checkout form to wayforpay widget"
```

---

### Task 19: Колбек оплати `/api/wayforpay-callback`

**Files:**
- Create: `app/api/wayforpay-callback/route.ts`

- [ ] **Step 1: Реалізувати `app/api/wayforpay-callback/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { callbackSignature, responseSignature } from '@/lib/wayforpay';
import { formatOrderMessage, sendToTelegram } from '@/lib/telegram';
import { requireEnv } from '@/lib/config';

export async function POST(req: NextRequest) {
  const secret = requireEnv('WAYFORPAY_SECRET_KEY');
  const body = await req.json();

  // Перевірка автентичності колбеку
  const expected = callbackSignature(secret, {
    merchantAccount: body.merchantAccount,
    orderReference: body.orderReference,
    amount: body.amount,
    currency: body.currency,
    authCode: body.authCode,
    cardPan: body.cardPan,
    transactionStatus: body.transactionStatus,
    reasonCode: body.reasonCode,
  });

  if (expected === body.merchantSignature && body.transactionStatus === 'Approved') {
    try {
      const text = formatOrderMessage({
        orderReference: body.orderReference,
        fullName: `${body.clientLastName ?? ''} ${body.clientFirstName ?? ''}`.trim() || '—',
        phone: body.phone ?? body.clientPhone ?? '—',
        email: body.email ?? body.clientEmail ?? '—',
        city: body.deliveryCity ?? '—',
        warehouse: body.deliveryWarehouse ?? '—',
        amount: body.amount,
      });
      await sendToTelegram(requireEnv('TELEGRAM_BOT_TOKEN'), requireEnv('TELEGRAM_CHAT_ID'), text);
    } catch (err) {
      console.error('Telegram notify failed', err);
    }
  }

  // Обовʼязкова підписана відповідь WayForPay
  const time = Math.floor(Date.now() / 1000);
  return NextResponse.json({
    orderReference: body.orderReference,
    status: 'accept',
    time,
    signature: responseSignature(secret, body.orderReference, 'accept', time),
  });
}
```

Примітка: WayForPay не передає поля доставки Нової Пошти у колбеку. Щоб менеджери бачили місто/відділення, на етапі експлуатації варто зберігати дані замовлення за `orderReference` (напр., у Vercel KV) у роуті `/api/checkout` і читати їх тут. У межах MVP колбек надсилає те, що є; розширення зі сховищем — окреме завдання (див. спецификація, 8.4).

- [ ] **Step 2: Перевірити збірку**

Run: `npm run build`
Expected: успішно.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: wayforpay callback with telegram notification"
```

---

## Phase 5 — Реліз

### Task 20: Env, документація змінних, деплой

**Files:**
- Create: `.env.local.example`
- Modify: `README.md`

- [ ] **Step 1: Створити `.env.local.example`**

```
# WayForPay (кабінет merchant)
WAYFORPAY_MERCHANT_ACCOUNT=
WAYFORPAY_MERCHANT_DOMAIN=isusneisus.com
WAYFORPAY_SECRET_KEY=

# Nova Poshta API
NOVAPOSHTA_API_KEY=

# Telegram (бот + чат менеджерів)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Публічний URL сайту
NEXT_PUBLIC_SITE_URL=https://isusneisus.com
```

- [ ] **Step 2: Описати запуск у `README.md`**

Додати розділ: встановлення (`npm install`), копіювання `.env.local.example` → `.env.local` і заповнення, `npm run dev`, `npm test`, `npm run build`. Перелічити, де брати кожен ключ (кабінет WayForPay, кабінет Нової Пошти, @BotFather для токена бота, `getUpdates` для chat id).

- [ ] **Step 3: Перевірити повну збірку і тести**

Run: `npm run build && npm test`
Expected: збірка успішна, усі тести зелені.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: env example and readme"
```

- [ ] **Step 5: Деплой на Vercel**

```bash
npx vercel --prod
```
У налаштуваннях проєкту Vercel додати всі змінні з `.env.local.example` (із реальними значеннями). Привʼязати домен `isusneisus.com`. Після деплою — у кабінеті WayForPay вказати `serviceUrl` = `https://isusneisus.com/api/wayforpay-callback` і **увімкнути фіскалізацію (пРРО)**.

- [ ] **Step 6: Фінальна перевірка на проді**

Відкрити `https://isusneisus.com`, пройти тестову оплату (тестова картка WayForPay), перевірити: прийшов фіскальний чек на e-mail, у Telegram-чат менеджерів прийшло повідомлення про замовлення.

---

## Self-Review

**Покриття специфікації:**
- Концепція, single-page, 90% мобайл — Phase 1 (адаптив у кожному компоненті). ✓
- Палітра, типографіка — Task 3. ✓
- Хедер / Герой / Галерея / CTA / Футер — Tasks 5–9. ✓
- Юридичні сторінки `/offer`, `/returns` + посилання у футері — Tasks 9, 10. ✓
- Чекаут-модалка (шторка/панель, інверсія, поля, e-mail) — Tasks 11–13. ✓
- WayForPay (підпис, віджет, колбек, чек через пРРО) — Tasks 14, 17, 18, 19, 20. ✓
- Нова Пошта (автопідказка) — Tasks 13, 15. ✓
- Telegram-сповіщення менеджерам — Tasks 16, 19. ✓
- Стек Next.js/Vercel/SSG — Tasks 1, 20. ✓

**Відомі обмеження (не дефекти плану):**
- Кастомний леттеринг заголовка — стенд-ін Oswald; заміна на SVG — поза планом (актив за клієнтом).
- Поля доставки в колбеку WayForPay — у MVP не зберігаються; повноцінне рішення зі сховищем за `orderReference` описане в Task 19 як наступний крок.
- Юридичний текст сторінок — підставляє клієнт.

**Узгодженість типів:** `CheckoutInput`, `WayForPayParams` визначені в Task 4 і використані без розбіжностей у Tasks 13, 17, 18. Функції `purchaseSignature` / `callbackSignature` / `responseSignature` визначені в Task 14 і так само названі в Task 17, 19.
