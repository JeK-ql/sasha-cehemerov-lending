import { describe, expect, it } from 'vitest';
import { organizationLd, productLd } from '../structuredData';
import { SOCIAL_LINKS } from '../socials';

describe('structuredData', () => {
  it('усі URL зображень Product — тільки ASCII (без сирої кирилиці)', () => {
    for (const url of productLd.image) {
      expect(url).toMatch(/^https:\/\/[\x21-\x7E]+$/);
    }
  });

  it('shippingDetails не бреше про безкоштовну доставку', () => {
    expect(productLd.offers.shippingDetails).not.toHaveProperty('shippingRate');
  });

  it('Organization має sameAs з трьох соцпрофілів', () => {
    expect(organizationLd.sameAs).toEqual(SOCIAL_LINKS.map((s) => s.url));
    expect(organizationLd.sameAs).toHaveLength(3);
  });

  it('Offer має priceValidUntil у форматі ISO-дати', () => {
    expect(productLd.offers.priceValidUntil).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('Product.size відповідає SIZES з конфігу', () => {
    expect(productLd.size).toEqual(['МАЛЕНЬКИЙ', 'СЕРЕДНІЙ', 'ВЕЛИКИЙ']);
  });

  it('return policy does not falsely claim free returns', () => {
    expect(productLd.offers.hasMerchantReturnPolicy.returnFees).toBe(
      'https://schema.org/ReturnShippingFees',
    );
  });
});
