import type { Metadata, Viewport } from 'next';
import { Inter, Montserrat, Oswald, IBM_Plex_Mono } from 'next/font/google';
import Script from 'next/script';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';
import { organizationLd, productLd, PRODUCT_IMAGE_JPG } from '@/lib/structuredData';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' });
const display = Montserrat({ subsets: ['latin', 'cyrillic'], weight: ['900'], variable: '--font-display' });
const oswald = Oswald({ subsets: ['latin', 'cyrillic'], weight: ['600', '700'], variable: '--font-oswald' });
const mono = IBM_Plex_Mono({ subsets: ['latin', 'cyrillic'], weight: ['400'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'too much яром too much долиною - мерч Sasha Chemerov × Димна Суміш',
  description:
    'Оверсайз-футболка «too much яром too much долиною» - лімітований дроп 01 Sasha Chemerov × Димна Суміш. 2600 ₴, доставка Новою Поштою по Україні, оплата карткою через WayForPay.',
  metadataBase: new URL('https://isusneisus.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'too much яром too much долиною - мерч Sasha Chemerov × Димна Суміш',
    description:
      'Лімітований дроп 01. 2600 ₴, доставка Новою Поштою по Україні.',
    url: 'https://isusneisus.com/',
    siteName: 'isusneisus.com',
    locale: 'uk_UA',
    type: 'website',
    images: [PRODUCT_IMAGE_JPG],
  },
};

export const viewport: Viewport = {
  themeColor: '#FAFAFA',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html
      lang="uk"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${display.variable} ${oswald.variable} ${mono.variable}`}
    >
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
        />
        <Script src="https://secure.wayforpay.com/server/pay-widget.js" strategy="lazyOnload" />
        {gaId && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  );
}
