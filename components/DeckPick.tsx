'use client';

import { X } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { cardById, deckById, DECKS, listOf } from '@/lib/cards';
import type { Card, Deck, PokemonCard } from '@/lib/duel/types';
import { trainerById } from '@/lib/people';
import { sound } from '@/lib/sound';
import { begin, seatReady, setDeck, useStore } from '@/lib/store';
import { LEVEL } from '@/lib/words';
import { KindTag } from './Bits';
import { CardFace } from './CardFace';
import { CardSheet } from './CardSheet';
import { Stages } from './Stages';

/** The Pokémon a deck is known by: the three with the most hit points, each line once. */
const stars = (deck: Deck) =>
  listOf(deck)
    .pokemon.map((row) => row.card)
    .sort((a, b) => b.hp - a.hp)
    .slice(0, 3)
    .map((card) => card.name)
    .join(', ');
const count = (rows: { copies: number }[]) => rows.reduce((sum, row) => sum + row.copies, 0);

/** Everything in a deck, laid out to be looked through. */
function DeckList({ deck, onClose, onLook }: { deck: Deck | null; onClose: () => void; onLook: (card: Card) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (deck && !element.open) element.showModal();
    if (!deck && element.open) element.close();
  }, [deck]);
  const list = deck ? listOf(deck) : null;

  return (
    <dialog ref={dialog} className="sheetbox sheetbox--wide" aria-label={deck ? `${deck.name} destesinin içindekiler` : undefined} onClose={onClose} onClick={(event) => event.target === dialog.current && onClose()}>
      {deck && list && (
        <div className="paper decklist">
          <div className="sheetbox__top">
            <h2>{deck.name} destesi</h2>
            <button type="button" className="iconbtn" aria-label="Kapat" onClick={onClose}>
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          {(
            [
              ['Pokémon', list.pokemon],
              ['Antrenör', list.trainers],
              ['Enerji', list.energy],
            ] as const
          ).map(([title, rows]) => (
            <section key={title}>
              <h3 className="printed">
                {title} · {count(rows)}
              </h3>
              <ul className="decklist__cards">
                {rows.map(({ card, copies }) => (
                  <li key={card.id}>
                    <button type="button" className="decklist__card" onClick={() => onLook(card)} aria-label={`${card.name}, ${copies} adet: yakından bak`}>
                      <CardFace card={card.sort === 'pokemon' ? { ...card, kind: card.type } : card} sizes="7rem" />
                      <b className="fig decklist__copies">×{copies}</b>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </dialog>
  );
}

/* Choosing a deck. There are eight, sixty cards each, each built round one
   kind of Pokémon; the cards in them are real ones and do what is printed on
   them. Then the match is dealt. */
export function DeckPick() {
  const router = useRouter();
  const ready = useStore((state) => state.ready);
  const seat = useStore((state) => state.seat);
  const [open, setOpen] = useState<Deck | null>(null);
  const [looking, setLooking] = useState<Card | null>(null);

  // no deck before a name on the sheet
  useEffect(() => {
    if (ready && !trainerById(seat.trainer)) router.replace('/kayit/');
  }, [ready, seat.trainer, router]);

  const me = trainerById(ready ? seat.trainer : null);
  const rival = trainerById(me?.rival ?? null);
  const chosen = deckById(ready ? seat.deck : null);

  return (
    <main id="main" className="wrap">
      <Stages at="deste" />
      <header className="page-head">
        <h1>Desteni seç</h1>
        <p>Sekiz hazır deste var: altmışar kart, her biri bir türün etrafında kurulu. Kartlar gerçek kartlar; canları, saldırıları ve bedelleri üstlerinde yazdığı gibi.</p>
      </header>

      <form
        className="deckpick"
        onSubmit={(event) => {
          event.preventDefault();
          if (!begin()) return;
          sound.coin();
          router.push('/mac/');
        }}
      >
        <fieldset className="decks">
          <legend className="sr-only">Deste</legend>
          {DECKS.map((deck, index) => {
            const lead = cardById(deck.lead) as PokemonCard;
            const list = listOf(deck);
            return (
              <div key={deck.id} className="deckbox" data-kind={deck.type} data-picked={seat.deck === deck.id && ready ? '' : undefined}>
                <label>
                  <input
                    type="radio"
                    name="deck"
                    value={deck.id}
                    checked={ready && seat.deck === deck.id}
                    onChange={() => {
                      setDeck(deck.id);
                      sound.card();
                    }}
                  />
                  <span className="deckbox__stack" data-lean={index % 2 ? 'right' : 'left'}>
                    <CardFace card={{ ...lead, kind: lead.type }} sizes="(min-width: 64rem) 12rem, 40vw" lead={index < 4} />
                  </span>
                  <span className="deckbox__name">{deck.name}</span>
                  <KindTag kind={deck.type} />
                  <span className="deckbox__stars">{stars(deck)}</span>
                  <span className="deckbox__counts fig">
                    {count(list.pokemon)} Pokémon · {count(list.trainers)} Antrenör · {count(list.energy)} Enerji
                  </span>
                </label>
                <button type="button" className="link deckbox__open" onClick={() => setOpen(deck)}>
                  İçindekiler<span className="sr-only">: {deck.name}</span>
                </button>
              </div>
            );
          })}
        </fieldset>

        <div className="paper pairing">
          <h2 className="paper__head">Eşleşme</h2>
          <dl>
            <div>
              <dt className="printed">Sen</dt>
              <dd>{me?.name ?? ''}</dd>
            </div>
            <div>
              <dt className="printed">Rakip</dt>
              <dd>{rival?.name ?? ''}</dd>
            </div>
            <div>
              <dt className="printed">Tur</dt>
              <dd>{LEVEL[seat.level].name}</dd>
            </div>
            <div>
              <dt className="printed">Desten</dt>
              <dd>{chosen?.name ?? '—'}</dd>
            </div>
          </dl>
          <p>Rakibin kendi sevdiği türden bir deste alır. Yedişer kart çekilir, altışar ödül kartı ayrılır; ilk turu yazı tura belirler.</p>
          <button type="submit" className="btn" disabled={!ready || !seatReady(seat)}>
            Maça başla
          </button>
          <p className="pairing__hint" aria-live="polite">
            {chosen ? `${chosen.name} destesiyle oynuyorsun.` : 'Önce bir deste seç.'}
          </p>
        </div>
      </form>
      <div className="page-foot" />

      <DeckList deck={open} onClose={() => setOpen(null)} onLook={setLooking} />
      <CardSheet card={looking} onClose={() => setLooking(null)} />
    </main>
  );
}
