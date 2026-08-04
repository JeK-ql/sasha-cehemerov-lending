import { z } from 'zod';
import { DEFAULT_PRODUCT_ID, getProduct, variantKeys, type Product } from './products';

/** Нормалізує телефон перед перевіркою: прибирає пробіли, дужки, дефіси. */
const normalizePhone = (v: string) => v.replace(/[\s()-]/g, '');

/** Сумарна кількість штук у замовленні. */
export const totalQuantity = (sizes: Record<string, number>): number =>
  Object.values(sizes).reduce((sum, n) => sum + n, 0);

/** Стартовий стан кількостей: одноваріантний товар одразу має 1 шт. */
export function emptySizes(product: Product): Record<string, number> {
  if (!product.showVariantPicker) return { [product.variants[0].key]: 1 };
  return Object.fromEntries(variantKeys(product).map((k) => [k, 0]));
}

/** Схема замовлення — спільна для клієнтської форми і /api/checkout. */
export const checkoutSchema = z
  .object({
    fullName: z
      .string()
      .refine(
        (v) => v.trim().split(/\s+/).filter(Boolean).length >= 2,
        "Вкажіть ім'я та прізвище",
      ),
    phone: z.string().refine((v) => {
      const p = normalizePhone(v);
      // Міжнародний із «+» (7–15 цифр) або український у будь-якому звичному
      // записі: 0XXXXXXXXX, 380XXXXXXXXX, 80XXXXXXXXX.
      return (
        /^\+\d{7,15}$/.test(p) ||
        /^380\d{9}$/.test(p) ||
        /^80\d{9}$/.test(p) ||
        /^0\d{9}$/.test(p)
      );
    }, 'Невірний телефон. Приклади: +380671234567, 0671234567, 380671234567'),
    email: z
      .string()
      .refine((v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Невірний e-mail'),
    productId: z.string().optional(),
    sizes: z.record(
      z.string(),
      z
        .number()
        .int('Кількість має бути цілим числом')
        .min(0, 'Кількість не може бути відʼємною'),
    ),
    deliveryMode: z.enum(['np', 'other']),
    // --- Нова Пошта ---
    city: z.string(),
    cityRef: z.string(),
    deliveryType: z.enum(['warehouse', 'courier']),
    warehouse: z.string(),
    // --- «Інше»: Укрпошта по Україні та за кордон ---
    country: z.string(),
    street: z.string(),
    building: z.string(),
    flat: z.string(),
    zip: z.string(),
  })
  .superRefine((data, ctx) => {
    const product = getProduct(data.productId ?? DEFAULT_PRODUCT_ID);
    if (!product) {
      ctx.addIssue({ code: 'custom', path: ['productId'], message: 'Невідомий товар' });
      return;
    }

    // Набір ключів мусить ТОЧНО збігатися з варіантами товару. Не просто
    // «без зайвих»: пропущений ключ означав би, що клієнт і сервер по-різному
    // уявляють товар, а totalQuantity мовчки прочитала б undefined.
    const expected = variantKeys(product);
    const got = Object.keys(data.sizes);
    const sameKeys =
      got.length === expected.length && expected.every((k) => k in data.sizes);
    if (!sameKeys) {
      ctx.addIssue({
        code: 'custom',
        path: ['sizes'],
        message: 'Невірний набір варіантів товару',
      });
      return;
    }

    const total = totalQuantity(data.sizes);
    if (total < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['sizes'],
        message: product.showVariantPicker ? 'Оберіть розмір' : 'Товар недоступний',
      });
    } else if (total > product.maxPerOrder) {
      ctx.addIssue({
        code: 'custom',
        path: ['sizes'],
        message: `Максимум ${product.maxPerOrder} шт. у замовленні`,
      });
    }

    if (data.deliveryMode === 'np') {
      if (!data.city.trim()) {
        ctx.addIssue({ code: 'custom', path: ['city'], message: 'Оберіть місто' });
      }
      if (data.deliveryType === 'warehouse' && !data.warehouse.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['warehouse'],
          message: 'Оберіть відділення або поштомат',
        });
      }
      if (data.deliveryType === 'courier') {
        if (!data.street.trim()) {
          ctx.addIssue({ code: 'custom', path: ['street'], message: 'Вкажіть вулицю' });
        }
        if (!data.building.trim()) {
          ctx.addIssue({ code: 'custom', path: ['building'], message: 'Вкажіть будинок' });
        }
      }
    } else {
      if (!data.country.trim()) {
        ctx.addIssue({ code: 'custom', path: ['country'], message: 'Вкажіть країну' });
      }
      if (!data.city.trim()) {
        ctx.addIssue({ code: 'custom', path: ['city'], message: 'Вкажіть місто' });
      }
      if (!data.street.trim()) {
        ctx.addIssue({ code: 'custom', path: ['street'], message: 'Вкажіть вулицю' });
      }
      if (!data.building.trim()) {
        ctx.addIssue({ code: 'custom', path: ['building'], message: 'Вкажіть будинок' });
      }
      if (!data.zip.trim()) {
        ctx.addIssue({ code: 'custom', path: ['zip'], message: 'Вкажіть поштовий індекс' });
      }
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type DeliveryType = CheckoutInput['deliveryType'];
export type DeliveryMode = CheckoutInput['deliveryMode'];

/**
 * Стан клієнтської форми. З переходом на `sizes` (усі нулі — валідна форма
 * типу, помилку дає superRefine) окремий widened-тип не потрібен; назва
 * збережена, бо її імпортують CheckoutForm/OtherDeliveryFields.
 */
export type CheckoutFormState = CheckoutInput;
