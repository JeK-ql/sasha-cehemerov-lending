import { describe, it, expect } from 'vitest';
import { checkoutSchema } from '../checkoutSchema';

const npOrder = {
  fullName: 'Чемеров Олександр',
  phone: '+380671234567',
  email: 'a@b.com',
  quantity: 1,
  size: 'СЕРЕДНІЙ' as const,
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

describe('checkoutSchema — базові поля', () => {
  it('accepts a valid NP order', () => {
    expect(checkoutSchema.safeParse(npOrder).success).toBe(true);
  });
  it('rejects a single-word name', () => {
    expect(checkoutSchema.safeParse({ ...npOrder, fullName: 'Іван' }).success).toBe(false);
  });
  it('rejects a bad email', () => {
    expect(checkoutSchema.safeParse({ ...npOrder, email: 'nope' }).success).toBe(false);
  });
  it('rejects quantity below 1', () => {
    expect(checkoutSchema.safeParse({ ...npOrder, quantity: 0 }).success).toBe(false);
  });
});

describe('checkoutSchema — телефон (міжнародний)', () => {
  it('accepts a Ukrainian number', () => {
    expect(checkoutSchema.safeParse({ ...npOrder, phone: '+380671234567' }).success).toBe(true);
  });
  it('accepts a foreign number', () => {
    expect(checkoutSchema.safeParse({ ...npOrder, phone: '+48123456789' }).success).toBe(true);
  });
  it('accepts spaces and dashes inside the number', () => {
    expect(checkoutSchema.safeParse({ ...npOrder, phone: '+48 123-456-789' }).success).toBe(true);
  });
  it('rejects a number without leading +', () => {
    const res = checkoutSchema.safeParse({ ...npOrder, phone: '380671234567' });
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === 'phone');
      expect(issue?.message).toBe('Номер має починатися з «+» і коду країни');
    }
  });
  it('rejects a too-short number', () => {
    const res = checkoutSchema.safeParse({ ...npOrder, phone: '+38012' });
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === 'phone');
      expect(issue?.message).toBe('Введіть 7–15 цифр після «+»');
    }
  });
  it('rejects a too-long number', () => {
    expect(checkoutSchema.safeParse({ ...npOrder, phone: '+1234567890123456' }).success).toBe(false);
  });
});

describe('checkoutSchema — розмір', () => {
  it('rejects a missing size with the Ukrainian message', () => {
    const res = checkoutSchema.safeParse({ ...npOrder, size: '' });
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === 'size');
      expect(issue?.message).toBe('Оберіть розмір');
    }
  });
  it('rejects an unknown size', () => {
    expect(checkoutSchema.safeParse({ ...npOrder, size: 'M' }).success).toBe(false);
  });
  it.each(['МАЛЕНЬКИЙ', 'СЕРЕДНІЙ', 'ВЕЛИКИЙ'] as const)('accepts size %s', (size) => {
    expect(checkoutSchema.safeParse({ ...npOrder, size }).success).toBe(true);
  });
});

describe('checkoutSchema — режим «Нова Пошта»', () => {
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

describe('checkoutSchema — режим «Інше» (Укрпошта/світ)', () => {
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
