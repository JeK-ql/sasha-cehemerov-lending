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

/**
 * Кольорова тема чекаут-модалки і ThankYou-екрана. 'ink' — чорнильна тема
 * головної; 'acid' — кислотно-лаймова айдентика сторінки педалі. Живе в
 * реєстрі, бо айдентика — властивість товару, а не сторінки, що відкрила
 * модалку.
 */
export type CheckoutTheme = 'ink' | 'acid';

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
  /** Бренд для schema.org. Педаль зібрала інша компанія, ніж футболку. */
  brandName: string;
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
  checkoutTheme: CheckoutTheme;
  /**
   * Леттеринг замість текстової назви в підсумку замовлення (айдентика
   * сторінки педалі). Не заданий — рендериться текст `name`.
   */
  nameImage?: { src: string; width: number; height: number };
  /** Фото в модалці замовлення; null — файлу ще немає. */
  thumb: string | null;
  /**
   * CSS aspect-ratio рамки під `thumb`. Не заданий — рамка квадратна
   * (значення з .thumbBtn). Задавай, коли фото не квадратне і кроп по
   * центру зрізав би композицію.
   */
  thumbAspect?: string;
  /** Додаткові фото товару для модалки замовлення. */
  gallery?: string[];
  /** Картинка для JSON-LD і OpenGraph; null — файлу ще немає. */
  ogImage: string | null;
  /** Опис для schema.org. */
  schemaDescription: string;
  /** Абзаци опису в модалці. Порожньо — блок не рендериться. */
  description?: string[];
  /** Таблиця «ключ — значення» в модалці. */
  specs?: ProductSpec[];
  /**
   * Категорійний лейбл у рядку підсумку замовлення (напр. «OVERSIZE»).
   * Показується перед обраними варіантами; не заданий — рядок починається
   * одразу з варіантів (або, для одноваріантного товару, з ціни).
   */
  metaLabel?: string;
}

export const PRODUCTS: Record<ProductId, Product> = {
  DROP01: {
    id: 'DROP01',
    path: '/',
    name: 'too much яром too much долиною',
    brandName: 'Sasha Chemerov × Димна Суміш',
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
    metaLabel: 'OVERSIZE',
    media: { kind: 'video', src: '/tshirt.mp4', poster: '/video.jpg' },
    checkoutTheme: 'ink',
    thumb: '/too-much-яром-too-much-долиною.webp',
    ogImage: '/too-much-yarom-dolynoyu.jpg',
    schemaDescription:
      'Оверсайз-футболка "too much яром too much долиною" — лімітований дроп Sasha Chemerov × Димна Суміш.',
  },
  PEDAL01: {
    id: 'PEDAL01',
    path: '/pedal',
    name: 'Димна Суміш',
    brandName: 'Kosko FX × Саша Чемеров',
    paymentName: 'Педаль Kosko FX × Саша Чемеров - Димна Суміш',
    headerCaption: 'ДИМНА СУМІШ // LIMITED 10',
    price: 13000,
    currency: 'UAH',
    sku: 'PEDAL01-DYMNA-SUMISH',
    variants: [{ key: 'STANDARD', label: 'STANDARD' }],
    maxPerOrder: 1,
    showVariantPicker: false,
    media: { kind: 'image', src: '/pedal-front.webp' },
    checkoutTheme: 'acid',
    // Той самий файл, що в хедері сторінки — назва в чекауті лишається
    // намальованою, як усе на /pedal.
    nameImage: { src: '/zine-title.png', width: 1440, height: 338 },
    // Одне фото в модалці — і свідомо НЕ те, що вже стоїть хіро сторінки:
    // покупець щойно прогорнув фронтальний кадр, повторювати його немає сенсу.
    // Комплектний кадр показує, що саме приїде в коробці. Галереї немає: три
    // ракурси однієї педалі відсували форму замовлення за екран.
    thumb: '/pedal-kit.webp',
    thumbAspect: '4 / 5',
    ogImage: '/pedal-front.jpg',
    schemaDescription:
      'Фузз-дисторшн "Димна Суміш" — лімітована колаборація Kosko FX × Саша Чемеров на основі схеми EarthQuaker Devices Hizumitas. Ручна робота, тираж 10 штук.',
    // Модалка замовлення — крок оплати, а не сторінка каталогу: довгий опис
    // відсовував форму за екран. Лишаємо один абзац і шість характеристик,
    // які реально впливають на рішення купити.
    description: [
      'Фузз-дисторшн на основі схеми EQD Hizumitas (вінтажний Elk Big Muff Sustainar): щільний пружний низ — тримає і бас-гітару, підняті середні — не провалюється в міксі. Ручна робота, тираж 10 екземплярів.',
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
