import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VAHAN AI | Independent Vehicle Information Platform',
  description: 'A modern vehicle intelligence platform for RC details, owner information, previous insurance, claim support and vehicle history.',
  applicationName: 'VAHAN AI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
