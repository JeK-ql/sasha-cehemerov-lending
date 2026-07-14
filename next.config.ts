import type { NextConfig } from 'next';

/* CSP: дозволяємо тільки себе і WayForPay (script/frame/connect/form-action).
   'unsafe-inline' у script-src вимушений — Next.js інлайнить runtime-скрипти
   без nonce-інфраструктури; прибирати тільки разом із переходом на nonce. */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://secure.wayforpay.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self' https://secure.wayforpay.com https://api.wayforpay.com",
  "frame-src https://secure.wayforpay.com",
  "base-uri 'self'",
  "form-action 'self' https://secure.wayforpay.com",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: csp },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
