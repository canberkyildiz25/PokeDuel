'use client';

/* What the browser keeps: who you sat down as, the deck you took, the match
   in progress, and the results so far. There is no server. A match that is
   interrupted is still on the table when the page is opened again. */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { cardById, cardsOf, deckById, DECKS } from './cards';
import { apply, start, topOf } from './duel/game';
import { choose } from './duel/rival';
import type { Action, Event, Game, Level, Who } from './duel/types';
import { trainerById } from './people';
import { tell } from './words';

/** One line on the match slip. */
export interface Line {
  n: number;
  turn: number;
  text: string;
  /** Whose doing it was, for the colour of the margin mark. */
  who: Who;
  loud: boolean;
}

/** The last thing that happened, for the table to act out. `n` goes up by one every time; `live` is true while it is still being shown. */
export interface Beat {
  n: number;
  events: Event[];
  live: boolean;
}

/** How long the table goes on showing things as they were while an attack is on its way, and how long what just happened stays written over the cards. */
const LANDING = 860;
const SHOWN = 1900;

interface Seat {
  trainer: string | null;
  level: Level;
  deck: string | null;
}

interface State {
  /** True once what the browser kept has been read. */
  ready: boolean;
  seat: Seat;
  rival: string | null;
  rivalDeck: string | null;
  game: Game | null;
  /** The match as the table shows it: a moment behind `game` while an attack is in the air. Never kept. */
  view: Game | null;
  slip: Line[];
  beat: Beat;
  tally: Record<Level, { won: number; lost: number }>;
  sound: boolean;
  /** Whether the coach says what can be done at each step. */
  coach: boolean;
  /** Whether the sheet that says how a match goes has been read. */
  taught: boolean;
}

const EMPTY_SEAT: Seat = { trainer: null, level: 'easy', deck: null };
const fresh = (): State => ({
  ready: false,
  seat: EMPTY_SEAT,
  rival: null,
  rivalDeck: null,
  game: null,
  view: null,
  slip: [],
  beat: { n: 0, events: [], live: false },
  tally: { easy: { won: 0, lost: 0 }, steady: { won: 0, lost: 0 }, sharp: { won: 0, lost: 0 } },
  sound: true,
  coach: true,
  taught: false,
});

export const useStore = create<State>()(
  persist(fresh, {
    name: 'pokeduel',
    version: 3,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
    // what an earlier version of the game kept is of no use to this one
    migrate: () => fresh(),
    partialize: (state) => ({ seat: state.seat, rival: state.rival, rivalDeck: state.rivalDeck, game: state.game, slip: state.slip, tally: state.tally, sound: state.sound, coach: state.coach, taught: state.taught }),
  }),
);

const set = useStore.setState;
const get = useStore.getState;

let started: Promise<void> | null = null;
/** Reads what the browser kept. Called once, when the first page opens. */
export function wake() {
  started ??= (async () => {
    await useStore.persist.rehydrate();
    set((state) => ({ ready: true, view: state.game }));
  })();
  return started;
}

/* ---------- sitting down ---------- */

export const sit = (trainer: string) => set((state) => ({ seat: { ...state.seat, trainer } }));
export const setLevel = (level: Level) => set((state) => ({ seat: { ...state.seat, level } }));
export const setDeck = (deck: string) => set((state) => ({ seat: { ...state.seat, deck } }));
export const toggleSound = () => set((state) => ({ sound: !state.sound }));
export const toggleCoach = () => set((state) => ({ coach: !state.coach }));
export const setTaught = (taught: boolean) => set({ taught });
export const seatReady = (seat: Seat) => Boolean(trainerById(seat.trainer)) && Boolean(deckById(seat.deck));

/* ---------- the match ---------- */

/** Whoever has to do something now: the player a question is put to, or the one whose turn it is. */
export const moverOf = (game: Game): Who => game.prompt?.who ?? game.turn;

const names = (state: Pick<State, 'seat' | 'rival'>): [string, string] => [trainerById(state.seat.trainer)?.name ?? 'Sen', trainerById(state.rival)?.name ?? 'Rakip'];

/** The Pokémon in play on a table, by their numbers. */
function inPlay(game: Game | null, into: Map<number, string>) {
  if (!game) return into;
  for (const player of game.players) for (const mon of [...(player.active ? [player.active] : []), ...player.bench]) into.set(mon.uid, topOf(mon).name);
  return into;
}

function written(state: Pick<State, 'seat' | 'rival' | 'slip'>, before: Game | null, after: Game, events: Event[]): Line[] {
  const who = names(state);
  // a Pokémon that has just left the table is still named by the table as it was
  const mons = inPlay(after, inPlay(before, new Map()));
  const lines: Line[] = [];
  let n = state.slip.length ? state.slip[state.slip.length - 1].n : 0;
  let turn = before?.turnNo ?? 0;
  for (const event of events) {
    if (event.t === 'turn') turn = event.no;
    // what the other side draws is its own business; that it drew is not
    const text = tell(event, who, (card) => cardById(card)?.name ?? card, (uid) => mons.get(uid) ?? 'Pokémon');
    if (!text) continue;
    n += 1;
    lines.push({ n, turn, text, who: event.who, loud: event.t === 'ko' || event.t === 'prize' || event.t === 'win' });
  }
  return lines;
}

/** Puts a new state of the match on the table, with what led to it. When that includes an attack or a Knock Out, the cards stay as they were until it has been seen. */
function show(game: Game, events: Event[], more: Partial<State>) {
  const n = get().beat.n + 1;
  const moving = typeof document !== 'undefined' && document.documentElement.classList.contains('live');
  const wait = moving && events.some((event) => event.t === 'attack' || event.t === 'ko') ? LANDING : 0;
  set({ ...more, game, beat: { n, events, live: true }, ...(wait ? {} : { view: game }) });
  if (wait) setTimeout(() => get().game === game && set({ view: game }), wait);
  setTimeout(() => get().beat.n === n && set((state) => ({ beat: { ...state.beat, live: false } })), SHOWN);
}

/** Deals a new match with the seat as it is. The opponent is the trainer's rival, with a deck of the kind they favour. */
export function begin() {
  const state = get();
  const { seat } = state;
  const me = trainerById(seat.trainer);
  const mine = deckById(seat.deck);
  if (!me || !mine) return false;
  const rival = trainerById(me.rival) ?? trainerById('gary')!;
  const others = DECKS.filter((deck) => deck.id !== mine.id);
  const liked = others.filter((deck) => rival.favours.includes(deck.type));
  const pool = liked.length ? liked : others;
  const theirs = pool[Math.floor(Math.random() * pool.length)];
  const seed = Math.floor(Math.random() * 2 ** 31);
  const { game, events } = start({ decks: [cardsOf(mine), cardsOf(theirs)], seed });
  const next = { seat, rival: rival.id, slip: [] as Line[] };
  show(game, events, { rival: rival.id, rivalDeck: theirs.id, slip: written(next, null, game, events) });
  return true;
}

/** Does one thing on the table, for whoever has the move. */
export function act(action: Action) {
  const state = get();
  if (!state.game) return;
  const { game, events } = apply(state.game, action);
  const tally = { ...state.tally };
  if (game.winner !== null) {
    const row = tally[state.seat.level];
    tally[state.seat.level] = game.winner === 0 ? { ...row, won: row.won + 1 } : { ...row, lost: row.lost + 1 };
  }
  show(game, events, { slip: [...state.slip, ...written(state, state.game, game, events)].slice(-200), tally });
}

/** The opponent's next step, when it is its move. */
export function rivalStep() {
  const state = get();
  if (!state.game || state.game.step === 'over' || moverOf(state.game) !== 1) return;
  act(choose(state.game, state.seat.level));
}

/** Clears the table. The seat stays, so the same deck can be played again. */
export const clearTable = () => set((state) => ({ game: null, view: null, slip: [], rival: null, rivalDeck: null, beat: { n: state.beat.n + 1, events: [], live: false } }));

/** Leaves the table and gives the seat up: the next visit starts from the sign-in sheet. */
export const standUp = () => set((state) => ({ game: null, view: null, slip: [], rival: null, rivalDeck: null, seat: EMPTY_SEAT, beat: { n: state.beat.n + 1, events: [], live: false } }));
