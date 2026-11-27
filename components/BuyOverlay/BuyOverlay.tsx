'use client';

import { useCheckout } from '@/components/Checkout/CheckoutProvider';
import { useSoldOut } from '@/components/Checkout/useSoldOut';
import styles from './BuyOverlay.module.css';

export function BuyOverlay() {
  const { open, product } = useCheckout();
  const soldOut = useSoldOut(product);
  // Акційна плашка (lib/promo.ts). Над розпроданою кнопкою ціна нічого не
  // обіцяє — ховаємо.
  const showPromo = product.oldPrice !== undefined && !soldOut;

  return (
    <div className={styles.overlay}>
      <div className={styles.stack}>
        {showPromo && (
          <p className={styles.promo}>
            <span className={styles.promoTitle}>Чорна пʼятниця</span>
            <span className={styles.promoPrice}>
              {product.price} ₴
              <span className={styles.visuallyHidden}> замість </span>
              <s className={styles.promoOld}>{product.oldPrice} ₴</s>
            </span>
          </p>
        )}
        <button
          className={styles.buy}
          onClick={open}
          disabled={soldOut}
          data-sold-out={soldOut ? 'true' : undefined}
        >
          {soldOut ? 'Розпродано' : 'Забрати'}
        </button>
      </div>
    </div>
  );
}
