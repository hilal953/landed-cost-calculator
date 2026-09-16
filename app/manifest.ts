import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TrueLanded — Import Landed Cost Calculator',
    short_name: 'TrueLanded',
    description:
      'Calculate exact shipping fees, customs duties and taxes in seconds. Free China sea-freight calculator; $9 one-time Pro.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8FAFC',
    theme_color: '#0F172A',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/images/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/images/logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
