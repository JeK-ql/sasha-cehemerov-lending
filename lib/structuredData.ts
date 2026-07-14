import { PRODUCT, SIZES, SITE_URL } from './config';
import { SOCIAL_LINKS } from './socials';

/** ASCII-імена, щоб URL у JSON-LD/og не містили сирої кирилиці. */
export const PRODUCT_IMAGE_WEBP = '/too-much-yarom-dolynoyu.webp';
export const PRODUCT_IMAGE_JPG = '/too-much-yarom-dolynoyu.jpg';

export const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'Sasha Chemerov × Димна Суміш',
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/logo.png`,
  sameAs: SOCIAL_LINKS.map((s) => s.url),
};

export const productLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  '@id': `${SITE_URL}/#product`,
  name: PRODUCT.name,
  sku: PRODUCT.sku,
  brand: { '@type': 'Brand', name: 'Sasha Chemerov × Димна Суміш' },
  image: [`${SITE_URL}${PRODUCT_IMAGE_WEBP}`],
  description:
    'Оверсайз-футболка "too much яром too much долиною" — лімітований дроп Sasha Chemerov × Димна Суміш.',
  size: [...SIZES],
  offers: {
    '@type': 'Offer',
    url: `${SITE_URL}/`,
    priceCurrency: PRODUCT.currency,
    price: String(PRODUCT.price),
    priceValidUntil: '2026-12-31',
    availability: 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/NewCondition',
    seller: { '@id': `${SITE_URL}/#organization` },
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'UA',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 14,
      returnMethod: 'https://schema.org/ReturnByMail',
      returnFees: 'https://schema.org/FreeReturn',
    },
    // Вартість доставки платить покупець за тарифами перевізника (оферта §5.3,
    // §6.2) — тому shippingRate тут свідомо відсутній.
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'UA' },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' },
        transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' },
      },
    },
  },
};
