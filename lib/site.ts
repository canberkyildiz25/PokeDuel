/* The site's own address, used for canonical links and the sitemap.
   next.config.ts works it out. */
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export const NAME = 'PokéDuel';
export const DESCRIPTION = 'Tarayıcıda bir kart düellosu: beş kartlık desteni kur, matını seç, rakibinle sırayla oyna. Üç ödülü ilk alan kazanır.';

export const AUTHOR = { name: 'Canberk Yıldız', url: 'https://canberkyildiz.netlify.app' };
export const REPO = 'https://github.com/canberkyildiz25/PokeDuel';
