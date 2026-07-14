export const PRODUCT = {
  name: 'too much яром too much долиною',
  price: 2600,
  currency: 'UAH',
  sku: 'DROP01-OVERSIZE',
} as const;

/**
 * Доступні розміри оверсайз-футболки. Власні назви замість S/M/L —
 * свідоме рішення команди (розміри не збігаються зі стандартними).
 */
export const SIZES = ['МАЛЕНЬКИЙ', 'СЕРЕДНІЙ', 'ВЕЛИКИЙ'] as const;
export type Size = (typeof SIZES)[number];

/**
 * Заміри виробу в сантиметрах (ширина по грудях × довжина).
 * null = заміри ще не отримані від команди — UI тоді ховає рядок замірів.
 */
export const SIZE_MEASUREMENTS: Record<
  Size,
  { widthCm: number; lengthCm: number } | null
> = {
  МАЛЕНЬКИЙ: null,
  СЕРЕДНІЙ: null,
  ВЕЛИКИЙ: null,
};

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://isusneisus.com';

/** Доступ до серверних env зі зрозумілою помилкою за відсутності. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}
