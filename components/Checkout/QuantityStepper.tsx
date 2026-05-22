'use client';

import styles from './CheckoutModal.module.css';

/** Степер кількості: мінімум 1, верхньої межи немає. */
export function QuantityStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className={styles.stepper}>
      <button
        type="button"
        className={styles.stepBtn}
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Зменшити кількість"
      >
        −
      </button>
      <span className={`${styles.stepValue} mono`}>{value}</span>
      <button
        type="button"
        className={styles.stepBtn}
        onClick={() => onChange(value + 1)}
        aria-label="Збільшити кількість"
      >
        +
      </button>
    </div>
  );
}
