import type { Metadata, Viewport } from "next";
import ServiceWorkerRegister from "./ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "VAHAN AI | Independent Vehicle Information Platform",
  description: "A modern vehicle intelligence platform for RC details, owner information, previous insurance, claim support and vehicle history.",
  applicationName: "VAHAN AI",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VAHAN AI"
  },
  icons: {
    icon: [{ url: "/icons/vahan-ai.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/vahan-ai.svg", type: "image/svg+xml" }]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#080d1b"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
