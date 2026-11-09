import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Skillo',
  description: 'Výmena zručností medzi študentmi za body.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sk">
      <body>{children}</body>
    </html>
  );
}
