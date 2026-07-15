/**
 * Оновлює lib/popularCities.ts: резолвить Ref-и популярних міст через
 * API Нової Пошти (searchSettlements) і перезаписує файл готовими даними.
 *
 * Запуск:  npm run refresh:cities   (ключ бере з env або .env.local/.env)
 * Ref НП — стабільний UUID, оновлення потрібне рідко (раз на пів року).
 * Якщо НП недоступна або місто не знайдено — скрипт падає, файл не чіпає.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const NAMES = ['Київ', 'Харків', 'Одеса', 'Львів', 'Дніпро', 'Запоріжжя', 'Вінниця', 'Полтава'];
const NP_ENDPOINT = 'https://api.novaposhta.ua/v2.0/json/';
const OUT = path.join(process.cwd(), 'lib', 'popularCities.ts');

function loadApiKey() {
  if (process.env.NOVAPOSHTA_API_KEY) return process.env.NOVAPOSHTA_API_KEY;
  for (const file of ['.env.local', '.env']) {
    const full = path.join(process.cwd(), file);
    if (!existsSync(full)) continue;
    const match = readFileSync(full, 'utf8').match(/^NOVAPOSHTA_API_KEY=(.+)$/m);
    if (match) return match[1].trim();
  }
  throw new Error('NOVAPOSHTA_API_KEY не знайдено ні в env, ні в .env.local/.env');
}

async function resolveCity(apiKey, name) {
  const res = await fetch(NP_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey, modelName: 'Address', calledMethod: 'searchSettlements',
      methodProperties: { CityName: name, Limit: '1' },
    }),
  });
  if (!res.ok) throw new Error(`НП searchSettlements HTTP ${res.status} для «${name}»`);
  const json = await res.json();
  const first = json?.data?.[0]?.Addresses?.[0];
  if (!first?.Ref) throw new Error(`НП не знайшла місто «${name}»`);
  return { name, label: first.Present ?? name, ref: first.Ref };
}

const apiKey = loadApiKey();
const cities = [];
for (const name of NAMES) {
  const city = await resolveCity(apiKey, name);
  console.log(`${city.name.padEnd(10)} ${city.ref}  ${city.label}`);
  cities.push(city);
}

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const rows = cities
  .map((c) => `  { name: '${esc(c.name)}', label: '${esc(c.label)}', ref: '${esc(c.ref)}' },`)
  .join('\n');

const body = `/**
 * Популярні міста для швидкого вибору в полі «Місто».
 * ЗГЕНЕРОВАНО скриптом scripts/refresh-popular-cities.mjs — не редагуй руками,
 * запусти \`npm run refresh:cities\` (Ref НП стабільний, оновлення рідкісне).
 * Клік по місту НЕ робить мережевих запитів — ref уже тут.
 */
export interface PopularCity {
  /** Коротка назва для дропдауна. */
  name: string;
  /** Повна назва НП — іде в замовлення, як із живого пошуку. */
  label: string;
  /** SettlementRef НП для запиту відділень. */
  ref: string;
}

export const POPULAR_CITIES: readonly PopularCity[] = [
${rows}
];
`;

writeFileSync(OUT, body, 'utf8');
console.log(`\nЗаписано ${OUT}`);
