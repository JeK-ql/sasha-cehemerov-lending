# Showcase: великі футболки + більший заголовок (мобільний) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перебудувати секцію `Showcase` так, щоб дві футболки стали великим діагональним колажем із перекриттям (кожна ≈¾ ширини екрана), а головний заголовок став помітно більшим із «too much» окремим читабельним рядком — з фокусом на мобільному форматі.

**Architecture:** Зміна лише в компоненті `Showcase` (один `.tsx` + один CSS-модуль). Контейнер футболок `.tees` стає позиційною сценою з фіксованим співвідношенням сторін; кожна футболка позиціюється абсолютно на 75% ширини сцени з діагональним зсувом і `z-index`. Заголовок переходить на компонування «підпис над словом» через зміну `.line` на колонку. Розміри керуються `clamp()` / `min()` з vh-складовою, щоб контент не обрізався на телефоні; жорсткий `overflow: hidden` знімається, аби короткі екрани могли м'яко скролитись.

**Tech Stack:** Next.js 16.2.6, React 19, CSS Modules, `next/image` (`fill`).

**Спец:** `docs/superpowers/specs/2026-05-22-showcase-bigger-tees-mobile-design.md`

> **Примітка щодо Next 16:** проєктний `AGENTS.md` попереджає, що це не звичний Next.js. Цей план не змінює API `next/image` — лишаються наявні пропси `fill` / `priority` / `sizes` / `className`. Якщо під час роботи виникне сумнів — звірся з `node_modules/next/dist/docs/`. Жодних серверних чи роутинг-змін тут немає.

---

## File Structure

- **Modify:** `components/Showcase/Showcase.tsx` — прибрати два `<figcaption>`; оновити атрибут `sizes` обох `<Image>` під нову ширину футболки (≈70vw на мобільному).
- **Modify:** `components/Showcase/Showcase.module.css` — переписати правила `.showcase`, `.title`, `.line`, `.small`, `.big`, `.tees`, `.tee`, `.teeFrame`, `.teeImg`, `.spec`; видалити правило `.cap`.

Інші файли (`page.module.css`, `Header`, `OrderBar`, `Footer`) **за замовчуванням не чіпаємо**. Task 2 містить умовний крок на випадок, якщо візуальна перевірка покаже потребу.

---

## Task 1: Перебудувати Showcase (розмітка + стилі)

**Files:**
- Modify: `components/Showcase/Showcase.tsx`
- Modify: `components/Showcase/Showcase.module.css`

Це чиста зміна верстки/стилів — юніт-тестів на візуальну розкладку в проєкті немає (`vitest` покриває лише логіку в `lib/`). Перевірка цього таска — успішний `next build`; візуальна перевірка — у Task 2.

- [ ] **Step 1: Замінити `components/Showcase/Showcase.tsx` повністю**

Прибрано обидва `<figcaption>` (числові підписи більше не потрібні на щільному колажі). Атрибут `sizes` оновлено: тепер кожна футболка ≈70vw на мобільному та ≈40vw на десктопі.

```tsx
import Image from 'next/image';
import styles from './Showcase.module.css';

export function Showcase() {
  return (
    <section className={styles.showcase}>
      <h1 className={styles.title}>
        <span className={styles.line}>
          <span className={`${styles.small} mono`}>too much</span>
          <span className={`${styles.big} display`}>яром</span>
        </span>
        <span className={styles.line}>
          <span className={`${styles.small} mono`}>too much</span>
          <span className={`${styles.big} ${styles.red} display`}>долиною</span>
        </span>
      </h1>

      <div className={styles.tees}>
        <figure className={styles.tee}>
          <div className={styles.teeFrame}>
            <Image
              src="/front-back-without-bg.png"
              alt="Футболка «too much яром too much долиною» — перед"
              fill
              priority
              sizes="(min-width: 768px) 40vw, 70vw"
              className={styles.teeImg}
            />
          </div>
        </figure>
        <figure className={styles.tee}>
          <div className={styles.teeFrame}>
            <Image
              src="/back-without-bg.png"
              alt="Футболка «too much яром too much долиною» — спина"
              fill
              priority
              sizes="(min-width: 768px) 40vw, 70vw"
              className={styles.teeImg}
            />
          </div>
        </figure>
      </div>

      <p className={`${styles.spec} mono`}>Oversize · 100% Бавовна · Heavyweight</p>
    </section>
  );
}
```

- [ ] **Step 2: Замінити `components/Showcase/Showcase.module.css` повністю**

`.line` стає колонкою (підпис над словом). `.tees` стає позиційною сценою `aspect-ratio: 4 / 5`; кожна `.tee` — `position: absolute`, `width: 75%`. Перед (`:first-child`) угорі-зліва, `z-index: 2`; спина (`:last-child`) внизу-справа, `z-index: 1`. `aspect-ratio: 4 / 5` сцени гарантує, що принт спини виходить нижче нижнього краю переду — обидва принти видно. `overflow: hidden` знято з `.showcase`; `justify-content: safe center` тримає вміст по центру, але за переповнення кладе його від верху (донизу), щоб нічого не ховалось під хедером. Правило `.cap` видалено.

```css
.showcase {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: safe center;
  gap: clamp(10px, 2.4vh, 28px);
  padding: clamp(12px, 2.4vh, 26px) clamp(10px, 4vw, 32px);
}

/* заголовок — «too much» окремим рядком над кожним словом */
.title {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: clamp(4px, 1.1vh, 14px);
}
.line {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.small {
  font-size: clamp(12px, 3.4vw, 18px);
  line-height: 1;
  letter-spacing: 0.22em;
  color: var(--ink);
  margin-bottom: clamp(2px, 0.7vh, 7px);
}
.big {
  font-size: clamp(38px, 9.5vw, 72px);
  line-height: 0.95;
  letter-spacing: -0.02em;
  color: var(--ink);
}
.red { color: var(--red); }

/* футболки — діагональний колаж: кожна 75% ширини сцени, перекриваються */
.tees {
  position: relative;
  flex: none;
  aspect-ratio: 4 / 5;
  width: min(88vw, 46vh, 560px);
}
.tee {
  position: absolute;
  width: 75%;
  margin: 0;
}
/* перед — угорі-зліва, спереду стоса */
.tee:first-child {
  top: 0;
  left: 0;
  z-index: 2;
}
/* спина — внизу-справа, визирає з-під переду */
.tee:last-child {
  bottom: 0;
  right: 0;
  z-index: 1;
}
.teeFrame {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
}
.teeImg {
  object-fit: contain;
  filter: drop-shadow(0 12px 28px rgba(0, 0, 0, 0.28));
}

.spec {
  flex: none;
  font-size: clamp(9px, 2vw, 11px);
  color: var(--grey);
  text-align: center;
}
```

- [ ] **Step 3: Зібрати проєкт — переконатись, що збірка проходить**

Run: `npm run build`
Expected: PASS — збірка завершується без помилок типів і лінту (`next build` запускає й перевірку типів, і ESLint).

- [ ] **Step 4: Commit**

```bash
git add components/Showcase/Showcase.tsx components/Showcase/Showcase.module.css
git commit -m "feat: rebuild Showcase — overlapping diagonal tees + larger headline"
```

---

## Task 2: Візуальна перевірка на мобільному та підбір розмірів

**Files:**
- Перевірка: `components/Showcase/Showcase.module.css` (за потреби — точкове підлаштування числових значень)
- Умовно: `app/page.module.css` (лише якщо перевірка покаже потребу)

Мета — переконатись, що на телефоні все відповідає затвердженому дизайну, і за потреби підлаштувати числові межі. Стартові значення в Task 1 розраховані під екран ≈390×844; на ширших/вужчих треба звірити очима.

- [ ] **Step 1: Запустити дев-сервер**

Run: `npm run dev`
Сервер підніметься на `http://localhost:3000` (Next за замовчуванням; якщо порт зайнятий — Next обере інший і напише його в консолі).

- [ ] **Step 2: Зробити скриншот мобільної версії**

Через Playwright (або DevTools device mode) відкрити `http://localhost:3000` з viewport **390×844** і зробити скриншот.

Перевірити очима за критеріями спеку:
- кожна футболка займає ≈¾ ширини екрана;
- футболки стоять по діагоналі й перекриваються; перед — вище і спереду, спина визирає з-під нього знизу-справа;
- **обидва принти повністю видно** — терновий вінець спереду й текстовий блок на спині не закриті;
- заголовок помітно більший за попередній; «TOO MUCH» читається окремим рядком над кожним словом, не губиться;
- футболки не обрізані за хедером і за закріпленою знизу кнопкою CTA.

- [ ] **Step 3: Зробити скриншот десктопної версії**

Відкрити `http://localhost:3000` з viewport **1280×800**, скриншот. Переконатись, що та сама діагональна розкладка лишається цілою й нічого не накладається помилково.

- [ ] **Step 4: За потреби підлаштувати розміри**

Якщо щось не сходиться — точково правити лише числа в `Showcase.module.css`:
- футболки **обрізані за хедером/CTA** або завеликі → зменшити vh-складову в `.tees { width: min(88vw, 46vh, 560px); }` (напр. `46vh` → `40vh`);
- футболки **замалі**, місця ще багато → збільшити vh-складову (напр. `46vh` → `52vh`);
- принт спини **частково сховано** під переднім → збільшити вертикальний рознос, змінивши співвідношення `.tees { aspect-ratio: 4 / 5; }` на «вище» (напр. `4 / 5` → `3 / 4`);
- заголовок **завеликий і пхає футболки** → знизити верхню межу `.big { font-size: clamp(38px, 9.5vw, 72px); }` (напр. `9.5vw` → `8.5vw`).

Якщо навіть після підлаштування на дуже низькому телефоні контент не вміщується — це очікувано: сторінка має м'яко скролитись (жорсткий `overflow: hidden` уже знято в Task 1). Додаткові зміни в `app/page.module.css` потрібні лише якщо виявиться, що сторінка **не** скролиться й контент ріжеться — тоді переконатись, що `.shell` не має фіксованої висоти чи `overflow: hidden` (зараз має лише `min-height: 100dvh` — скрол працює, змін не треба).

Після кожної правалки повторити Step 2-3, доки скриншоти не відповідатимуть критеріям.

- [ ] **Step 5: Фінальна збірка**

Run: `npm run build`
Expected: PASS — без помилок.

- [ ] **Step 6: Commit (лише якщо в Step 4 були зміни)**

```bash
git add components/Showcase/Showcase.module.css
git commit -m "fix: tune Showcase tee/headline sizing for mobile fit"
```

Якщо в Step 4 нічого не змінювалось — коміту не потрібно, Task 1 уже все зафіксував.

---

## Self-Review

**Spec coverage:**
- Футболки діагональним колажем із перекриттям, кожна ≈75% ширини, перед спереду й вище — Task 1, Step 2 (`.tees` / `.tee` / `z-index`).
- Лишаються ті самі дві футболки, без третього зображення — Task 1, Step 1 (розмітка незмінна за кількістю `<figure>`).
- Прибрати підписи «01 — Перед / 02 — Спина», лишити рядок специфікації — Task 1, Step 1 (прибрано `<figcaption>`), Step 2 (видалено `.cap`); `.spec` лишається.
- Заголовок: «too much» окремим рядком, читабельний, колір `--ink`, великі слова більші — Task 1, Step 2 (`.line` колонка, `.small`, `.big`).
- Односкрінний лендинг, футболки не обрізаються, м'який скрол на низьких екранах — Task 1, Step 2 (`safe center`, знято `overflow: hidden`, vh-складова в `min()`); Task 2 (перевірка й підлаштування).
- Десктоп лишається цілим — Task 2, Step 3.
- `npm run build` проходить — Task 1 Step 3, Task 2 Step 5.
- Шрифти не змінюються, Header/OrderBar/Footer/чекаут не чіпаються — план їх не торкається.

**Placeholder scan:** Повного коду наведено для обох файлів; числові підлаштування в Task 2 Step 4 подані як конкретні «якщо X → зміни Y на Z», не як «handle edge cases». Без TBD/TODO.

**Type consistency:** Імена класів CSS-модуля (`showcase`, `title`, `line`, `small`, `big`, `red`, `tees`, `tee`, `teeFrame`, `teeImg`, `spec`), що використані в `Showcase.tsx`, повністю збігаються з селекторами в `Showcase.module.css`. Клас `cap` видалено і з розмітки (нема `<figcaption>`), і зі стилів.
