'use client';

import { SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sound } from '@/lib/sound';
import { toggleSound, useStore } from '@/lib/store';

const WAYS = [
  { href: '/kurallar/', label: 'Kurallar' },
  { href: '/kunye/', label: 'Künye' },
];

/** The head of every page: the name of the game, the two pages that are read, and the switch for the sounds. */
export function Masthead() {
  // with its closing slash, whichever way the server was given it
  const path = usePathname().replace(/\/?$/, '/');
  const on = useStore((state) => (state.ready ? state.sound : true));

  return (
    <header className="mast">
      <div className="wrap mast__in">
        <Link className="wordmark" href="/" aria-label="PokéDuel, ana sayfa">
          PokéDuel
        </Link>
        <nav className="mast__ways" aria-label="Site">
          {WAYS.map((way) => (
            <Link key={way.href} href={way.href} aria-current={path === way.href ? 'page' : undefined}>
              <span>{way.label}</span>
            </Link>
          ))}
          <button
            type="button"
            className="iconbtn"
            aria-pressed={on}
            aria-label={on ? 'Sesleri kapat' : 'Sesleri aç'}
            onClick={() => {
              toggleSound();
              // heard only when it has just been switched on
              sound.token();
            }}
          >
            {on ? <SpeakerHigh size={22} aria-hidden="true" /> : <SpeakerSlash size={22} aria-hidden="true" />}
          </button>
        </nav>
      </div>
    </header>
  );
}
