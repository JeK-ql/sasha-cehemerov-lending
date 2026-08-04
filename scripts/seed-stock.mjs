/**
 * Створює/оновлює документ складу товару (база shop, колекція inventory).
 *
 * Запуск:  npm run seed:stock -- DROP01 18 11 15
 *          npm run seed:stock -- PEDAL01 10
 *          npm run seed:stock -- PEDAL01        (показує поточний стан)
 *
 * УВАГА: перезаписує залишки вказаними цифрами. Активні резерви (pending)
 * при цьому НЕ враховуються — виставляй цифри, коли немає незавершених оплат.
 *
 * Реєстр тут дубльований свідомо: скрипт .mjs запускається поза Next і не
 * може імпортувати lib/products.ts. Додаєш товар у реєстр — додай і сюди.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { MongoClient } from 'mongodb';

const VARIANTS = {
  DROP01: ['МАЛЕНЬКИЙ', 'СЕРЕДНІЙ', 'ВЕЛИКИЙ'],
  PEDAL01: ['STANDARD'],
};

function loadUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  for (const file of ['.env.local', '.env']) {
    const full = path.join(process.cwd(), file);
    if (!existsSync(full)) continue;
    const match = readFileSync(full, 'utf8').match(/^MONGODB_URI=(.+)$/m);
    if (match) return match[1].trim();
  }
  throw new Error('MONGODB_URI не знайдено ні в env, ні в .env.local/.env');
}

const [productId, ...rawCounts] = process.argv.slice(2);

if (!productId || !VARIANTS[productId]) {
  console.error(
    `Використання: npm run seed:stock -- <${Object.keys(VARIANTS).join('|')}> <кількості…>`,
  );
  process.exit(1);
}

const keys = VARIANTS[productId];
const counts = rawCounts.map(Number);
if (counts.length && (counts.length !== keys.length || counts.some((n) => !Number.isInteger(n) || n < 0))) {
  console.error(`Для ${productId} потрібно ${keys.length} цілих чисел ≥ 0: ${keys.join(' ')}`);
  process.exit(1);
}

const client = new MongoClient(loadUri(), { serverSelectionTimeoutMS: 10000 });
try {
  await client.connect();
  const inventory = client.db('shop').collection('inventory');

  if (counts.length) {
    const stock = Object.fromEntries(keys.map((k, i) => [k, counts[i]]));
    await inventory.updateOne({ _id: productId }, { $set: { stock } }, { upsert: true });
    console.log(`Склад ${productId} оновлено:`, stock);
  } else {
    const doc = await inventory.findOne({ _id: productId });
    console.log(doc ? doc.stock : `Документа складу ${productId} ще немає — задай цифри аргументами.`);
  }
} finally {
  await client.close();
}
