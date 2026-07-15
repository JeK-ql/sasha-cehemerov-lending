import { describe, it, expect } from 'vitest';
import { POPULAR_CITIES } from '../popularCities';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('POPULAR_CITIES', () => {
  it('містить 8 міст із назвою, повним лейблом і UUID-рефом', () => {
    expect(POPULAR_CITIES).toHaveLength(8);
    for (const city of POPULAR_CITIES) {
      expect(city.name.length).toBeGreaterThan(0);
      // Повна назва НП містить коротку («м. Київ, Київська обл.» ⊃ «Київ»)
      expect(city.label).toContain(city.name);
      // Зіпсутий перезапис скриптом ловиться по формату ref
      expect(city.ref).toMatch(UUID_RE);
    }
  });
});
