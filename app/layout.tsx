import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0F172A",
};

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const ibmPlexMono = IBM_Plex_Mono({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-ibm" });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.truelanded.dev'),
  title: {
    default: 'TrueLanded — Know Your True Import Cost Before You Pay',
    template: '%s | TrueLanded',
  },
  description: 'Landed cost calculator for importers: exact shipping freight, Sri Lanka customs duty, PAL & VAT in seconds. Free China sea-freight calculator; $9 one-time Pro with 14 currencies and air/sea cargo.',
  keywords: ['landed cost calculator', 'import cost calculator Sri Lanka', 'customs duty PAL VAT', 'CBM freight calculator', 'China to Sri Lanka import'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: 'https://www.truelanded.dev/',
    siteName: 'TrueLanded',
    title: 'TrueLanded — Know Your True Import Cost Before You Pay',
    description: 'Exact shipping, customs duties and taxes in seconds. Stop losing profit on hidden import costs.',
    images: [{ url: '/images/app_demo_1.png', width: 1200, height: 630, alt: 'TrueLanded calculator' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TrueLanded — Know Your True Import Cost',
    description: 'Exact shipping, customs duties and taxes in seconds.',
    images: ['/images/app_demo_1.png'],
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/images/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icon.svg',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className={`${inter.variable} ${ibmPlexMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
