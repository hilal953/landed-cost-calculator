import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://www.truelanded.dev';
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/free`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    // /pro is license-gated behind a login wall — keep it out of the index.
  ];
}
