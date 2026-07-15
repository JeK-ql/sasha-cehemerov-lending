import type { NextConfig } from 'next';

/* CSP: дозволяємо тільки себе і WayForPay (script/frame/connect/form-action).
   'unsafe-inline' у script-src вимушений — Next.js інлайнить runtime-скрипти
   без nonce-інфраструктури; прибирати тільки разом із переходом на nonce.
   Dev-послаблення (isDev): 'unsafe-eval' потрібен React у development для
   дебаг-фіч, ws: — для HMR-вебсокета; у production обидва НЕ потрапляють. */
const isDev = process.env.NODE_ENV === 'development';

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://secure.wayforpay.com https://www.googletagmanager.com`,
  "style-src 'self' 'unsafe-inline' https://secure.wayforpay.com",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://secure.wayforpay.com",
  `connect-src 'self'${isDev ? ' ws:' : ''} https://secure.wayforpay.com https://api.wayforpay.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com`,
  "frame-src https://secure.wayforpay.com",
  "base-uri 'self'",
  "form-action 'self' https://secure.wayforpay.com",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
];

/* Медіа і шрифти з public/ кешуються браузером на рік без revalidation.
   ПРАВИЛО: заміняєш файл — міняєш імʼя файлу (див. README «Кеш медіа»),
   інакше відвідувачі рік бачитимуть стару версію. */
const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: IMMUTABLE_CACHE }],
      },
      {
        source: '/fonts-new/:path*',
        headers: [{ key: 'Cache-Control', value: IMMUTABLE_CACHE }],
      },
      {
        // Медіа-файли в корені public/ (tshirt.mp4, video.jpg, *.webp, logo.png…)
        // УВАГА: цей паттерн зловить і майбутні динамічні роути App Router з
        // такими розширеннями в корені (напр. opengraph-image.png) — якщо
        // з'явиться такий роут, виключи його тут окремо.
        source: '/:file([^/]+\\.(?:mp4|webp|jpe?g|png))',
        headers: [{ key: 'Cache-Control', value: IMMUTABLE_CACHE }],
      },
    ];
  },
};

export default nextConfig;
