import { describe, it, expect } from 'vitest';
import { checkoutSchema } from '../checkoutSchema';
import { SIZES } from '../products';

const npOrder = {
  fullName: 'Чемеров Олександр',
  phone: '+380671234567',
  email: 'a@b.com',
  sizes: { МАЛЕНЬКИЙ: 0, СЕРЕДНІЙ: 1, ВЕЛИКИЙ: 0 },
  deliveryMode: 'np' as const,
  city: 'Львів',
  cityRef: 'ref-1',
  deliveryType: 'warehouse' as const,
  warehouse: 'Відділення №1',
  country: 'Україна',
  street: '',
  building: '',
  flat: '',
  zip: '',
};

const otherOrder = {
  ...npOrder,
  deliveryMode: 'other' as const,
  cityRef: '',
  warehouse: '',
  country: 'Польща',
  city: 'Kraków',
  street: 'ul. Floriańska',
  building: '12',
  flat: '3',
  zip: '31-019',
};

describe('checkoutSchema - базові поля', () => {
  it('accepts a valid NP order', () => {
    expect(checkoutSchema.safeParse(npOrder).success).toBe(true);
  });
  it('rejects a single-word name', () => {
    expect(checkoutSchema.safeParse({ ...npOrder, fullName: 'Іван' }).success).toBe(false);
  });
  it('rejects a bad email', () => {
    expect(checkoutSchema.safeParse({ ...npOrder, email: 'nope' }).success).toBe(false);
  });
});

describe('checkoutSchema - телефон (міжнародний + українські форми)', () => {
  const PHONE_MSG = 'Невірний телефон. Приклади: +380671234567, 0671234567, 380671234567';

  it('accepts a Ukrainian +380 number', () => {
    expect(checkoutSchema.safeParse({ ...npOrder, phone: '+380671234567' }).success).toBe(true);
  });
  it('accepts a foreign number', () => {
    expect(checkoutSchema.safeParse({ ...npOrder, phone: '+48123456789' }).success).toBe(true);
  });
  it('accepts spaces and dashes inside the number', () => {
    expect(checkoutSchema.safeParse({ ...npOrder, phone: '+48 123-456-789' }).success).toBe(true);
  });
  it.each([
    ['0XXXXXXXXX (local)', '0938187709'],
    ['380XXXXXXXXX (no +)', '380671234567'],
    ['80XXXXXXXXX (old 8-prefix)', '80671234567'],
    ['local with spaces/dashes', '093 818-77-09'],
  ] as const)('accepts a Ukrainian number: %s', (_label, phone) => {
    expect(checkoutSchema.safeParse({ ...npOrder, phone }).success).toBe(true);
  });
  it('rejects a bare number that matches no accepted form', () => {
    const res = checkoutSchema.safeParse({ ...npOrder, phone: '123456789012' });
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === 'phone');
      expect(issue?.message).toBe(PHONE_MSG);
    }
  });
  it('rejects a too-short international number', () => {
    const res = checkoutSchema.safeParse({ ...npOrder, phone: '+38012' });
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === 'phone');
      expect(issue?.message).toBe(PHONE_MSG);
    }
  });
  it('rejects a too-long number', () => {
    expect(checkoutSchema.safeParse({ ...npOrder, phone: '+1234567890123456' }).success).toBe(false);
  });
  it('rejects a Ukrainian local number of the wrong length', () => {
    expect(checkoutSchema.safeParse({ ...npOrder, phone: '093818770' }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...npOrder, phone: '09381877099' }).success).toBe(false);
  });
});

describe('checkoutSchema - розміри (мультирозмірне замовлення)', () => {
  it('accepts a single size with quantity', () => {
    expect(
      checkoutSchema.safeParse({
        ...npOrder,
        sizes: { МАЛЕНЬКИЙ: 0, СЕРЕДНІЙ: 3, ВЕЛИКИЙ: 0 },
      }).success,
    ).toBe(true);
  });
  it('accepts a mix of sizes in one order', () => {
    expect(
      checkoutSchema.safeParse({
        ...npOrder,
        sizes: { МАЛЕНЬКИЙ: 2, СЕРЕДНІЙ: 1, ВЕЛИКИЙ: 0 },
      }).success,
    ).toBe(true);
  });
  it('rejects an all-zero order with the size message', () => {
    const res = checkoutSchema.safeParse({
      ...npOrder,
      sizes: { МАЛЕНЬКИЙ: 0, СЕРЕДНІЙ: 0, ВЕЛИКИЙ: 0 },
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === 'sizes');
      expect(issue?.message).toBe('Оберіть розмір');
    }
  });
  it('rejects more than 10 items total', () => {
    const res = checkoutSchema.safeParse({
      ...npOrder,
      sizes: { МАЛЕНЬКИЙ: 5, СЕРЕДНІЙ: 5, ВЕЛИКИЙ: 1 },
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === 'sizes');
      expect(issue?.message).toBe('Максимум 10 штук у замовленні');
    }
  });
  it('rejects a negative count', () => {
    expect(
      checkoutSchema.safeParse({
        ...npOrder,
        sizes: { МАЛЕНЬКИЙ: -1, СЕРЕДНІЙ: 2, ВЕЛИКИЙ: 0 },
      }).success,
    ).toBe(false);
  });
  it('rejects a fractional count', () => {
    expect(
      checkoutSchema.safeParse({
        ...npOrder,
        sizes: { МАЛЕНЬКИЙ: 1.5, СЕРЕДНІЙ: 0, ВЕЛИКИЙ: 0 },
      }).success,
    ).toBe(false);
  });
  it('rejects a missing size key', () => {
    expect(
      checkoutSchema.safeParse({
        ...npOrder,
        sizes: { МАЛЕНЬКИЙ: 1, СЕРЕДНІЙ: 0 },
      }).success,
    ).toBe(false);
  });
  it('keeps schema keys in sync with SIZES', () => {
    // Якщо в SIZES додасться четвертий розмір, а обʼєкт sizes у схемі - ні,
    // totalQuantity почне читати undefined і валідація «зʼїде» мовчки.
    // checkoutSchema - ZodEffects (через superRefine), тому .shape бере
    // innerType().
    expect(Object.keys(checkoutSchema.innerType().shape.sizes.shape)).toEqual([...SIZES]);
  });
});

describe('checkoutSchema - режим «Нова Пошта»', () => {
  it('rejects a missing city', () => {
    const res = checkoutSchema.safeParse({ ...npOrder, city: '' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.find((i) => i.path[0] === 'city')?.message).toBe('Оберіть місто');
    }
  });
  it('rejects a missing warehouse with the Ukrainian message', () => {
    const res = checkoutSchema.safeParse({ ...npOrder, warehouse: '' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.find((i) => i.path[0] === 'warehouse')?.message).toBe(
        'Оберіть відділення або поштомат',
      );
    }
  });
  it('does not require country/street/zip in NP mode', () => {
    expect(
      checkoutSchema.safeParse({ ...npOrder, country: '', street: '', zip: '' }).success,
    ).toBe(true);
  });
});

describe('checkoutSchema - режим «Інше» (Укрпошта/світ)', () => {
  it('accepts a valid international order', () => {
    expect(checkoutSchema.safeParse(otherOrder).success).toBe(true);
  });
  it('does not require cityRef/warehouse in other mode', () => {
    expect(checkoutSchema.safeParse({ ...otherOrder, cityRef: '', warehouse: '' }).success).toBe(true);
  });
  it.each([
    ['country', 'Вкажіть країну'],
    ['city', 'Вкажіть місто'],
    ['street', 'Вкажіть вулицю'],
    ['building', 'Вкажіть будинок'],
    ['zip', 'Вкажіть поштовий індекс'],
  ] as const)('rejects a missing %s', (field, message) => {
    const res = checkoutSchema.safeParse({ ...otherOrder, [field]: '' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.find((i) => i.path[0] === field)?.message).toBe(message);
    }
  });
  it('accepts an empty flat (optional)', () => {
    expect(checkoutSchema.safeParse({ ...otherOrder, flat: '' }).success).toBe(true);
  });
});
