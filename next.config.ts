import path from 'node:path';
import type { NextConfig } from 'next';

/* The address the site is served from: set by hand, or the one Vercel gives
   the project, or this machine. */
const site = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

const config: NextConfig = {
  turbopack: { root: path.resolve(__dirname) },
  env: { NEXT_PUBLIC_SITE_URL: site },
  // The whole game runs in the browser, so the site is a folder of files.
  output: 'export',
  trailingSlash: true,
  // one page gives way to the next
  experimental: { viewTransition: true },
  // the cards are pictures on another site's server, shown as they come
  images: { unoptimized: true },
};

export default config;
