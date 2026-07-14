import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Саша Чемеров — Димна Суміш"
        width={495}
        height={140}
        className={styles.logo}
      />
      <span className={`${styles.drop} mono`}>DROP 01 // МАЛЕНЬКИЙ · СЕРЕДНІЙ · ВЕЛИКИЙ</span>
    </header>
  );
}
