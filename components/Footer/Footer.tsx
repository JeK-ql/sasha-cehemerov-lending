import Link from 'next/link';
import { SELLER } from '@/lib/seller';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.linksRow}>
        <Link href="/offer">Публічна оферта</Link>
        <Link href="/returns">Умови повернення</Link>
      </div>
      <div className={styles.requisites}>
        <span>
          {SELLER.name} · РНОКПП {SELLER.taxId}
        </span>
        <span>
          Юридична адреса: {SELLER.legalAddress} · Фактична адреса: {SELLER.actualAddress}
        </span>
        <span>
          <a href={`tel:${SELLER.phone}`}>{SELLER.phone}</a>
          {' · '}
          <a href={`mailto:${SELLER.email}`}>{SELLER.email}</a>
        </span>
      </div>
    </footer>
  );
}
