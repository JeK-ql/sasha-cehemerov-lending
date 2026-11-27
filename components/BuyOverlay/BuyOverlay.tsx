'use client';

import { useCheckout } from '@/components/Checkout/CheckoutProvider';
import { useSoldOut } from '@/components/Checkout/useSoldOut';
import { PromoPrice } from '@/components/PromoPrice/PromoPrice';
import { PROMO_TITLE } from '@/lib/promo';
import styles from './BuyOverlay.module.css';

export function BuyOverlay() {
  const { open, product } = useCheckout();
  const soldOut = useSoldOut(product);

  return (
    <div className={styles.overlay}>
      <div className={styles.stack}>
        {/* Акційна плашка (lib/promo.ts). Над розпроданою кнопкою ціна
            нічого не обіцяє — ховаємо. */}
        {product.oldPrice !== undefined && !soldOut && (
          <p className={styles.promo}>
            <span className={styles.promoTitle}>{PROMO_TITLE}</span>
            <span className={styles.promoPrice}>
              <PromoPrice
                price={product.price}
                oldPrice={product.oldPrice}
                oldClassName={styles.promoOld}
              />
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
