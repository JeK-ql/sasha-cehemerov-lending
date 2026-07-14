'use client';

import styles from './CheckoutModal.module.css';
import type { CheckoutFormState } from '@/lib/types';

type OtherValue = Pick<
  CheckoutFormState,
  'country' | 'city' | 'street' | 'building' | 'flat' | 'zip'
>;

type OtherField = 'country' | 'city' | 'street' | 'building' | 'zip';

interface OtherErrors {
  country?: string;
  city?: string;
  street?: string;
  building?: string;
  zip?: string;
}

/**
 * Універсальна адресна форма для режиму «Інше»: Укрпошта по Україні та
 * міжнародні відправлення. Один набір полів покриває обидва кейси.
 */
export function OtherDeliveryFields({
  value,
  onChange,
  onBlur,
  errors,
}: {
  value: OtherValue;
  onChange: (patch: Partial<CheckoutFormState>) => void;
  onBlur?: (field: OtherField) => void;
  errors: OtherErrors;
}) {
  const text = (
    key: keyof OtherValue,
    label: string,
    opts?: { placeholder?: string; hint?: string; autoComplete?: string },
  ) => {
    const error = key === 'flat' ? undefined : errors[key as OtherField];
    return (
      <label className={styles.field}>
        <span className={`${styles.fieldLabel} mono`}>{label}</span>
        <input
          className={styles.input}
          data-invalid={error ? 'true' : undefined}
          value={value[key]}
          placeholder={opts?.placeholder}
          autoComplete={opts?.autoComplete}
          onChange={(e) => onChange({ [key]: e.target.value })}
          onBlur={() => {
            if (key !== 'flat') onBlur?.(key as OtherField);
          }}
        />
        {error ? (
          <span className={`${styles.fieldError} mono`}>{error}</span>
        ) : (
          opts?.hint && <span className={`${styles.fieldHint} mono`}>{opts.hint}</span>
        )}
      </label>
    );
  };

  return (
    <>
      {text('country', 'КРАЇНА', { autoComplete: 'country-name' })}
      {text('city', 'МІСТО', { autoComplete: 'address-level2' })}
      {text('street', 'ВУЛИЦЯ', {
        placeholder: 'вул. Шевченка',
        autoComplete: 'address-line1',
      })}
      <div className={styles.fieldRow}>
        {text('building', 'БУДИНОК', { placeholder: '12А' })}
        {text('flat', 'КВАРТИРА', { placeholder: '45' })}
      </div>
      {text('zip', 'ПОШТОВИЙ ІНДЕКС', {
        placeholder: '01001',
        autoComplete: 'postal-code',
      })}
    </>
  );
}
