'use client';

import Image from 'next/image';
import type { Product } from '@/lib/products';
import { variantKeys } from '@/lib/products';
import styles from './CheckoutModal.module.css';

/**
 * Шапка замовлення: фото, назва, обрані варіанти. Для товарів з описом і
 * специфікаціями (педаль) — ще й вони: сторінка товару мовчазна, тому це
 * єдине місце, де покупець бачить характеристики.
 */
export function ProductSummary({
  product,
  sizes,
}: {
  product: Product;
  sizes: Record<string, number>;
}) {
  const chosen = variantKeys(product).filter((k) => (sizes[k] ?? 0) > 0);

  return (
    <>
      <div className={styles.order}>
        <div className={styles.thumbBtn}>
          {product.thumb ? (
            <Image
              src={product.thumb}
              alt=""
              fill
              sizes="(min-width: 768px) 220px, 33vw"
              className={styles.thumb}
            />
          ) : (
            <span className={`${styles.thumbPlaceholder} mono`}>【ФОТО】</span>
          )}
        </div>

        <div className={styles.orderInfo}>
          <div className={styles.orderName}>
            <span>{product.name.toUpperCase()}</span>
          </div>
          <div className={`${styles.orderMeta} mono`}>
            {product.showVariantPicker
              ? chosen.map((k) => `${k} ×${sizes[k]}`).join(' · ')
              : `${product.price} ₴`}
          </div>
        </div>
      </div>

      {product.description && (
        <div className={styles.productCopy}>
          {product.description.map((p) => (
            <p key={p.slice(0, 32)}>{p}</p>
          ))}
        </div>
      )}

      {product.specs && (
        <dl className={`${styles.specs} mono`}>
          {product.specs.map((s) => (
            <div key={s.label} className={styles.specRow}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Решта ракурсів. Перше фото галереї — те саме, що мініатюра вище,
          тому воно пропускається: показувати його двічі немає сенсу. */}
      {product.gallery && product.gallery.length > 1 && (
        <div className={styles.gallery}>
          {product.gallery.slice(1).map((src) => (
            <Image
              key={src}
              src={src}
              alt={product.name}
              width={800}
              height={1000}
              sizes="(min-width: 768px) 520px, 90vw"
              className={styles.galleryImage}
            />
          ))}
        </div>
      )}
    </>
  );
}
