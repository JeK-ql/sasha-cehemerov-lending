# Спека: SEO/UX-фікси лендінгу isusneisus.com

Дата: 2026-07-14 · Гілка: main · Статус: затверджено користувачем (усно в сесії).

## Звірка з main після мержа feature/multi-size-order (2026-07-14)

- Чекаут тепер **мульти-розмірний** (лічильники по розмірах, per-size позиції WayForPay,
  розбивка в Telegram). Напис "ONE SIZE (OVERSIZE)" у хедері тепер суперечить чекауту ще
  сильніше — фікс хедера став актуальнішим.
- Користувач уже зробив (незакомічено на момент звірки):
  - `og:image` і `Product.image` переключені з .jpg на `.webp` (160KB — розмір ОК),
    але імʼя файлу досі кириличне → проблема кодування URL у JSON-LD залишається;
  - `page.module.css`: сторінка більше не fixed — тепер скролиться (відео 100vh,
    футер під фолдом). На скоуп не впливає, але футер тепер видно тільки після скролу.
- Перевірено: вага 500 у IBM Plex Mono **ніде не використовується** (немає жодного
  `font-weight: 500`) — можна прибирати з підключення шрифту.
- Хедер, футер, title/meta, canonical /offer//returns, sameAs, shippingRate,
  next.config.ts, вага відео — все ще НЕ зроблено, скоуп спеки чинний.

## Контекст

SEO-аудит (8 напрямків, 2026-07-14) показав: сайт не проіндексований Google, головна має
23–27 слів видимого тексту, є критичні баги в canonical/schema і повністю відсутні
security-заголовки. Цей пакет — фікси, затверджені користувачем.

## Жорсткі обмеження (від користувача)

- **Жодних нових візуальних елементів на головній.** Ніякої скрол-секції, ніякого рядка з
  ціною біля кнопки. Можна тільки змінювати текст/вміст того, що вже існує (хедер, футер).
- Розміри в хедері на мобільному залишаються прихованими (`display:none` до 768px) — як зараз.
- Ціну в хедер НЕ додавати.
- Оригінал відео зберегти в репозиторії для порівняння.

## Зміни

### 1. Хедер — `components/Header/Header.tsx`

- Замінити текст `DROP 01 // ONE SIZE (OVERSIZE)` → `DROP 01 // МАЛЕНЬКИЙ · СЕРЕДНІЙ · ВЕЛИКИЙ`
  (значення збігаються з `SIZES` у `lib/config.ts`; самі значення в конфігу/чекауті не чіпати).
- Логотипу `<img src="/logo.png">` додати атрибути `width` і `height` (реальні пропорції
  495×140, масштабовані під height 40/50) — прибирає ризик CLS. Стилі не міняти.
- Більше нічого в хедері не чіпати (мобільна видимість `.drop` лишається як є).

### 2. Футер — `components/Footer/Footer.tsx` + `Footer.module.css` (варіант C)

Структура:

```
Публічна оферта        IG Саша · FB · IG Гурт        Умови повернення
                      +380… · email@…
```

- **Рядок 1**: grid `1fr auto 1fr` (як у хедері). Зліва «Публічна оферта», справа «Умови
  повернення», по центру 3 маленькі соцлінки:
  - Instagram Саші: https://www.instagram.com/sashachemerov/
  - Facebook Саші: https://www.facebook.com/sashachemerov/
  - Instagram гурту: https://www.instagram.com/dymnasumish.official/
  - Формат: **текстові мікролінки** (без іконок — відповідає типографічному стилю сайту),
    підписи розрізняють два Instagram: `IG Саша · FB Саша · IG Димна Суміш`.
    `target="_blank" rel="noopener"`, `aria-label` з повною назвою профілю.
- **Рядок 2**: один тихий рядок контактів `{SELLER.phone} · {SELLER.email}` (tel:/mailto:).
  Рендериться **тільки якщо** `SELLER_HAS_PLACEHOLDERS === false`.
- **Видалити** блок `.requisites` з трьома рядками (ФОП/РНОКПП/адреси). Повні реквізити
  залишаються лише в оферті §13 (`app/offer/page.tsx`) — це закриває вимоги закону
  «Про електронну комерцію» ст. 7 і модерацію WayForPay.
- Тап-зони: всім лінкам футера дати падінги так, щоб зона натискання була ≥44px по висоті
  (WCAG 2.5.8 / Fitts). Візуальний розмір шрифту: лінки 11px, контакти 10px.
- Стиль лишається: чорна плашка, KyivTypeSans Light, hover у `--red`.

### 3. Title + мета — `app/layout.tsx`, `app/offer/page.tsx`, `app/returns/page.tsx`

- `layout.tsx` title: `too much яром too much долиною — мерч Sasha Chemerov × Димна Суміш`.
- `layout.tsx` description розширити (~150 символів): додати «Лімітований дроп, 2600 ₴,
  доставка Новою Поштою по Україні» (формулювання уточнити при імплементації).
- `app/offer/page.tsx`: додати `description` (про оферту), `alternates: { canonical: '/offer' }`,
  власний `openGraph` (title/description/url).
- `app/returns/page.tsx`: те саме з `/returns`.
- Це фіксить критичний баг: зараз обидві сторінки успадковують canonical `/` з layout і
  ризикують вилетіти з індексу.

### 4. Schema JSON-LD — `app/layout.tsx`

- `Organization.sameAs`: масив із трьох соцпосилань (ті ж, що у футері).
- **Битий `Product.image`**: користувач уже переключив на
  `too-much-яром-too-much-долиною.webp` (160KB — розмір ОК), але імʼя кириличне —
  сирий не-ASCII URL у JSON-LD лишається проблемою для частини парсерів, а webp в
  `og:image` досі нестабільно підтримують месенджери/Facebook. Рішення:
  - зробити ASCII-копії: `public/too-much-yarom-dolynoyu.webp` (копія наявного webp,
    для JSON-LD) і `public/too-much-yarom-dolynoyu.jpg` (JPEG ~1200px, <300KB, для
    `og:image`/`twitter:image` — максимальна сумісність скраперів);
  - кириличні оригінали в `public/` не чіпати (jpg використовує thumbnail модалки).
  Оновити посилання в `productLd.image`, `openGraph.images`, `twitter.images`.
- **Видалити `shippingRate`** з `Offer.shippingDetails` (зараз бреше «0 грн», а по оферті
  доставку платить покупець за тарифами перевізника). `deliveryTime` лишити.
- Додати `Offer.priceValidUntil` (реальна дата кінця зобовʼязань по Drop 01; якщо невідома —
  кінець поточного року).

### 5. Security-заголовки — новий `next.config.ts`

Файлу зараз не існує. Створити з `headers()` для `/:path*`:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy` — базовий напрямок:
  `default-src 'self'; script-src 'self' 'unsafe-inline' https://secure.wayforpay.com; frame-src https://secure.wayforpay.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; connect-src 'self' https://secure.wayforpay.com; font-src 'self'`
  Точні директиви ДОПРАЦЮВАТИ під реальну поведінку WayForPay-віджета і Next.js
  (inline-скрипти Next вимагають 'unsafe-inline' або nonce). **CSP не мержити без ручного
  прогону чекаута** — віджет оплати найчастіша жертва суворого CSP.

### 6. LCP — `app/page.tsx` / `app/layout.tsx` + медіа

- Preload постера: `/video.jpg` як `<link rel="preload" as="image" fetchPriority="high">`
  (в App Router — через `ReactDOM.preload()` або link у layout).
- **Перекодувати `public/tshirt.mp4`**: ffmpeg, H.264, CRF ~28, до 1080p, без аудіо,
  ціль ≤2MB (зараз 4.4MB). Оригінал перемістити в `media-src/tshirt-original.mp4`
  (у репозиторії, ПОЗА `public/`, щоб не деплоївся) — для порівняння якості.
- Прибрати вагу 500 з IBM_Plex_Mono у `app/layout.tsx` (перевірено при звірці:
  `font-weight: 500` не зустрічається ніде в проєкті) — мінус 2 preload-файли.
- Опційно (безкоштовно при редагуванні schema): `Product.size = [...SIZES]` — тепер,
  коли чекаут мульти-розмірний, це просто відображення факту.

## Поза скоупом (свідомо)

- Видимий текстовий блок про товар на головній (користувач відмовився — «жодних нових
  елементів»). Наслідок: контент-тонкість головної (23 слова) не вирішується цим пакетом;
  індексація спиратиметься на title/meta/schema + сторінки оферти/повернень.
- Заповнення `lib/seller.ts` реальними даними ФОП — блокер деплою, дані має надати користувач.
- Google Search Console / запит індексації — поза кодом, робить користувач.
- FAQPage schema — не додаємо (Google не показує FAQ rich results для комерційних сайтів).
- Зміна значень `SIZES` у чекауті — не чіпаємо.

## Верифікація (перед «готово»)

- `npm run build` (або наявний build-скрипт) — зелений; lint — зелений; наявні тести
  (`lib/__tests__/`) — зелені.
- Локально: сторінка відкривається, відео грає, чекаут-модалка відкривається і форма
  валідна **з увімкненим CSP** (найважливіша перевірка пакета).
- Розмір нового `tshirt.mp4` ≤2MB, візуальна якість прийнятна (порівняти з оригіналом).
- `curl -I` нового зображення → 200; JSON-LD валідний (Rich Results Test після деплою).
- Після деплою: заголовки безпеки в відповіді, canonical на `/offer` = `/offer`.

## Індикатори успіху (без повторного аудиту)

- GSC: 3/3 сторінки проіндексовані (після подачі sitemap користувачем).
- Rich Results Test: Product без помилок (image 200).
- PageSpeed: LCP-елемент = постер, вага сторінки без відео-догруження < 3MB.
