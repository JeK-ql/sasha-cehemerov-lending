/**
 * Створює/оновлює документ складу в MongoDB (база shop, колекція inventory).
 *
 * Запуск:  npm run seed:stock -- 18 11 15
 *          (МАЛЕНЬКИЙ СЕРЕДНІЙ ВЕЛИКИЙ; без аргументів — показує поточний стан)
 *
 * УВАГА: перезаписує залишки вказаними цифрами. Активні резерви (pending)
 * при цьому НЕ враховуються — виставляй цифри, коли немає незавершених оплат.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { MongoClient } from 'mongodb';

const SIZES = ['МАЛЕНЬКИЙ', 'СЕРЕДНІЙ', 'ВЕЛИКИЙ'];
const INVENTORY_ID = 'DROP01';

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

const args = process.argv.slice(2).map(Number);
if (args.length && (args.length !== SIZES.length || args.some((n) => !Number.isInteger(n) || n < 0))) {
  console.error('Використання: npm run seed:stock -- <МАЛЕНЬКИЙ> <СЕРЕДНІЙ> <ВЕЛИКИЙ> (цілі ≥ 0)');
  process.exit(1);
}

const client = new MongoClient(loadUri(), { serverSelectionTimeoutMS: 10000 });
try {
  await client.connect();
  const inventory = client.db('shop').collection('inventory');

  if (args.length) {
    const stock = Object.fromEntries(SIZES.map((s, i) => [s, args[i]]));
    await inventory.updateOne(
      { _id: INVENTORY_ID },
      { $set: { stock } },
      { upsert: true },
    );
    console.log('Склад оновлено:', stock);
  } else {
    const doc = await inventory.findOne({ _id: INVENTORY_ID });
    console.log(doc ? doc.stock : 'Документа складу ще немає — задай цифри аргументами.');
  }
} finally {
  await client.close();
}
