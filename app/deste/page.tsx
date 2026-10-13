import type { Metadata } from 'next';
import { DeckPick } from '@/components/DeckPick';

export const metadata: Metadata = {
  title: 'Deste',
  description: 'Sekiz hazır desteden birini seç: altmışar kart, her biri bir türün etrafında kurulu.',
  alternates: { canonical: '/deste/' },
  robots: { index: false },
};

export default function Page() {
  return <DeckPick />;
}
