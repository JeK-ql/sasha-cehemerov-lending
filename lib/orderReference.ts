import { randomBytes } from 'crypto';
import { PRODUCT_IDS, isProductId } from './products';

/**
 * Номер замовлення: `<PRODUCT_ID>-<unix ms><4 символи випадковості>`.
 *
 * Випадковий суфікс тут не для секретності, а проти колізій: чистий
 * Date.now() дає однаковий _id двом запитам в одну мілісекунду, і другий
 * покупець отримує 503 замість оплати.
 */
const SUFFIX_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const SUFFIX_LENGTH = 4;

export function newOrderReference(productId: string, now = Date.now()): string {
  const bytes = randomBytes(SUFFIX_LENGTH);
  let suffix = '';
  for (const b of bytes) suffix += SUFFIX_ALPHABET[b % SUFFIX_ALPHABET.length];
  return `${productId}-${now}${suffix}`;
}

/**
 * Формат наших номерів. Діапазон довжини покриває і старі суто-цифрові
 * номери (13 символів), і нові з суфіксом (17).
 */
export const ORDER_REF_RE = new RegExp(
  `^(${PRODUCT_IDS.join('|')})-[0-9a-z]{10,24}$`,
);

/** Товар за номером замовлення; null — номер не наш. */
export function productIdFromRef(ref: string): string | null {
  if (!ORDER_REF_RE.test(ref)) return null;
  const id = ref.slice(0, ref.indexOf('-'));
  return isProductId(id) ? id : null;
}
