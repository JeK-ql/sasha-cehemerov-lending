import { describe, it, expect } from 'vitest';
import { checkoutSchema } from '../checkoutSchema';

const base = {
  fullName: 'Чемеров Олександр',
  phone: '+380671234567',
  email: 'a@b.com',
  quantity: 1,
  city: 'Львів',
  cityRef: 'ref-1',
  deliveryType: 'warehouse' as const,
  warehouse: 'Відділення №1',
  street: '',
  building: '',
  flat: '',
};

const courier = {
  ...base,
  deliveryType: 'courier' as const,
  warehouse: '',
  street: 'вул. Шевченка',
  building: '12',
};

describe('checkoutSchema', () => {
  it('accepts a valid warehouse order', () => {
    expect(checkoutSchema.safeParse(base).success).toBe(true);
  });
  it('accepts a valid courier order', () => {
    expect(checkoutSchema.safeParse(courier).success).toBe(true);
  });
  it('rejects a single-word name', () => {
    expect(checkoutSchema.safeParse({ ...base, fullName: 'Іван' }).success).toBe(false);
  });
  it('rejects a bad email', () => {
    expect(checkoutSchema.safeParse({ ...base, email: 'nope' }).success).toBe(false);
  });
  it('rejects a bad phone', () => {
    expect(checkoutSchema.safeParse({ ...base, phone: '123' }).success).toBe(false);
  });
  it('rejects quantity below 1', () => {
    expect(checkoutSchema.safeParse({ ...base, quantity: 0 }).success).toBe(false);
  });
  it('rejects a warehouse order with no warehouse', () => {
    expect(checkoutSchema.safeParse({ ...base, warehouse: '' }).success).toBe(false);
  });
  it('rejects a courier order with no street', () => {
    expect(checkoutSchema.safeParse({ ...courier, street: '' }).success).toBe(false);
  });
  it('rejects a courier order with no building', () => {
    expect(checkoutSchema.safeParse({ ...courier, building: '' }).success).toBe(false);
  });
  it('reports the Ukrainian message for a missing warehouse', () => {
    const res = checkoutSchema.safeParse({ ...base, warehouse: '' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toBe('Оберіть відділення або поштомат');
    }
  });
});
