import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongo';
import { stockAvailability } from '@/lib/inventory';
import { DEFAULT_PRODUCT_ID, getProduct, variantKeys } from '@/lib/products';

// Route handlers у Next 16 і так динамічні за замовчуванням — це явна
// страховка: залишки не можна кешувати за жодних умов і майбутніх дефолтів.
export const dynamic = 'force-dynamic';

/**
 * Наявність по варіантах товару: { ВАРІАНТ: true/false }. Цифри залишків
 * свідомо не віддаємо — обсяги продажів не публічні.
 * Якщо база недоступна, вважаємо все в наявності: краще прийняти замовлення
 * (checkout все одно переперевірить резервом), ніж показати «розпродано».
 */
export async function GET(req: NextRequest) {
  const product = getProduct(
    req.nextUrl.searchParams.get('product') ?? DEFAULT_PRODUCT_ID,
  );
  if (!product) {
    return NextResponse.json({ error: 'unknown-product' }, { status: 400 });
  }
  const keys = variantKeys(product);
  try {
    const availability = await stockAvailability(await getDb(), product.id, keys);
    return NextResponse.json(availability);
  } catch (err) {
    console.error('stockAvailability failed', product.id, err);
    return NextResponse.json(Object.fromEntries(keys.map((k) => [k, true])));
  }
}
