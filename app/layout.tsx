import type { Metadata } from 'next';
import { Inter, Archivo, Oswald, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' });
const archivo = Archivo({ subsets: ['latin', 'latin-ext'], weight: ['400', '900'], variable: '--font-archivo' });
const oswald = Oswald({ subsets: ['latin', 'cyrillic'], weight: ['600', '700'], variable: '--font-oswald' });
const mono = IBM_Plex_Mono({ subsets: ['latin', 'cyrillic'], weight: ['400', '500'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'too much яром too much долиною — Sasha Chemerov',
  description: 'Дроп 01 — оверсайз-футболка від Саші Чемерова та гурту «Димна Суміш».',
  metadataBase: new URL('https://isusneisus.com'),
  openGraph: {
    title: 'too much яром too much долиною — Sasha Chemerov',
    description: 'Дроп 01 — оверсайз-футболка.',
    images: ['/hero.jpg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={`${inter.variable} ${archivo.variable} ${oswald.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
