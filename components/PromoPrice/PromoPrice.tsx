import styles from './PromoPrice.module.css';

/**
 * «8500 ₴ 1̶3̶0̶0̶0̶ ₴» — акційна ціна з перекресленою старою. Шрифт і
 * кольори задає місце, де ціна стоїть: `oldClassName` — для старої.
 * Скрінрідер не озвучує закреслення, тому між цінами є прихований «замість».
 */
export function PromoPrice({
  price,
  oldPrice,
  oldClassName,
}: {
  price: number;
  oldPrice: number;
  oldClassName?: string;
}) {
  return (
    <>
      {price} ₴
      <span className={styles.visuallyHidden}> замість </span>
      <s className={oldClassName}>{oldPrice} ₴</s>
    </>
  );
}
