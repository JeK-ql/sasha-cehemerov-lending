'use client';

import { useState, useEffect } from 'react';
import styles from './CheckoutModal.module.css';

interface Option { label: string; ref: string; }

export function NovaPoshtaPicker({
  onSelect,
}: {
  onSelect: (city: string, cityRef: string, warehouse: string) => void;
}) {
  const [cityQuery, setCityQuery] = useState('');
  const [cities, setCities] = useState<Option[]>([]);
  const [city, setCity] = useState<Option | null>(null);
  const [warehouses, setWarehouses] = useState<Option[]>([]);
  const [warehouse, setWarehouse] = useState('');

  useEffect(() => {
    if (city || cityQuery.trim().length < 2) { setCities([]); return; }
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/novaposhta?type=cities&q=${encodeURIComponent(cityQuery)}`);
        const json = await res.json();
        setCities(json.items ?? []);
      } catch {
        setCities([]);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [cityQuery, city]);

  useEffect(() => {
    if (!city) return;
    fetch(`/api/novaposhta?type=warehouses&ref=${encodeURIComponent(city.ref)}`)
      .then((r) => r.json())
      .then((j) => setWarehouses(j.items ?? []))
      .catch(() => setWarehouses([]));
  }, [city]);

  return (
    <>
      <label className={styles.field}>
        <span className={`${styles.fieldLabel} mono`}>Місто</span>
        <input
          className={styles.input}
          value={city ? city.label : cityQuery}
          onChange={(e) => { setCity(null); setWarehouse(''); setCityQuery(e.target.value); }}
        />
        {!city && cities.length > 0 && (
          <ul className={styles.ac}>
            {cities.map((c) => (
              <li key={c.ref} className={styles.acItem}
                onClick={() => { setCity(c); setCities([]); onSelect(c.label, c.ref, ''); }}>
                {c.label}
              </li>
            ))}
          </ul>
        )}
      </label>

      <label className={styles.field}>
        <span className={`${styles.fieldLabel} mono`}>Відділення / поштомат Нової Пошти</span>
        <select
          className={styles.input}
          value={warehouse}
          disabled={!city}
          onChange={(e) => { setWarehouse(e.target.value); if (city) onSelect(city.label, city.ref, e.target.value); }}
        >
          <option value="">{city ? 'Оберіть зі списку' : 'Спочатку оберіть місто'}</option>
          {warehouses.map((w) => <option key={w.ref} value={w.label}>{w.label}</option>)}
        </select>
      </label>
    </>
  );
}
