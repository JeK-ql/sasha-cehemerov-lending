import { MongoClient, type Db } from 'mongodb';
import { requireEnv } from './config';

// Клієнт кешується на globalThis: у dev переживає HMR, на Vercel (Fluid
// Compute) перевикористовується між запитами одного інстанса — без цього
// кожен запит відкривав би нове TCP-з'єднання до Atlas.
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/** База магазину в кластері Atlas. */
export const DB_NAME = 'shop';

export async function getDb(): Promise<Db> {
  if (!globalThis._mongoClientPromise) {
    const client = new MongoClient(requireEnv('MONGODB_URI'), {
      // Швидкий фейл замість зависання запиту, якщо Atlas недоступний.
      serverSelectionTimeoutMS: 5000,
    });
    globalThis._mongoClientPromise = client.connect().catch((err) => {
      // Невдалий конект не має отруїти кеш назавжди.
      globalThis._mongoClientPromise = undefined;
      throw err;
    });
  }
  return (await globalThis._mongoClientPromise).db(DB_NAME);
}
