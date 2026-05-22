import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <span className={`${styles.sub} mono`}>димна суміш</span>
        <span className={`${styles.name} display`}>САША ЧЄМЄРОВ</span>
      </div>
      <span className={`${styles.drop} mono`}>DROP 01 // ONE SIZE (OVERSIZE)</span>
    </header>
  );
}
