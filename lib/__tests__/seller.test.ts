import { describe, it, expect } from 'vitest';
import {
  SELLER,
  SELLER_HAS_PLACEHOLDERS,
  FOOTER_CONTACTS_READY,
} from '../seller';

describe('SELLER', () => {
  it('has every requisite field non-empty', () => {
    const keys = [
      'name', 'taxId', 'legalAddress', 'actualAddress', 'email',
    ] as const;
    for (const k of keys) {
      expect(SELLER[k].trim().length, `SELLER.${k}`).toBeGreaterThan(0);
    }
  });

  it('team data 2026-07-15 is filled verbatim', () => {
    expect(SELLER.name).toBe('ФОП Чемеров Олександр Валерійович');
    expect(SELLER.taxId).toBe('2990129357');
    expect(SELLER.email).toBe('sashastandout@gmail.com');
  });

  it('publishes no phone or telegram anywhere', () => {
    expect(Object.keys(SELLER)).toEqual(
      ['name', 'taxId', 'legalAddress', 'actualAddress', 'email'],
    );
  });

  it('no placeholders remain in required fields (moderation-ready)', () => {
    expect(SELLER_HAS_PLACEHOLDERS).toBe(false);
  });

  it('footer contacts are visible (email is real)', () => {
    expect(FOOTER_CONTACTS_READY).toBe(true);
  });
});
