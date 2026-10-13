/* What a match is made of. Nothing in this folder knows about the screen: the
   same functions are run by the page, by the opponent when it thinks, and by
   the tests. The rules are those of the Pokémon Trading Card Game as played
   with Sword & Shield cards. */

export const KINDS = ['Fire', 'Water', 'Grass', 'Lightning', 'Psychic', 'Fighting', 'Darkness', 'Metal', 'Dragon', 'Colorless'] as const;
export type Kind = (typeof KINDS)[number];

/** The five Special Conditions. Asleep, Confused and Paralyzed turn the card, so a Pokémon has at most one of them. */
export type Condition = 'asleep' | 'burned' | 'confused' | 'paralyzed' | 'poisoned';
export type Turned = 'asleep' | 'confused' | 'paralyzed';

/* What an attack does besides its printed damage. Each of these is one
   instruction as it is worded on the cards; the list is the instructions the
   cards in this game use. */
export type Effect =
  | { t: 'flipMore'; add: number }
  | { t: 'flipFail' }
  | { t: 'flipTimes'; coins: number; each: number }
  | { t: 'ifDamaged'; add: number }
  | { t: 'ifOppDamaged'; add: number }
  | { t: 'ifOppV'; add: number }
  | { t: 'ifOppAiling'; add: number }
  | { t: 'perCounterSelf'; each: number; plus: boolean }
  | { t: 'perEnergySelf'; each: number; kind: Kind | null; plus: boolean }
  | { t: 'ignoreW' }
  | { t: 'status'; status: Condition; flip?: boolean; counters?: number }
  | { t: 'statusSelf'; status: Condition }
  | { t: 'recoil'; amount: number; flipTails?: boolean }
  | { t: 'heal'; amount: number }
  | { t: 'discardSelf'; count: number | 'all'; kind: Kind | null }
  | { t: 'discardOpp'; flip?: boolean }
  | { t: 'bench'; amount: number; scope: 'one' | 'two' | 'each' }
  | { t: 'snipe'; amount: number; bench: boolean }
  | { t: 'gust'; then: number }
  | { t: 'call'; count: number }
  | { t: 'draw'; count: number }
  | { t: 'less'; amount: number }
  | { t: 'protect'; flip: boolean }
  | { t: 'lock'; attack?: string }
  | { t: 'trap' }
  | { t: 'millOpp'; count: number }
  | { t: 'switchSelf'; may?: boolean };

export interface Attack {
  name: string;
  /** One entry for each Energy the attack needs; Colorless is paid with any. */
  cost: Kind[];
  damage: number;
  /** What is printed after the number: nothing, a plus or a times sign. */
  mark: '' | '+' | '×';
  effects: Effect[];
  /** The words on the card, as printed. */
  text: string;
}

export interface PokemonCard {
  id: string;
  name: string;
  sort: 'pokemon';
  stage: 'basic' | 'stage1' | 'stage2' | 'vmax';
  /** The name of the Pokémon this one is put on top of. */
  from: string | null;
  hp: number;
  type: Kind;
  rule: null | 'v' | 'vmax';
  /** How many Prize cards the opponent takes when it is Knocked Out. */
  prize: 1 | 2 | 3;
  attacks: Attack[];
  weak: Kind | null;
  resist: Kind | null;
  retreat: number;
  rarity: string;
  small: string;
  large: string;
}
export type TrainerEffect = 'research' | 'hop' | 'marnie' | 'boss' | 'lady' | 'potion' | 'switch' | 'quickball' | 'incense' | 'energysearch' | 'greatball' | 'hammer' | 'catcher' | 'retrieval';
export interface TrainerCard {
  id: string;
  name: string;
  sort: 'item' | 'supporter';
  effect: TrainerEffect;
  text: string;
  small: string;
  large: string;
}
export interface EnergyCard {
  id: string;
  name: string;
  sort: 'energy';
  type: Kind;
  small: string;
  large: string;
}
export type Card = PokemonCard | TrainerCard | EnergyCard;

export interface Deck {
  id: string;
  name: string;
  type: Kind;
  /** The card on the front of the box. */
  lead: string;
  cards: [id: string, copies: number][];
}

/** A Pokémon in play, with everything that is on it. */
export interface Mon {
  /** Stays the same when the Pokémon evolves or moves, so that the page can follow it. */
  uid: number;
  /** The Pokémon cards in it, the one on top last. */
  cards: string[];
  energy: string[];
  damage: number;
  turned: Turned | null;
  burned: boolean;
  /** Damage counters put on it at each Checkup while it is Poisoned; 0 when it is not. */
  poisoned: number;
  /** The number of the turn it came into play, and of the turn it last evolved. */
  since: number;
  evolved: number;
  /** It cannot attack (or use the named attack) during the turn with this number. */
  locked: { turn: number; attack: string | null } | null;
  /** It takes this much less damage from attacks during the turn with this number. */
  less: { turn: number; amount: number } | null;
  /** All damage done to it by attacks is prevented during the turn with this number. */
  safe: number;
  /** It cannot retreat during the turn with this number. */
  trapped: number;
}

export type Who = 0 | 1;
export const other = (who: Who): Who => (who === 0 ? 1 : 0);

export interface Player {
  deck: string[];
  hand: string[];
  discard: string[];
  prizes: string[];
  active: Mon | null;
  bench: Mon[];
  /** What has been done this turn that may be done once. */
  attached: boolean;
  supporter: boolean;
  retreated: boolean;
  /** How many times the hand was shown and drawn again for want of a Basic Pokémon. */
  mulligans: number;
  /** Whether the first Active and Benched Pokémon have been put down. */
  ready: boolean;
}

/** Where on a side a Pokémon is: the Active Spot, or a place on the Bench. */
export type Spot = 'active' | number;

/* A decision the rules are waiting for. `then` says what the rules go on to
   do with the answer; it is data, so that a match can be put away and taken
   out again in the middle of one. */
export type Prompt =
  | { kind: 'setup'; who: Who }
  | { kind: 'promote'; who: Who }
  | { kind: 'mon'; who: Who; side: 'own' | 'opp'; spots: Spot[]; count: number; optional: boolean; why: Why; then: Then }
  | { kind: 'cards'; who: Who; cards: string[]; from: 'deck' | 'top' | 'discard' | 'hand'; min: number; max: number; why: Why; then: Then };
export type Why = 'boss' | 'lady' | 'potion' | 'switch' | 'quickball-cost' | 'quickball' | 'incense' | 'energysearch' | 'greatball' | 'hammer' | 'catcher' | 'retrieval' | 'bench-hit' | 'snipe' | 'gust' | 'call' | 'switch-self';
export type Then = { op: 'trainer'; effect: TrainerEffect } | { op: 'attack'; index: number; picks: Pick[] };
/** An answer already given to one of an attack's questions. */
export type Pick = { mons: Spot[] } | { cards: string[] };

export type Step = 'setup' | 'main' | 'ending' | 'checkup' | 'next' | 'over';

export interface Game {
  players: [Player, Player];
  /** Whose turn it is, and its number: the first turn of the match is 1. */
  turn: Who;
  turnNo: number;
  first: Who;
  step: Step;
  prompt: Prompt | null;
  winner: Who | null;
  why: 'prizes' | 'bench' | 'deck' | null;
  seed: number;
  /** The next number to give a Pokémon coming into play. */
  uid: number;
}

/** What a player may do with their turn. `hand` is a place in the hand. */
export type Action =
  | { do: 'setup'; active: number; bench: number[] }
  | { do: 'bench'; hand: number }
  | { do: 'evolve'; hand: number; to: Spot }
  | { do: 'attach'; hand: number; to: Spot }
  | { do: 'play'; hand: number }
  | { do: 'retreat'; to: number }
  | { do: 'attack'; index: number }
  | { do: 'end' }
  | { do: 'promote'; bench: number }
  | { do: 'pick'; mons: Spot[] }
  | { do: 'take'; cards: number[] };

/** What happened, in the order it happened: for the page to show and to write down. */
export type Event =
  | { t: 'flip'; who: Who; heads: boolean; why: 'first' | 'attack' | 'confused' | 'asleep' | 'burned' | 'card' }
  | { t: 'mulligan'; who: Who; times: number }
  | { t: 'turn'; who: Who; no: number }
  | { t: 'draw'; who: Who; count: number }
  | { t: 'bench'; who: Who; card: string; uid: number }
  | { t: 'evolve'; who: Who; card: string; uid: number; from: string }
  | { t: 'attach'; who: Who; card: string; uid: number }
  | { t: 'play'; who: Who; card: string }
  | { t: 'attack'; who: Who; uid: number; name: string; kind: Kind; target: number }
  | { t: 'nothing'; who: Who }
  | { t: 'damage'; who: Who; uid: number; amount: number; weak: boolean; resist: boolean; self: boolean }
  | { t: 'heal'; who: Who; uid: number; amount: number }
  | { t: 'condition'; who: Who; uid: number; status: Condition }
  | { t: 'cured'; who: Who; uid: number; status: Condition | 'all' }
  | { t: 'hurt'; who: Who; uid: number; status: 'poisoned' | 'burned' | 'confused'; amount: number }
  | { t: 'cannot'; who: Who; uid: number; status: 'asleep' | 'paralyzed' }
  | { t: 'ko'; who: Who; uid: number; card: string }
  | { t: 'prize'; who: Who; count: number; left: number }
  | { t: 'promote'; who: Who; uid: number }
  | { t: 'retreat'; who: Who; from: number; to: number }
  | { t: 'switch'; who: Who; uid: number; by: Who }
  | { t: 'discard'; who: Who; cards: string[]; from: 'hand' | 'deck' | 'energy' }
  | { t: 'take'; who: Who; cards: string[]; from: 'deck' | 'discard'; open: boolean }
  | { t: 'shuffle'; who: Who }
  | { t: 'guard'; who: Who; uid: number; how: 'less' | 'safe' }
  | { t: 'end'; who: Who }
  | { t: 'win'; who: Who; why: 'prizes' | 'bench' | 'deck' };

export type Level = 'easy' | 'steady' | 'sharp';
