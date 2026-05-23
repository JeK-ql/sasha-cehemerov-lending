import { z } from 'zod';

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
      .refine((v) => v.startsWith('+380'), 'Введіть номер у форматі +380…')
      .refine((v) => /^\+380\d{9}$/.test(v.replace(/\s/g, '')), 'Введіть 9 цифр після +380'),
    email: z
      .string()
      .refine((v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Невірний e-mail'),
    quantity: z.number().int().min(1, 'Кількість має бути не менше 1'),
    city: z.string().min(1, 'Оберіть місто'),
    cityRef: z.string(),
    deliveryType: z.enum(['warehouse', 'courier']),
    warehouse: z.string(),
    street: z.string(),
    building: z.string(),
    flat: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.deliveryType === 'warehouse') {
      if (!data.warehouse.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['warehouse'],
          message: 'Оберіть відділення або поштомат',
        });
      }
    } else {
      if (!data.street.trim()) {
        ctx.addIssue({ code: 'custom', path: ['street'], message: 'Вкажіть вулицю' });
      }
      if (!data.building.trim()) {
        ctx.addIssue({ code: 'custom', path: ['building'], message: 'Вкажіть будинок' });
      }
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type DeliveryType = CheckoutInput['deliveryType'];
