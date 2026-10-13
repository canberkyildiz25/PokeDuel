import type { CSSProperties } from 'react';
import type { Kind } from '@/lib/duel/types';
import { KIND } from '@/lib/words';

/** Energy, as glass beads in the colours of its kinds: what an attack costs, or what is attached to a Pokémon. `paid` leaves the last ones hollow. */
export function Pips({ kinds, paid, label }: { kinds: Kind[]; paid?: number; label?: string }) {
  if (!kinds.length) return <span className="pips pips--none">{label ?? 'Enerji yok'}</span>;
  return (
    <span className="pips" role="img" aria-label={label ?? `${kinds.length} Enerji: ${kinds.map((kind) => KIND[kind]).join(', ')}`}>
      {kinds.map((kind, index) => (
        <i key={index} className={paid !== undefined && index >= paid ? 'bead bead--none' : 'bead'} data-kind={kind} />
      ))}
    </span>
  );
}

/** A kind, as its bead and its name. */
export function KindTag({ kind }: { kind: Kind }) {
  return (
    <span className="kind" data-kind={kind}>
      <i className="bead" aria-hidden="true" />
      {KIND[kind]}
    </span>
  );
}

/** A trainer's stamp: their two letters in a ring. */
export function Stamp({ mark, big = false, lean = -7 }: { mark: string; big?: boolean; lean?: number }) {
  return (
    <span className={big ? 'stamp stamp--big' : 'stamp'} style={{ '--lean': `${lean}deg` } as CSSProperties} aria-hidden="true">
      {mark}
    </span>
  );
}
