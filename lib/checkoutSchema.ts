import { z } from 'zod';
import { SIZES, type Size } from './config';

/** Нормалізує телефон перед перевіркою: прибирає пробіли, дужки, дефіси. */
const normalizePhone = (v: string) => v.replace(/[\s()-]/g, '');

/** Кількість одного розміру: ціле, 0–10. Сумарні межі — у superRefine. */
const sizeCount = z.number().int().min(0).max(10);

/** Сумарна кількість штук у замовленні. */
export const totalQuantity = (sizes: Record<Size, number>): number =>
  SIZES.reduce((sum, s) => sum + sizes[s], 0);

/** Схема замовлення — спільна для клієнтської форми і /api/checkout. */
export const checkoutSchema = z
  .object({
    fullName: z
      .string()
      .refine(
        (v) => v.trim().split(/\s+/).filter(Boolean).length >= 2,
        "Вкажіть ім'я та прізвище",
      ),
    phone: z
      .string()
      .refine((v) => normalizePhone(v).startsWith('+'), 'Номер має починатися з «+» і коду країни')
      .refine((v) => /^\+\d{7,15}$/.test(normalizePhone(v)), 'Введіть 7–15 цифр після «+»'),
    email: z
      .string()
      .refine((v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Невірний e-mail'),
    sizes: z.object({
      МАЛЕНЬКИЙ: sizeCount,
      СЕРЕДНІЙ: sizeCount,
      ВЕЛИКИЙ: sizeCount,
    }),
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
    const total = totalQuantity(data.sizes as Record<Size, number>);
    if (total < 1) {
      ctx.addIssue({ code: 'custom', path: ['sizes'], message: 'Оберіть розмір' });
    } else if (total > 10) {
      ctx.addIssue({
        code: 'custom',
        path: ['sizes'],
        message: 'Максимум 10 штук у замовленні',
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
