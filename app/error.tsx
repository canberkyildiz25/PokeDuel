'use client';

import Link from 'next/link';
import { CardBack } from '@/components/CardFace';

/** Something broke while a page was being drawn. The table is still there: try again, or go back to it. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="wrap lost">
      <div className="lost__card" aria-hidden="true">
        <CardBack />
      </div>
      <div>
        <h1>Masada bir şey ters gitti</h1>
        <p>Sayfa çizilirken bir hata oldu. Desten ve yarım kalan maçın tarayıcında duruyor; yeniden denemek çoğu zaman yeter.</p>
        <div className="lost__acts">
          <button type="button" className="btn btn--go" onClick={reset}>
            Yeniden dene
          </button>
          <Link className="btn btn--line" href="/">
            Masaya dön
          </Link>
        </div>
      </div>
    </main>
  );
}
