import type { MetadataRoute } from 'next';
import { DESCRIPTION } from '@/lib/site';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PokéDuel',
    short_name: 'PokéDuel',
    description: DESCRIPTION,
    lang: 'tr',
    start_url: '/',
    display: 'standalone',
    background_color: '#7c1206',
    theme_color: '#7c1206',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
