'use client';

import { useState, useEffect } from 'react';
import styles from './CheckoutModal.module.css';
import { POPULAR_CITIES } from '@/lib/popularCities';
import type { NpOption, NpWarehouse } from '@/lib/novaposhta';
import type { CheckoutInput } from '@/lib/types';

type DeliveryValue = Pick<
  CheckoutInput,
  'city' | 'cityRef' | 'deliveryType' | 'warehouse' | 'street' | 'building' | 'flat'
>;

interface DeliveryErrors {
  city?: string;
  warehouse?: string;
  street?: string;
  building?: string;
}

export function NovaPoshtaPicker({
  value,
  onChange,
  errors,
}: {
  value: DeliveryValue;
  onChange: (patch: Partial<CheckoutInput>) => void;
  errors: DeliveryErrors;
}) {
  const [cityQuery, setCityQuery] = useState('');
  const [cities, setCities] = useState<NpOption[]>([]);
  const [cityOpen, setCityOpen] = useState(false);

  const [warehouses, setWarehouses] = useState<NpWarehouse[]>([]);
  const [whQuery, setWhQuery] = useState('');
  const [whOpen, setWhOpen] = useState(false);

  const citySelected = value.cityRef.length > 0;

  // Живий пошук міста, щойно введено 2+ символи.
  useEffect(() => {
    if (citySelected || cityQuery.trim().length < 2) {
      setCities([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/novaposhta?type=cities&q=${encodeURIComponent(cityQuery)}`,
        );
        const json = await res.json();
        setCities(json.items ?? []);
      } catch {
        setCities([]);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [cityQuery, citySelected]);

  // Завантажуємо точки видачі при зміні обраного міста.
  useEffect(() => {
    if (!value.cityRef) {
      setWarehouses([]);
      return;
    }
    let active = true;
    fetch(`/api/novaposhta?type=warehouses&ref=${encodeURIComponent(value.cityRef)}`)
      .then((r) => r.json())
      .then((j) => {
        if (active) setWarehouses(j.items ?? []);
      })
      .catch(() => {
        if (active) setWarehouses([]);
      });
    return () => {
      active = false;
    };
  }, [value.cityRef]);

  function selectCity(city: NpOption) {
    setCityOpen(false);
    setCities([]);
    setWhQuery('');
    onChange({ city: city.label, cityRef: city.ref, warehouse: '' });
  }

  // Клік по популярному місту — резолвимо його Ref через звичайний пошук.
  async function selectPopularCity(name: string) {
    try {
      const res = await fetch(`/api/novaposhta?type=cities&q=${encodeURIComponent(name)}`);
      const json = await res.json();
      const first: NpOption | undefined = (json.items ?? [])[0];
      if (first) selectCity(first);
    } catch {
      /* мовчки ігноруємо — користувач може ввести місто вручну */
    }
  }

  function editCity(text: string) {
    setCityQuery(text);
    onChange({ city: '', cityRef: '', warehouse: '' });
  }

  const showPopular = cityOpen && !citySelected && cityQuery.trim().length < 2;
  const showCityResults = cityOpen && !citySelected && cities.length > 0;

  const filteredWh = whQuery.trim()
    ? warehouses.filter((w) => w.label.toLowerCase().includes(whQuery.trim().toLowerCase()))
    : warehouses;

  return (
    <>
      {/* ---- місто ---- */}
      <label className={styles.field}>
        <span className={`${styles.fieldLabel} mono`}>Місто</span>
        <input
          className={styles.input}
          data-invalid={errors.city ? 'true' : undefined}
          placeholder="Почніть вводити назву"
          value={citySelected ? value.city : cityQuery}
          onChange={(e) => editCity(e.target.value)}
          onFocus={() => setCityOpen(true)}
          onBlur={() => setTimeout(() => setCityOpen(false), 150)}
        />
        {showPopular && (
          <ul className={styles.ac}>
            <li className={`${styles.acHead} mono`}>Популярні міста</li>
            {POPULAR_CITIES.map((name) => (
              <li
                key={name}
                className={styles.acItem}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectPopularCity(name)}
              >
                {name}
              </li>
            ))}
          </ul>
        )}
        {showCityResults && (
          <ul className={styles.ac}>
            {cities.map((c) => (
              <li
                key={c.ref}
                className={styles.acItem}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectCity(c)}
              >
                {c.label}
              </li>
            ))}
          </ul>
        )}
        {errors.city ? (
          <span className={`${styles.fieldError} mono`}>{errors.city}</span>
        ) : (
          <span className={`${styles.fieldHint} mono`}>
            оберіть зі списку популярних або почніть вводити назву
          </span>
        )}
      </label>

      {/* ---- режим доставки + точка (після вибору міста) ---- */}
      {citySelected && (
        <>
          <div className={styles.modes}>
            <button
              type="button"
              className={styles.modeBtn}
              data-active={value.deliveryType === 'warehouse'}
              onClick={() =>
                onChange({ deliveryType: 'warehouse', street: '', building: '', flat: '' })
              }
            >
              Відділення / поштомат
            </button>
            <button
              type="button"
              className={styles.modeBtn}
              data-active={value.deliveryType === 'courier'}
              onClick={() => onChange({ deliveryType: 'courier', warehouse: '' })}
            >
              Курʼєр
            </button>
          </div>

          {value.deliveryType === 'warehouse' ? (
            <label className={styles.field}>
              <span className={`${styles.fieldLabel} mono`}>Відділення або поштомат</span>
              <input
                className={styles.input}
                data-invalid={errors.warehouse ? 'true' : undefined}
                placeholder="Номер або адреса"
                value={value.warehouse || whQuery}
                onChange={(e) => {
                  setWhQuery(e.target.value);
                  if (value.warehouse) onChange({ warehouse: '' });
                }}
                onFocus={() => setWhOpen(true)}
                onBlur={() => setTimeout(() => setWhOpen(false), 150)}
              />
              {whOpen && !value.warehouse && filteredWh.length > 0 && (
                <ul className={styles.ac}>
                  {filteredWh.slice(0, 60).map((w) => (
                    <li
                      key={w.ref}
                      className={`${styles.acItem} ${styles.acRow}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onChange({ warehouse: w.label });
                        setWhQuery('');
                        setWhOpen(false);
                      }}
                    >
                      <span>{w.label}</span>
                      <span className={`${styles.acTag} mono`}>
                        {w.type === 'postbox' ? 'Поштомат' : 'Відділення'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {errors.warehouse ? (
                <span className={`${styles.fieldError} mono`}>{errors.warehouse}</span>
              ) : (
                <span className={`${styles.fieldHint} mono`}>
                  {warehouses.length ? 'оберіть точку видачі Нової Пошти' : 'завантаження точок…'}
                </span>
              )}
            </label>
          ) : (
            <>
              <label className={styles.field}>
                <span className={`${styles.fieldLabel} mono`}>Вулиця</span>
                <input
                  className={styles.input}
                  data-invalid={errors.street ? 'true' : undefined}
                  placeholder="вул. Шевченка"
                  value={value.street}
                  onChange={(e) => onChange({ street: e.target.value })}
                />
                {errors.street ? (
                  <span className={`${styles.fieldError} mono`}>{errors.street}</span>
                ) : (
                  <span className={`${styles.fieldHint} mono`}>назва вулиці у вибраному місті</span>
                )}
              </label>
              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  <span className={`${styles.fieldLabel} mono`}>Будинок</span>
                  <input
                    className={styles.input}
                    data-invalid={errors.building ? 'true' : undefined}
                    placeholder="12А"
                    value={value.building}
                    onChange={(e) => onChange({ building: e.target.value })}
                  />
                  {errors.building && (
                    <span className={`${styles.fieldError} mono`}>{errors.building}</span>
                  )}
                </label>
                <label className={styles.field}>
                  <span className={`${styles.fieldLabel} mono`}>Квартира</span>
                  <input
                    className={styles.input}
                    placeholder="45"
                    value={value.flat}
                    onChange={(e) => onChange({ flat: e.target.value })}
                  />
                </label>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
