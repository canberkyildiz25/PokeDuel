'use client';

import { X } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { cardById } from '@/lib/cards';
import type { Card } from '@/lib/duel/types';
import { CardFace } from '../CardFace';

/* A pile of cards spread out: to be looked through (a discard pile), or to
   take some from (a search of the deck, a card to throw away). When cards
   are being taken the dialog cannot be put aside: the rules are waiting. */
export function CardsDialog({
  title,
  cards,
  choose,
  onClose,
  onLook,
}: {
  title: string;
  /** The cards, or null when the dialog is shut. */
  cards: string[] | null;
  choose?: { min: number; max: number; can: (card: Card) => boolean; onTake: (places: number[]) => void };
  onClose?: () => void;
  onLook: (card: Card) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [taken, setTaken] = useState<number[]>([]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (cards && !element.open) element.showModal();
    if (!cards && element.open) element.close();
  }, [cards]);

  const least = choose ? Math.min(choose.min, cards?.filter((id) => choose.can(cardById(id)!)).length ?? 0) : 0;
  const take = (places: number[]) => {
    setTaken([]);
    choose?.onTake(places);
  };

  return (
    <dialog
      ref={dialog}
      className="sheetbox sheetbox--wide"
      aria-label={title}
      onCancel={(event) => choose && event.preventDefault()}
      onClose={() => {
        setTaken([]);
        onClose?.();
      }}
      onClick={(event) => !choose && event.target === dialog.current && onClose?.()}
    >
      {cards && (
        <div className="paper decklist">
          <div className="sheetbox__top">
            <h2>{title}</h2>
            {!choose && (
              <button type="button" className="iconbtn" aria-label="Kapat" onClick={onClose}>
                <X size={22} aria-hidden="true" />
              </button>
            )}
          </div>
          {cards.length === 0 && <p className="sheetbox__note">Burada alınabilecek bir kart yok.</p>}
          <ul className="decklist__cards">
            {cards.map((id, place) => {
              const card = cardById(id)!;
              const face = <CardFace card={card.sort === 'pokemon' ? { ...card, kind: card.type } : card} sizes="7rem" tilt={false} />;
              if (!choose)
                return (
                  <li key={place}>
                    <button type="button" className="decklist__card" onClick={() => onLook(card)} aria-label={`${card.name}: yakından bak`}>
                      {face}
                    </button>
                  </li>
                );
              const on = taken.includes(place);
              const allowed = choose.can(card);
              return (
                <li key={place}>
                  <button
                    type="button"
                    className="decklist__card decklist__card--pick"
                    aria-pressed={on}
                    disabled={!allowed}
                    aria-label={`${card.name}${on ? ', seçili' : ''}`}
                    onClick={() => setTaken((now) => (on ? now.filter((one) => one !== place) : choose.max === 1 ? [place] : now.length < choose.max ? [...now, place] : now))}
                  >
                    {face}
                  </button>
                </li>
              );
            })}
          </ul>
          {choose && (
            <div className="sheetbox__acts">
              <button type="button" className="btn" disabled={taken.length < Math.max(1, least)} onClick={() => take(taken)}>
                {taken.length > 1 ? `${taken.length} kartı al` : 'Seçileni al'}
              </button>
              {least === 0 && (
                <button type="button" className="btn btn--line" onClick={() => take([])}>
                  Hiçbirini alma
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
