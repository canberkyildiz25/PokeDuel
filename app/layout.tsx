import type { Metadata, Viewport } from 'next';
import { Big_Shoulders, Courier_Prime } from 'next/font/google';
import { ViewTransition, type ReactNode } from 'react';
import { Footer } from '@/components/Footer';
import { Masthead } from '@/components/Masthead';
import { Start } from '@/components/Start';
import { AUTHOR, DESCRIPTION, SITE } from '@/lib/site';
import './globals.css';

/* Two families. Big Shoulders is a condensed poster face, drawn after the
   lettering of signs: it is everything written on the cloth, and every
   heading. Courier Prime is a typewriter: it is everything on paper. */
const shoulders = Big_Shoulders({ subsets: ['latin', 'latin-ext'], variable: '--font-shoulders', display: 'swap' });
const courier = Courier_Prime({ subsets: ['latin', 'latin-ext'], weight: ['400', '700'], variable: '--font-courier', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'PokéDuel · Kart düellosu', template: '%s · PokéDuel' },
  description: DESCRIPTION,
  authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'PokéDuel',
    title: 'PokéDuel · Kart düellosu',
    description: DESCRIPTION,
    url: '/',
    locale: 'tr_TR',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Kırmızı çuha bir masada kapalı duran beş kart ve bir turnuva fişi' }],
  },
  twitter: { card: 'summary_large_image', images: ['/og-image.jpg'] },
};

export const viewport: Viewport = { themeColor: '#7c1206', colorScheme: 'dark' };

/* Runs before first paint: says that scripts run, and whether motion is welcome. */
const BOOT = `(function(){var d=document.documentElement;d.classList.add('js');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('live')})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" className={`${shoulders.variable} ${courier.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
        <a className="skip-link" href="#main">
          Sayfaya geç
        </a>
        <Masthead />
        {/* one page gives way to the next, under a masthead that stays put */}
        <ViewTransition>{children}</ViewTransition>
        <Footer />
        <Start />
      </body>
    </html>
  );
}
