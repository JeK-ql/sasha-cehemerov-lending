import type { CheckoutInput } from './types';

export function validateCheckout(input: Partial<CheckoutInput>): { ok: boolean; reason?: string } {
  if (!input.fullName || input.fullName.trim().length < 3) return { ok: false, reason: 'fullName' };
  if (!input.phone || !/^\+?\d{9,15}$/.test(input.phone.replace(/\s/g, ''))) return { ok: false, reason: 'phone' };
  if (!input.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) return { ok: false, reason: 'email' };
  if (!input.city || !input.city.trim()) return { ok: false, reason: 'city' };
  if (!input.warehouse || !input.warehouse.trim()) return { ok: false, reason: 'warehouse' };
  return { ok: true };
}
