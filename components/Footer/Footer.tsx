import Link from 'next/link';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <span className="mono">ДИМНА СУМІШ © 2026</span>
      <nav className={styles.links}>
        <Link href="/offer" className="mono">Публічна оферта</Link>
        <Link href="/returns" className="mono">Умови повернення</Link>
      </nav>
      <span className="mono">НОВА ПОШТА · WAYFORPAY</span>
    </footer>
  );
}
