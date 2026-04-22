import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Central Altitude',
  description: 'Sistema de gestão Central Altitude',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <head>
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL || 'https://central-altitude-api.onrender.com'} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_URL || 'https://central-altitude-api.onrender.com'} />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
