import type { Product } from '@/lib/products';
import styles from './ProductHero.module.css';

/**
 * Головне медіа сторінки товару. Плейсхолдер — для товарів, чиї файли ще
 * не приїхали від команди: він видимий і в проді, і в код-ревʼю.
 */
export function ProductHero({ product }: { product: Product }) {
  if (product.media.kind === 'video') {
    return (
      <video
        className={styles.fill}
        src={product.media.src}
        poster={product.media.poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
    );
  }

  if (product.media.kind === 'image') {
    // Це LCP-елемент сторінки товару (повноекранне фото на дроп-сторінці,
    // яку відкриють переважно з телефону за посиланням із соцмереж) —
    // fetchPriority і decoding=async підказують браузеру качати й
    // декодувати його одразу, не чекаючи черги. preload() з тим самим
    // src викликається в page.tsx, щоб браузер дізнався про файл ще до
    // того, як дійде розбору цього тега.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={styles.fill}
        src={product.media.src}
        alt=""
        fetchPriority="high"
        decoding="async"
      />
    );
  }

  return (
    <div className={styles.placeholder} role="img" aria-label={product.name}>
      <span className={`${styles.placeholderText} display`}>{product.media.caption}</span>
    </div>
  );
}
