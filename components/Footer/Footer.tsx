import Link from 'next/link';
import { SOCIAL_LINKS } from '@/lib/socials';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      {/* Legal left, socials right — edge to edge, nothing stacked in the centre. */}
      <nav className={styles.legal} aria-label="Правова інформація">
        <Link href="/offer">Публічна оферта</Link>
        <Link href="/returns">Умови повернення</Link>
      </nav>
      <nav className={styles.socials} aria-label="Соцмережі артиста й гурту">
        {SOCIAL_LINKS.map((s) => (
          <a key={s.url} href={s.url} target="_blank" rel="noopener" aria-label={s.name}>
            {s.label}
          </a>
        ))}
      </nav>
    </footer>
  );
}
