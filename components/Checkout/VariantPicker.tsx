'use client';

import type { Product } from '@/lib/products';
import { totalQuantity } from '@/lib/checkoutSchema';
import styles from './CheckoutModal.module.css';

/**
 * Вибір варіанта й кількості. Рендериться лише для товарів із
 * showVariantPicker: у одноваріантного товару вибирати нічого.
 */
export function VariantPicker({
  product,
  sizes,
  available,
  stockMsg,
  error,
  onChange,
}: {
  product: Product;
  sizes: Record<string, number>;
  /** null — наявність ще не завантажена, усе вважається доступним. */
  available: Record<string, boolean> | null;
  stockMsg: string | null;
  error?: string;
  onChange: (key: string, delta: 1 | -1) => void;
}) {
  const total = totalQuantity(sizes);
  const canAdd = total < product.maxPerOrder;
  const chosen = product.variants.filter((v) => (sizes[v.key] ?? 0) > 0);

  return (
    <fieldset className={`${styles.block} ${styles.blockVariant}`}>
      <span className={`${styles.fieldLabel} ${styles.segLabel} mono`}>РОЗМІР</span>
      <div className={styles.segRow} role="group" aria-label="Розмір">
        {product.variants.map((v) => {
          const soldOut = available?.[v.key] === false;
          const count = sizes[v.key] ?? 0;
          return (
            <button
              key={v.key}
              type="button"
              className={styles.segBtn}
              data-active={count > 0 ? 'true' : undefined}
              aria-pressed={count > 0}
              disabled={soldOut}
              onClick={() => onChange(v.key, 1)}
            >
              {v.label}
              {soldOut ? (
                <span className={styles.soldOut}>РОЗПРОДАНО</span>
              ) : (
                count > 0 ? ` ×${count}` : ''
              )}
            </button>
          );
        })}
      </div>
      {stockMsg && <span className={`${styles.fieldError} mono`}>{stockMsg}</span>}
      {chosen.map((v) => (
        <div key={v.key}>
          <div className={styles.sizeQtyRow}>
            <span className={`${styles.sizeQtyLabel} mono`}>{v.label}</span>
            <button
              type="button"
              className={`${styles.qtyBtn} ${styles.qtyBtnSmall}`}
              onClick={() => onChange(v.key, -1)}
              aria-label={`Менше: ${v.label}`}
            >
              −
            </button>
            <span className={`${styles.sizeQtyCount} mono`}>{sizes[v.key]}</span>
            <button
              type="button"
              className={`${styles.qtyBtn} ${styles.qtyBtnSmall}`}
              aria-disabled={!canAdd}
              onClick={() => onChange(v.key, 1)}
              aria-label={`Більше: ${v.label}`}
            >
              +
            </button>
          </div>
          {v.widthCm && v.lengthCm && (
            <span className={`${styles.fieldHint} mono`}>
              ШИРИНА {v.widthCm} СМ · ДОВЖИНА {v.lengthCm} СМ
            </span>
          )}
        </div>
      ))}
      {error && <span className={`${styles.fieldError} mono`}>{error}</span>}
    </fieldset>
  );
}
