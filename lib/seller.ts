/**
 * Реквізити продавця — єдине джерело для футера, оферти й сторінки повернень.
 * Значення у форматі 【…】 — плейсхолдери до отримання даних від команди.
 * Дані заповнені 2026-07-15 зі слів команди й підтверджені:
 * РНОКПП звірено (2990129357), юр. адресу доповнено містом та індексом.
 * СВІДОМО НЕ зберігаємо тут паспорт, дату народження, орган видачі, IBAN —
 * ці дані йдуть лише у приватний кабінет WayForPay / договір, не на сайт.
 * Телефон і Telegram на сайті не публікуємо — єдиний публічний канал — e-mail.
 */
export const SELLER = {
  name: 'ФОП Чемеров Олександр Валерійович',
  taxId: '2990129357',
  legalAddress: 'вул. Шевченка, 21, м. Чернігів, 14000',
  actualAddress: 'збігається з юридичною',
  email: 'sashastandout@gmail.com',
} as const;

const isPlaceholder = (v: string) => v.includes('【');

/** Обовʼязкові для оферти/модерації поля. */
const REQUIRED_KEYS = [
  'name', 'taxId', 'legalAddress', 'actualAddress', 'email',
] as const;

export const SELLER_HAS_PLACEHOLDERS = REQUIRED_KEYS.some((k) =>
  isPlaceholder(SELLER[k]),
);

/** Футер показує рядок контактів, щойно email — реальний. */
export const FOOTER_CONTACTS_READY = !isPlaceholder(SELLER.email);
