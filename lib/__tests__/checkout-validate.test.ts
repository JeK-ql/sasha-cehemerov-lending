import { describe, it, expect } from 'vitest';
import { validateCheckout } from '../validate';

const ok = {
  fullName: 'Чемеров Олександр', phone: '+380671234567', email: 'a@b.com',
  city: 'Львів', cityRef: 'ref-1', warehouse: 'Відділення №1',
};

describe('validateCheckout', () => {
  it('accepts a valid payload', () => {
    expect(validateCheckout(ok).ok).toBe(true);
  });
  it('rejects bad email', () => {
    expect(validateCheckout({ ...ok, email: 'nope' }).ok).toBe(false);
  });
  it('rejects short name', () => {
    expect(validateCheckout({ ...ok, fullName: 'X' }).ok).toBe(false);
  });
  it('rejects single-word name', () => {
    expect(validateCheckout({ ...ok, fullName: 'Іван' }).ok).toBe(false);
  });
  it('rejects missing warehouse', () => {
    expect(validateCheckout({ ...ok, warehouse: '' }).ok).toBe(false);
  });
});
