import type { Metadata } from 'next';
import Link from 'next/link';
import { CardBack } from '@/components/CardFace';

export const metadata: Metadata = { title: 'Böyle bir sayfa yok', robots: { index: false } };

export default function NotFound() {
  return (
    <main id="main" className="wrap lost">
      <div className="lost__card" aria-hidden="true">
        <CardBack />
      </div>
      <div>
        <h1>Bu kart destede yok</h1>
        <p>Aradığın adres bu masada bir yere çıkmıyor. Yanlış yazılmış ya da kaldırılmış olabilir.</p>
        <div className="lost__acts">
          <Link className="btn btn--go" href="/">
            Masaya dön
          </Link>
          <Link className="btn btn--line" href="/kurallar/">
            Kurallar
          </Link>
        </div>
      </div>
    </main>
  );
}
