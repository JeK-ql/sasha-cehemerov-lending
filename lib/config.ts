export const PRODUCT = {
  name: 'too much яром too much долиною',
  price: 1,
  currency: 'UAH',
  sku: 'DROP01-OVERSIZE',
} as const;

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://isusneisus.com';

/** Доступ до серверних env зі зрозумілою помилкою за відсутності. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}
