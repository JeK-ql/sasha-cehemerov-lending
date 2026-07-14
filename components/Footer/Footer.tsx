import Link from 'next/link';
import { SELLER, SELLER_HAS_PLACEHOLDERS } from '@/lib/seller';
import { SOCIAL_LINKS } from '@/lib/socials';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.linksRow}>
        <Link href="/offer">Публічна оферта</Link>
        <nav className={styles.socials} aria-label="Соцмережі артиста й гурту">
          {SOCIAL_LINKS.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noopener" aria-label={s.name}>
              {s.label}
            </a>
          ))}
        </nav>
        <Link href="/returns">Умови повернення</Link>
      </div>
      {!SELLER_HAS_PLACEHOLDERS && (
        <div className={styles.contacts}>
          <a href={`tel:${SELLER.phone}`}>{SELLER.phone}</a>
          {' · '}
          <a href={`mailto:${SELLER.email}`}>{SELLER.email}</a>
        </div>
      )}
    </footer>
  );
}
