# Sasha Chemerov Merch v3.2

Односторінковий лендинг продажу футболки Sasha Chemerov. Стек: Next.js + Vercel.

## Встановлення

```bash
npm install
```

## Змінні оточення

Скопіювати `.env.local.example` у `.env.local` і заповнити значення:
112
```bash
cp .env.local.example .env.local
```

| Змінна | Де взяти |
|--------|----------|
| `WAYFORPAY_MERCHANT_ACCOUNT` | Кабінет WayForPay — розділ "Мерчанти" |
| `WAYFORPAY_SECRET_KEY` | Кабінет WayForPay — секретний ключ мерчанта |
| `WAYFORPAY_MERCHANT_DOMAIN` | Домен сайту (за замовчуванням `isusneisus.com`) |
| `NOVAPOSHTA_API_KEY` | Кабінет Нової Пошти → Налаштування / Безпека / API |
| `TELEGRAM_BOT_TOKEN` | Створити бота через [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHAT_ID` | Додати бота в чат менеджерів, відкрити `https://api.telegram.org/bot<TOKEN>/getUpdates`, узяти `chat.id` |
| `NEXT_PUBLIC_SITE_URL` | Публічний URL сайту (`https://isusneisus.com`) |

## Команди

```bash
npm run dev    # локальна розробка
npm test       # запуск тестів
npm run build  # продакшн-збірка
```

## Деплой

Проєкт деплоїться на Vercel. Усі змінні з `.env.local.example` треба додати в налаштуваннях проєкту Vercel (Settings → Environment Variables).

У кабінеті WayForPay вказати:
- `serviceUrl = https://isusneisus.com/api/wayforpay-callback`
- Увімкнути фіскалізацію (пРРО)

## Кеш медіа

Медіа і шрифти з `public/` (відео, картинки, `.ttf`/`.woff2`) віддаються з
`Cache-Control: public, max-age=31536000, immutable` — браузер рік не робить
повторних запитів (див. `next.config.ts` → `headers()`).

**Правило: заміняєш файл — міняєш імʼя.** `tshirt.mp4` → `tshirt-v2.mp4`
плюс онови посилання в коді. Інакше відвідувачі, які вже були на сайті,
рік бачитимуть стару версію. Це стосується і `npm run optimize:images` —
він пише у фіксовані імена (`front.webp`, `back.webp`, `logo.png`…), тож
після перегенерації з новими вихідниками перейменуй результат.
