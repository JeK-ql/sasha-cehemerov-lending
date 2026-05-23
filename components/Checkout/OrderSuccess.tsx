'use client';

import { useCheckout } from './CheckoutProvider';
import styles from './CheckoutModal.module.css';

/** Екран подяки після оформлення замовлення. */
export function OrderSuccess({ orderReference }: { orderReference: string }) {
  const { close } = useCheckout();
  return (
    <div className={styles.success}>
      <div className={styles.successMark}>✓</div>
      <div className={`${styles.successTitle} display`}>ДЯКУЮ ЗА ЗАМОВЛЕННЯ</div>
      <div className={styles.successText}>
        Очікуйте на товар — ми звʼяжемося з вами найближчим часом.
      </div>
      <div className={`${styles.successRef} mono`}>№ {orderReference}</div>
      <button type="button" className={styles.successClose} onClick={close}>
        Закрити
      </button>
    </div>
  );
}
