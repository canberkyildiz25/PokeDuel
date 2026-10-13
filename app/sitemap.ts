import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export const dynamic = 'force-static';

/** The pages worth finding. The deck, the mat and the match belong to whoever is sitting down, and are left out. */
export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/kayit/', '/kurallar/', '/kunye/'].map((path) => ({ url: `${SITE}${path}`, changeFrequency: 'monthly', priority: path === '/' ? 1 : 0.6 }));
}
