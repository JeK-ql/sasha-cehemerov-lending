/**
 * Футер сторінки педалі. Свідома копія Footer: /pedal має розходитись
 * візуально з головною, тому спільний компонент тут навмисно не
 * використовується. Правки одного НЕ переносяться в інший автоматично.
 */
import Link from 'next/link';
import { SOCIAL_LINKS } from '@/lib/socials';
import styles from './PedalFooter.module.css';

/** Inline-марки платіжних систем — без зовнішніх запитів, чіткі на будь-якому DPI. */
function VisaMark() {
  return (
    <svg viewBox="0 0 48 32" width="48" height="32" role="img" aria-label="Visa">
      <rect width="48" height="32" rx="4" fill="#fff" />
      <text
        x="24"
        y="21"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="13"
        fontWeight="700"
        fontStyle="italic"
        letterSpacing="1"
        fill="#1A1F71"
      >
        VISA
      </text>
    </svg>
  );
}

function MastercardMark() {
  return (
    <svg viewBox="0 0 48 32" width="48" height="32" role="img" aria-label="Mastercard">
      <rect width="48" height="32" rx="4" fill="#fff" />
      <defs>
        <clipPath id="mc-lens">
          <circle cx="20" cy="16" r="9" />
        </clipPath>
      </defs>
      <circle cx="20" cy="16" r="9" fill="#EB001B" />
      <circle cx="28" cy="16" r="9" fill="#F79E1B" />
      {/* Перетин двох кіл — амбер, обрізаний лівим колом, дає фірмову оранжеву лінзу. */}
      <circle cx="28" cy="16" r="9" fill="#FF5F00" clipPath="url(#mc-lens)" />
    </svg>
  );
}

export function PedalFooter() {
  return (
    <footer className={styles.footer}>
      {/* Legal left, socials right — edge to edge. */}
      <div className={styles.top}>
        <nav className={styles.legal} aria-label="Навігація і правова інформація">
          <Link href="/" className={styles.promo}>
            Футболка «too much яром too much долиною»
          </Link>
          <Link href="/offer">Публічна оферта</Link>
          <Link href="/returns">Умови повернення</Link>
        </nav>
        <nav className={styles.socials} aria-label="Соцмережі артиста й гурту">
          <a href="https://koskofx.top/" target="_blank" rel="noopener">
            Педаль зібрано Kosko FX
          </a>
          {SOCIAL_LINKS.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noopener" aria-label={s.name}>
              {s.label}
            </a>
          ))}
        </nav>
      </div>
      {/* Платіжні марки + гарантія безпеки — вимога WayForPay і сигнал довіри. */}
      <div className={styles.payments} aria-label="Способи оплати">
        <VisaMark />
        <MastercardMark />
        <span>Оплата захищена WayForPay</span>
      </div>
    </footer>
  );
}
