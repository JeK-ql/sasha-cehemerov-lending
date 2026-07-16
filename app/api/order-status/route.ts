import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongo';
import type { OrderDoc } from '@/lib/inventory';

// Статус завжди свіжий — сторінка подяки опитує його одразу після оплати.
export const dynamic = 'force-dynamic';

/** Формат нашого orderReference; чужі значення навіть не питаємо в бази. */
const REF_RE = /^DROP01-\d{10,16}$/;

/**
 * Публічний статус замовлення для сторінки подяки. Джерело правди —
 * серверний колбек WayForPay, що пише в базу; браузерному transactionStatus
 * довіряти не можна (3DS може підтвердитись із затримкою).
 * Віддаємо ТІЛЬКИ статус — жодних персональних даних чи сум.
 */
export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref') ?? '';
  if (!REF_RE.test(ref)) {
    return NextResponse.json({ status: 'unknown' }, { status: 400 });
  }
  try {
    const db = await getDb();
    const order = await db.collection<OrderDoc>('orders').findOne(
      { _id: ref },
      { projection: { status: 1 } },
    );
    if (!order) return NextResponse.json({ status: 'unknown' });
    // 'released' назовні — 'failed': оплата не пройшла/не встигла.
    const status =
      order.status === 'paid' ? 'paid' : order.status === 'pending' ? 'pending' : 'failed';
    return NextResponse.json({ status });
  } catch (err) {
    console.error('order-status failed', ref, err);
    // База недоступна — хай сторінка подяки покаже фолбек-вердикт.
    return NextResponse.json({ status: 'unknown' });
  }
}
