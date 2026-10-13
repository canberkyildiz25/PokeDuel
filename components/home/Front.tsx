'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { CardFace } from '@/components/CardFace';
import { SHOWN } from '@/lib/cards';
import { HAND, PRIZES } from '@/lib/duel/game';
import { sound } from '@/lib/sound';
import { useStore } from '@/lib/store';
import { LEVEL, LEVELS } from '@/lib/words';

/* The front page is the table before a match: the tournament's flyer lying
   on the cloth, and five cards fanned out beside it. */
export function Front() {
  const ready = useStore((state) => state.ready);
  const playing = useStore((state) => state.ready && state.game !== null && state.game.step !== 'over');
  const seated = useStore((state) => state.ready && Boolean(state.seat.trainer));
  const tally = useStore((state) => state.tally);
  const played = ready && LEVELS.some((level) => tally[level].won + tally[level].lost > 0);

  return (
    <>
      <section className="wrap front">
        <div className="paper flyer">
          <p className="printed flyer__top">
            <span>Turnuva fişi</span>
            <span>Tek masa</span>
          </p>
          <h1 className="red">PokéDuel</h1>
          <p className="flyer__say">
            Gerçek kartlarla, gerçek kurallarla: destenden {HAND} kart çek, Pokémon’larını sür, Enerji bağla, saldır. {PRIZES} ödül kartını ilk toplayan kazanır.
          </p>
          <div className="flyer__acts">
            <Link className="btn" href={playing ? '/mac/' : seated ? '/deste/' : '/kayit/'} onClick={() => sound.card()}>
              {playing ? 'Maça dön' : 'Masaya otur'}
            </Link>
            <Link className="btn btn--line" href="/kurallar/">
              Kurallar
            </Link>
          </div>
        </div>

        <ul className="fan" aria-label="Destelerden beş kart">
          {SHOWN.map((card, index) => (
            <li key={card.id} style={{ '--i': index } as CSSProperties}>
              <CardFace card={{ ...card, kind: card.type }} sizes="(min-width: 64rem) 15vw, 30vw" lead />
            </li>
          ))}
        </ul>
      </section>

      <section className="wrap after" aria-labelledby="how-title">
        <div className="paper slip">
          <h2 id="how-title" className="paper__head">
            Bir maç nasıl geçer
          </h2>
          <ol className="steps">
            <li>
              <span className="printed">Kayıt</span>
              <p>Kayıt listesinden adını seç. Rakibin, kurada karşına düşen antrenör olur.</p>
            </li>
            <li>
              <span className="printed">Deste</span>
              <p>
                Sekiz hazır desteden birini al: altmışar kart, her biri bir türün etrafında kurulu.
              </p>
            </li>
            <li>
              <span className="printed">Maç</span>
              <p>Her tur bir kart çek, bir Enerji bağla, Pokémon’larını evrimleştir ve saldır. Nakavt ettiğin her Pokémon için ödül kartı alırsın.</p>
            </li>
          </ol>
        </div>

        {played && (
          <div className="paper slip slip--tally">
            <h2 className="paper__head">Sonuçların</h2>
            <dl className="tally">
              {LEVELS.map((level) => (
                <div key={level}>
                  <dt>{LEVEL[level].name}</dt>
                  <dd className="fig">
                    {tally[level].won} galibiyet, {tally[level].lost} yenilgi
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </section>
    </>
  );
}
