'use client';

import Link from 'next/link';
import { seatReady, useStore } from '@/lib/store';

const STAGES = [
  { key: 'kayit', href: '/kayit/', label: 'Kayıt' },
  { key: 'deste', href: '/deste/', label: 'Deste' },
  { key: 'mac', href: '/mac/', label: 'Maç' },
] as const;
export type Stage = (typeof STAGES)[number]['key'];

/** The three things that happen before and at the table, in order, with the way back to the ones already done. */
export function Stages({ at }: { at: Stage }) {
  const seat = useStore((state) => state.seat);
  const ready = useStore((state) => state.ready);
  const playing = useStore((state) => state.game !== null);
  // how far the visitor may go: a stage is open once everything before it has been chosen
  const open = !ready ? 0 : !seat.trainer ? 0 : !seatReady(seat) ? 1 : playing ? 2 : 1;
  const here = STAGES.findIndex((stage) => stage.key === at);

  return (
    <nav className="stages" aria-label="Maça giden adımlar">
      <ol>
        {STAGES.map((stage, index) => (
          <li key={stage.key} data-done={index < here ? '' : undefined}>
            {index === here ? (
              <span aria-current="step">
                <b className="fig">{index + 1}</b>
                {stage.label}
              </span>
            ) : index <= Math.max(open, here) && index < here ? (
              <Link href={stage.href}>
                <b className="fig">{index + 1}</b>
                {stage.label}
              </Link>
            ) : (
              <span data-later="">
                <b className="fig">{index + 1}</b>
                {stage.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
