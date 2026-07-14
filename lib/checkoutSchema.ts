import { z } from 'zod';
import { SIZES, type Size } from './config';

/** Нормалізує телефон перед перевіркою: прибирає пробіли, дужки, дефіси. */
const normalizePhone = (v: string) => v.replace(/[\s()-]/g, '');

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
    quantity: z.number().int().min(1, 'Кількість має бути не менше 1'),
    size: z.enum(SIZES, { message: 'Оберіть розмір' }),
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
 * Стан клієнтської форми: збігається зі схемою, але розмір може бути ще не
 * обраний (''). safeParse такого стану дає помилку «Оберіть розмір».
 */
export type CheckoutFormState = Omit<CheckoutInput, 'size'> & { size: Size | '' };
