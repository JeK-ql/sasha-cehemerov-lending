import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongo';
import { stockAvailability } from '@/lib/inventory';
import { SIZES } from '@/lib/config';

// Route handlers у Next 16 і так динамічні за замовчуванням — це явна
// страховка: залишки не можна кешувати за жодних умов і майбутніх дефолтів.
export const dynamic = 'force-dynamic';

/**
 * Наявність по розмірах: { РОЗМІР: true/false }. Цифри залишків свідомо
 * не віддаємо — обсяги продажів не публічні.
 * Якщо база недоступна, вважаємо все в наявності: краще прийняти замовлення
 * (checkout все одно переперевірить резервом), ніж показати «розпродано».
 */
export async function GET() {
  try {
    const availability = await stockAvailability(await getDb());
    return NextResponse.json(availability);
  } catch (err) {
    console.error('stockAvailability failed', err);
    return NextResponse.json(
      Object.fromEntries(SIZES.map((s) => [s, true])),
    );
  }
}
