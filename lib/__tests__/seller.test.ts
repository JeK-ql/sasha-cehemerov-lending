import { describe, it, expect } from 'vitest';
import { SELLER, SELLER_HAS_PLACEHOLDERS } from '../seller';

describe('SELLER', () => {
  it('has every requisite field non-empty', () => {
    const keys = ['name', 'taxId', 'legalAddress', 'actualAddress', 'phone', 'email'] as const;
    for (const k of keys) {
      expect(SELLER[k].trim().length, `SELLER.${k}`).toBeGreaterThan(0);
    }
  });

  it('flags placeholders until real data is filled in', () => {
    // Плейсхолдери мають формат 【…】. Поки реквізитів немає — прапорець true.
    // Коли команда дасть реальні дані, цей expect інвертувати на toBe(false)
    // у тому ж коміті, що заповнює реквізити.
    expect(SELLER_HAS_PLACEHOLDERS).toBe(true);
  });
});
