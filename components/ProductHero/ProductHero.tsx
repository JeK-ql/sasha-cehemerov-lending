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
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={styles.fill} src={product.media.src} alt="" />;
  }

  return (
    <div className={styles.placeholder} role="img" aria-label={product.name}>
      <span className={`${styles.placeholderText} display`}>{product.media.caption}</span>
    </div>
  );
}
