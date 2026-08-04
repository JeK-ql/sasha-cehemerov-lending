import { SITE_URL } from './config';
import { variantKeys, type Product } from './products';
import { SOCIAL_LINKS } from './socials';

export const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'Sasha Chemerov × Димна Суміш',
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/logo.png`,
  sameAs: SOCIAL_LINKS.map((s) => s.url),
};

export function productLd(product: Product) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${SITE_URL}/#product-${product.id}`,
    name: product.name,
    sku: product.sku,
    // Бренд у товару свій: футболку випускає артист, педаль зібрала Kosko FX.
    brand: { '@type': 'Brand', name: product.brandName },
    image: product.ogImage ? [`${SITE_URL}${product.ogImage}`] : undefined,
    description: product.schemaDescription,
    // Розміри декларуємо лише там, де вибір справді є.
    size: product.showVariantPicker ? variantKeys(product) : undefined,
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}${product.path}`,
      priceCurrency: product.currency,
      price: String(product.price),
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
        returnFees: 'https://schema.org/ReturnShippingFees',
      },
      // Вартість доставки платить покупець за тарифами перевізника (оферта §5.3,
      // §6.2) — тому shippingRate тут свідомо відсутній.
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'UA' },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' },
          transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' },
        },
      },
    },
  };
}
