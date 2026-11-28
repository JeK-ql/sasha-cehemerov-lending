import { describe, it, expect } from 'vitest';
import { withPedalRemaining } from '../pedalEdition';
import { PRODUCTS } from '../products';

const labels = (p: { specs?: { label: string }[] }) => p.specs?.map((s) => s.label);

describe('withPedalRemaining', () => {
  it('лишає тираж 10 і додає під ним «Залишилось» із живим числом', () => {
    const p = withPedalRemaining(PRODUCTS.PEDAL01, 7);
    expect(p.specs?.find((s) => s.label === 'Тираж')?.value).toBe('10 штук');
    expect(p.specs?.find((s) => s.label === 'Залишилось')?.value).toBe('7');
    const l = labels(p)!;
    expect(l.indexOf('Залишилось')).toBe(l.indexOf('Тираж') + 1);
  });

  it('розпродано — «Залишилось 0»', () => {
    const p = withPedalRemaining(PRODUCTS.PEDAL01, 0);
    expect(p.specs?.find((s) => s.label === 'Залишилось')?.value).toBe('0');
  });

  it('решту товару не чіпає й реєстр не мутує', () => {
    const p = withPedalRemaining(PRODUCTS.PEDAL01, 4);
    expect(p.schemaDescription).toBe(PRODUCTS.PEDAL01.schemaDescription);
    expect(p.specs?.find((s) => s.label === 'Корпус')?.value).toBe('Алюміній (формат 1590B)');
    expect(p.id).toBe('PEDAL01');
    expect(labels(PRODUCTS.PEDAL01)).not.toContain('Залишилось');
  });
});
