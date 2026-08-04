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
  // metaLabel («OVERSIZE» тощо) завжди йде першим, навіть коли ще нічого
  // не обрано — так само, як робив нерозрізаний CheckoutForm.
  const metaParts = [product.metaLabel, ...chosen.map((k) => `${k} ×${sizes[k]}`)].filter(
    Boolean,
  );

  return (
    <>
      <div className={styles.order}>
        {/* aspectRatio — з реєстру: рамка підганяється під пропорції фото,
            щоб cover не зрізав композицію. Не задано — лишається квадрат із CSS. */}
        <div className={styles.thumbBtn} style={{ aspectRatio: product.thumbAspect }}>
          {product.thumb ? (
            <Image
              src={product.thumb}
              alt=""
              fill
              // Рамка тягнеться на всю ширину колонки (до 450px), а не на 220px:
              // зі старим sizes браузер тягнув 256px-варіант і мазав його на
              // ~350px слот.
              sizes="(min-width: 768px) 450px, 100vw"
              className={styles.thumb}
            />
          ) : (
            <span className={`${styles.thumbPlaceholder} mono`}>【ФОТО】</span>
          )}
        </div>

        <div className={styles.orderInfo}>
          <div className={styles.orderName}>
            {product.nameImage ? (
              // Леттеринг замість тексту (педаль). alt несе назву — для
              // скрінрідера це і є назва товару в замовленні.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.nameImage.src}
                alt={product.name}
                width={product.nameImage.width}
                height={product.nameImage.height}
                decoding="async"
                className={styles.orderNameImg}
              />
            ) : (
              <span>{product.name.toUpperCase()}</span>
            )}
          </div>
          <div className={`${styles.orderMeta} mono`}>
            {product.showVariantPicker ? metaParts.join(' · ') : `${product.price} ₴`}
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
