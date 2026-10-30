import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vahan AI | Vehicle Verification',
  description: 'Secure, RC-first vehicle verification for authorized agents.',
  robots: { index: false, follow: false },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/vahan-192.svg',
    apple: '/icons/vahan-192.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Vahan AI',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
