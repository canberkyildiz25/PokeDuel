/* Who sits at the table, and what lies on it. A trainer here is a name on the
   sign-in sheet, the kinds they lean towards, and the stamp they sign with.
   The stamps are this project's own: two letters in a ring. */

import type { Kind } from './duel/types.ts';

export interface Trainer {
  id: string;
  name: string;
  /** The letters in their stamp. */
  mark: string;
  favours: Kind[];
  /** Who they are drawn against. */
  rival: string;
}

export const TRAINERS: Trainer[] = [
  { id: 'ash', name: 'Ash', mark: 'AK', favours: ['Lightning', 'Fire'], rival: 'gary' },
  { id: 'misty', name: 'Misty', mark: 'MS', favours: ['Water'], rival: 'giovanni' },
  { id: 'brock', name: 'Brock', mark: 'BR', favours: ['Fighting', 'Colorless'], rival: 'erika' },
  { id: 'gary', name: 'Gary', mark: 'GO', favours: ['Colorless', 'Fire', 'Water'], rival: 'ash' },
  { id: 'erika', name: 'Erika', mark: 'ER', favours: ['Grass'], rival: 'blaine' },
  { id: 'surge', name: 'Surge', mark: 'LS', favours: ['Lightning'], rival: 'misty' },
  { id: 'sabrina', name: 'Sabrina', mark: 'SB', favours: ['Psychic'], rival: 'koga' },
  { id: 'blaine', name: 'Blaine', mark: 'BL', favours: ['Fire'], rival: 'misty' },
  { id: 'koga', name: 'Koga', mark: 'KG', favours: ['Darkness', 'Psychic'], rival: 'erika' },
  { id: 'giovanni', name: 'Giovanni', mark: 'GV', favours: ['Darkness', 'Metal'], rival: 'ash' },
];

export const trainerById = (id: string | null) => TRAINERS.find((trainer) => trainer.id === id);

/* The playmats. A mat is laid over the baize under a match; it changes
   nothing in the rules. Which one is laid follows the kind of the deck that
   is being played, and each has its own print (drawn in the stylesheet). */
export const MAT_OF: Record<Kind, { id: string; name: string }> = {
  Fire: { id: 'krater', name: 'Krater' },
  Water: { id: 'koy', name: 'Koy' },
  Grass: { id: 'cayir', name: 'Çayır' },
  Lightning: { id: 'firtina', name: 'Fırtına' },
  Psychic: { id: 'gecit', name: 'Geçit' },
  Fighting: { id: 'ocak', name: 'Taş ocağı' },
  Darkness: { id: 'sis', name: 'Sis' },
  Metal: { id: 'tersane', name: 'Tersane' },
  Dragon: { id: 'cuha', name: 'Düz çuha' },
  Colorless: { id: 'cuha', name: 'Düz çuha' },
};
