import { describe, it, expect } from 'vitest';
import { validateCheckout } from '../validateCheckout';
import type { CheckoutFormState } from '../checkoutSchema';

const valid: CheckoutFormState = {
  fullName: 'Іван Іванов',
  phone: '+380671234567',
  email: 'a@b.com',
  sizes: { МАЛЕНЬКИЙ: 0, СЕРЕДНІЙ: 1, ВЕЛИКИЙ: 0 },
  deliveryMode: 'np',
  city: 'Львів',
  cityRef: 'ref-1',
  deliveryType: 'warehouse',
  warehouse: 'Відділення №1',
  country: 'Україна',
  street: '',
  building: '',
  flat: '',
  zip: '',
};

describe('validateCheckout', () => {
  it('returns an empty object for valid data', () => {
    expect(validateCheckout(valid)).toEqual({});
  });

  it('maps an all-zero sizes object to the sizes field', () => {
    const errs = validateCheckout({
      ...valid,
      sizes: { МАЛЕНЬКИЙ: 0, СЕРЕДНІЙ: 0, ВЕЛИКИЙ: 0 },
    });
    expect(errs.sizes).toBe('Оберіть розмір');
  });

  it('returns the phone message for a number without +', () => {
    const errs = validateCheckout({ ...valid, phone: '0671234567' });
    expect(errs.phone).toBe('Номер має починатися з «+» і коду країни');
  });

  it('returns the name message for a single-word name', () => {
    const errs = validateCheckout({ ...valid, fullName: 'Іван' });
    expect(errs.fullName).toBe("Вкажіть ім'я та прізвище");
  });

  it('returns other-mode address errors', () => {
    const errs = validateCheckout({
      ...valid,
      deliveryMode: 'other',
      country: '',
      street: '',
      building: '',
      zip: '',
    });
    expect(errs.country).toBe('Вкажіть країну');
    expect(errs.street).toBe('Вкажіть вулицю');
    expect(errs.building).toBe('Вкажіть будинок');
    expect(errs.zip).toBe('Вкажіть поштовий індекс');
  });

  it('returns multiple errors at once', () => {
    const errs = validateCheckout({ ...valid, fullName: '', email: 'nope', phone: '' });
    expect(errs.fullName).toBeDefined();
    expect(errs.email).toBeDefined();
    expect(errs.phone).toBeDefined();
  });
});
