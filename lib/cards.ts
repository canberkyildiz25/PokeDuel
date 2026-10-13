/* The cards the game is played with, and the eight decks made of them. Both
   lists are files in the repository; each picture is on the server of the
   Pokémon TCG API and is shown as it comes. Everything a card does here is
   what is printed on it: its hit points, its attacks and what they cost, its
   Weakness, its Resistance and its Retreat Cost. */

import rawCards from './cards.json' with { type: 'json' };
import rawDecks from './decks.json' with { type: 'json' };
import { shelve } from './duel/game.ts';
import type { Card, Deck, EnergyCard, PokemonCard, TrainerCard } from './duel/types.ts';

export const CARDS = rawCards as unknown as Card[];
export const DECKS = rawDecks as unknown as Deck[];
shelve(CARDS);

const BY_ID = new Map(CARDS.map((card) => [card.id, card]));
export const cardById = (id: string) => BY_ID.get(id);
export const deckById = (id: string | null) => DECKS.find((deck) => deck.id === id);

/** A deck as the sixty cards it is, one entry for each copy. */
export const cardsOf = (deck: Deck) => deck.cards.flatMap(([id, copies]) => Array.from({ length: copies }, () => id));

/** A deck's cards in three piles, as they are listed on its box. */
export function listOf(deck: Deck) {
  const rows = deck.cards.map(([id, copies]) => ({ card: BY_ID.get(id)!, copies }));
  return {
    pokemon: rows.filter((row): row is { card: PokemonCard; copies: number } => row.card.sort === 'pokemon'),
    trainers: rows.filter((row): row is { card: TrainerCard; copies: number } => row.card.sort === 'item' || row.card.sort === 'supporter'),
    energy: rows.filter((row): row is { card: EnergyCard; copies: number } => row.card.sort === 'energy'),
  };
}

/** The five cards shown lying on the table on the front page: the leads of five decks. */
export const SHOWN = ['dalga', 'alev', 'simsek', 'zihin', 'celik'].map((id) => BY_ID.get(deckById(id)?.lead ?? '')).filter((card): card is PokemonCard => card?.sort === 'pokemon');
