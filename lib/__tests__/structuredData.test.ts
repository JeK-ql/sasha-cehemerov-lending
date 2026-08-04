import { describe, expect, it } from 'vitest';
import { organizationLd, productLd } from '../structuredData';
import { SOCIAL_LINKS } from '../socials';
import { PRODUCTS } from '../products';

describe('structuredData', () => {
  it('усі URL зображень Product — тільки ASCII (без сирої кирилиці)', () => {
    for (const url of productLd(PRODUCTS.DROP01).image ?? []) {
      expect(url).toMatch(/^https:\/\/[\x21-\x7E]+$/);
    }
  });

  it('shippingDetails не бреше про безкоштовну доставку', () => {
    expect(productLd(PRODUCTS.DROP01).offers.shippingDetails).not.toHaveProperty('shippingRate');
  });

  it('Organization має sameAs з усіх соцпрофілів', () => {
    expect(organizationLd.sameAs).toEqual(SOCIAL_LINKS.map((s) => s.url));
    expect(organizationLd.sameAs.length).toBeGreaterThan(0);
  });

  it('Offer має priceValidUntil у форматі ISO-дати', () => {
    expect(productLd(PRODUCTS.DROP01).offers.priceValidUntil).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('Product.size відповідає SIZES з конфігу', () => {
    expect(productLd(PRODUCTS.DROP01).size).toEqual(['МАЛЕНЬКИЙ', 'СЕРЕДНІЙ', 'ВЕЛИКИЙ']);
  });

  it('return policy does not falsely claim free returns', () => {
    expect(productLd(PRODUCTS.DROP01).offers.hasMerchantReturnPolicy.returnFees).toBe(
      'https://schema.org/ReturnShippingFees',
    );
  });

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
      // PEDAL01 на момент написання тесту вже отримав реальне ogImage
      // (комміт з фото педалі), тому тут — синтетичний товар без картинки,
      // щоб перевірити саме гілку `ogImage: null` у productLd.
      const productWithoutImage = { ...PRODUCTS.PEDAL01, ogImage: null };
      expect(productLd(productWithoutImage).image).toBeUndefined();
    });
  });
});
