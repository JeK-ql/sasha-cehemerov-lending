import { describe, it, expect } from 'vitest';
import { mapCities, mapWarehouses } from '../novaposhta';

describe('mapCities', () => {
  it('maps NP settlement payload to options', () => {
    const raw = [{ Present: 'Львів, Львівська обл.', Ref: 'ref-1' }];
    expect(mapCities(raw)).toEqual([{ label: 'Львів, Львівська обл.', ref: 'ref-1' }]);
  });
  it('returns empty array for missing input', () => {
    expect(mapCities(undefined)).toEqual([]);
  });
});

describe('mapWarehouses', () => {
  it('maps NP warehouse payload to options', () => {
    const raw = [{ Description: 'Відділення №1', Ref: 'wh-1' }];
    expect(mapWarehouses(raw)).toEqual([{ label: 'Відділення №1', ref: 'wh-1' }]);
  });
});
