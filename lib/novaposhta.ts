export interface NpOption { label: string; ref: string; }

export interface NpWarehouse {
  label: string;
  ref: string;
  type: 'branch' | 'postbox';
  number: string;
}

const NP_ENDPOINT = 'https://api.novaposhta.ua/v2.0/json/';

/**
 * Нормалізує пошуковий запит міста: «Киї», « киї » → «киї».
 * Єдиний вигляд запиту = єдиний кеш-ключ CDN (кешується по повному URL).
 */
export function normalizeCityQuery(q: string): string {
  return q.trim().toLocaleLowerCase('uk-UA');
}

export function mapCities(raw: unknown): NpOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c: { Present?: string; Description?: string; Ref: string }) => ({
    label: c.Present ?? c.Description ?? '',
    ref: c.Ref,
  }));
}

export function mapWarehouses(raw: unknown): NpWarehouse[] {
  if (!Array.isArray(raw)) return [];
  const items: NpWarehouse[] = raw.map(
    (w: {
      Description?: string;
      Ref: string;
      Number?: string;
      CategoryOfWarehouse?: string;
    }) => {
      const description = w.Description ?? '';
      const isPostbox = w.CategoryOfWarehouse
        ? w.CategoryOfWarehouse === 'Postomat'
        : /поштомат/i.test(description);
      return {
        label: description,
        ref: w.Ref,
        type: (isPostbox ? 'postbox' : 'branch') as NpWarehouse['type'],
        number: w.Number ?? '',
      };
    },
  );
  return items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'branch' ? -1 : 1;
    return (parseInt(a.number, 10) || 0) - (parseInt(b.number, 10) || 0);
  });
}

/** Пошук населених пунктів за частиною назви. */
export async function searchCities(apiKey: string, query: string): Promise<NpOption[]> {
  const res = await fetch(NP_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey, modelName: 'Address', calledMethod: 'searchSettlements',
      methodProperties: { CityName: query, Limit: '8' },
    }),
  });
  if (!res.ok) throw new Error(`НП searchSettlements HTTP ${res.status}`);
  const json = await res.json();
  /* НП звітує збої (поганий ключ, ліміт) як HTTP 200 + success:false + порожній
     data — якщо не кинути тут, порожній результат піде як success і залипне
     в CDN-кеші на добу для популярних запитів. Відсутність success (старі
     тести/моки) — не помилка, кидаємо тільки на явний false. */
  if (json?.success === false) throw new Error('НП searchSettlements: success:false');
  const addresses = json?.data?.[0]?.Addresses;
  return mapCities(addresses);
}

/** Список відділень/поштоматів для населеного пункту. */
export async function listWarehouses(apiKey: string, settlementRef: string): Promise<NpWarehouse[]> {
  const res = await fetch(NP_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey, modelName: 'Address', calledMethod: 'getWarehouses',
      methodProperties: { SettlementRef: settlementRef },
    }),
  });
  if (!res.ok) throw new Error(`НП getWarehouses HTTP ${res.status}`);
  const json = await res.json();
  // Той самий захист, що й у searchCities — див. коментар там.
  if (json?.success === false) throw new Error('НП getWarehouses: success:false');
  return mapWarehouses(json?.data);
}
