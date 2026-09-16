import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://www.truelanded.dev';
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/free`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/pro`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
