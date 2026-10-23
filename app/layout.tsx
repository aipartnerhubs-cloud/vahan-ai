import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vahan AI',
  description: 'RC-first vehicle information and verification MVP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
