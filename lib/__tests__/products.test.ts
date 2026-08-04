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

describe('бренд товару', () => {
  it('у кожного товару свій бренд: футболку випускає артист, педаль зібрала Kosko FX', () => {
    expect(PRODUCTS.DROP01.brandName).toBe('Sasha Chemerov × Димна Суміш');
    expect(PRODUCTS.PEDAL01.brandName).toBe('Kosko FX × Саша Чемеров');
  });
});
