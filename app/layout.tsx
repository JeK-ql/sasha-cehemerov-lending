import type { Metadata, Viewport } from 'next';
import { Inter, Montserrat, Oswald, IBM_Plex_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' });
const display = Montserrat({ subsets: ['latin', 'cyrillic'], weight: ['900'], variable: '--font-display' });
const oswald = Oswald({ subsets: ['latin', 'cyrillic'], weight: ['600', '700'], variable: '--font-oswald' });
const mono = IBM_Plex_Mono({ subsets: ['latin', 'cyrillic'], weight: ['400', '500'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'too much яром too much долиною — Sasha Chemerov',
  description: 'Дроп 01 — оверсайз-футболка від Саші Чемерова та гурту «Димна Суміш».',
  metadataBase: new URL('https://isusneisus.com'),
  openGraph: {
    title: 'too much яром too much долиною — Sasha Chemerov',
    description: 'Дроп 01 — оверсайз-футболка.',
    images: ['/front-without-bg-2.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#FAFAFA',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={`${inter.variable} ${display.variable} ${oswald.variable} ${mono.variable}`}>
      <body>
        {children}
        <Script src="https://secure.wayforpay.com/server/pay-widget.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
