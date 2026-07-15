import { describe, it, expect } from 'vitest';
import {
  SELLER,
  SELLER_HAS_PLACEHOLDERS,
  FOOTER_CONTACTS_READY,
  SELLER_TELEGRAM_READY,
} from '../seller';

describe('SELLER', () => {
  it('has every requisite field non-empty', () => {
    const keys = [
      'name', 'taxId', 'legalAddress', 'actualAddress', 'phone', 'telegram', 'email',
    ] as const;
    for (const k of keys) {
      expect(SELLER[k].trim().length, `SELLER.${k}`).toBeGreaterThan(0);
    }
  });

  it('team data 2026-07-15 is filled verbatim', () => {
    expect(SELLER.name).toBe('ФОП Чемеров Олександр Валерійович');
    expect(SELLER.taxId).toBe('2990129357');
    expect(SELLER.phone).toBe('+380 97 700 73 47');
    expect(SELLER.email).toBe('sashastandout@gmail.com');
  });

  it('no placeholders remain in required fields (moderation-ready)', () => {
    expect(SELLER_HAS_PLACEHOLDERS).toBe(false);
  });

  it('footer contacts are visible (phone and email are real)', () => {
    expect(FOOTER_CONTACTS_READY).toBe(true);
  });

  it('telegram row stays hidden until the team provides the link', () => {
    expect(SELLER_TELEGRAM_READY).toBe(false);
  });
});
