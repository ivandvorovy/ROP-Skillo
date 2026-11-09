import type { Metadata } from 'next';
import { Inter, Inter_Tight } from 'next/font/google';
import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/site-header';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

// latin-ext kvôli slovenskej diakritike (ľ, ť, ô, ŕ...).
// Nadpisy: Inter Tight v hrubom reze s tesným riadkovaním (ťažká grotesk ako Preply).
const heading = Inter_Tight({
  subsets: ['latin', 'latin-ext'],
  weight: ['700', '800'],
  variable: '--font-heading',
  display: 'swap',
});
const body = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Skillo',
  description: 'Výmena zručností medzi študentmi za body.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sk" className={`${heading.variable} ${body.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <AuthProvider>
          <SiteHeader />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
