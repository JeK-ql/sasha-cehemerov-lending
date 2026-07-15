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
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
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

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
