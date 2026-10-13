import type { Metadata } from 'next';
import { Table } from '@/components/duel/Table';

export const metadata: Metadata = {
  title: 'Maç',
  description: 'Masada bir maç: jeton koy, vur, kart değiştir, üç ödülü ilk sen al.',
  alternates: { canonical: '/mac/' },
  robots: { index: false },
};

export default function Page() {
  return <Table />;
}
