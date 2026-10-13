/* The rules of the match: the Pokémon Trading Card Game as it is played with
   Sword & Shield cards. Sixty-card decks, a hand of seven, six Prize cards,
   one Energy a turn, Weakness ×2, Resistance −30, the five Special Conditions
   and the Pokémon Checkup between turns.

   Everything here is a plain function of the table. A match is started with
   `start`, and from then on `apply` takes the table and one action and gives
   back a new table and the list of what happened. When the rules need a
   decision in the middle of something (which Pokémon to bring up, which card
   to take from the deck) they leave a `prompt` on the table and wait.

   Where this differs from the printed rulebook, on purpose: whoever wins the
   opening coin flip goes first; Prize cards are taken from the top of the
   pile (they are face down and shuffled, so it is the same thing); a player
   always takes the cards a mulligan entitles them to; the Energy paid to
   retreat is picked for the player; and a match that both players win at
   the same moment goes to whoever met more of the winning conditions, then
   to the player whose turn it is, instead of to a Sudden Death match. */

import { other, type Action, type Attack, type Card, type Condition, type EnergyCard, type Event, type Game, type Kind, type Mon, type Pick, type Player, type PokemonCard, type Prompt, type Spot, type Then, type TrainerCard, type TrainerEffect, type Who, type Why } from './types.ts';

export const PRIZES = 6;
export const HAND = 7;
export const BENCH = 5;
export const WEAKNESS = 2;
export const RESISTANCE = 30;
export const POISON = 10;
export const BURN = 20;
export const CONFUSION = 30;

/* ---------- the book of cards ---------- */

const BOOK = new Map<string, Card>();
/** Puts cards where the rules can look them up by their number. */
export function shelve(cards: Card[]) {
  for (const card of cards) BOOK.set(card.id, card);
}
export function cardOf(id: string): Card {
  const card = BOOK.get(id);
  if (!card) throw new Error(`There is no card ${id}`);
  return card;
}
export const pokemonOf = (id: string) => cardOf(id) as PokemonCard;
/** The card on top of a Pokémon in play: the one whose attacks and hit points count. */
export const topOf = (mon: Mon) => pokemonOf(mon.cards[mon.cards.length - 1]);
export const hpLeft = (mon: Mon) => Math.max(0, topOf(mon).hp - mon.damage);
export const energyOf = (mon: Mon): Kind[] => mon.energy.map((id) => (cardOf(id) as EnergyCard).type);
export const isBasic = (id: string) => {
  const card = cardOf(id);
  return card.sort === 'pokemon' && card.stage === 'basic';
};
export const monAt = (player: Player, spot: Spot) => (spot === 'active' ? player.active : (player.bench[spot] ?? null));
export const spotsOf = (player: Player): Spot[] => [...(player.active ? (['active'] as Spot[]) : []), ...player.bench.map((_, index) => index)];
export const conditionsOf = (mon: Mon): Condition[] => [...(mon.turned ? [mon.turned] : []), ...(mon.burned ? (['burned'] as Condition[]) : []), ...(mon.poisoned ? (['poisoned'] as Condition[]) : [])];

/** Whether the Energy on a Pokémon pays for an attack: each named kind with its own, the rest with anything. */
export function pays(mon: Mon, cost: Kind[]) {
  const pool = energyOf(mon);
  for (const need of cost) {
    if (need === 'Colorless') continue;
    const at = pool.indexOf(need);
    if (at < 0) return false;
    pool.splice(at, 1);
  }
  return pool.length >= cost.filter((kind) => kind === 'Colorless').length;
}

/* ---------- the dice ---------- */

/** One step of a small generator (mulberry32): a number from 0 up to 1, and the seed to use next. */
export function roll(seed: number): [number, number] {
  const next = (seed + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** What a function that changes the table works with. */
interface Ctx {
  game: Game;
  events: Event[];
  dice: () => number;
  flip: (who: Who, why: Extract<Event, { t: 'flip' }>['why']) => boolean;
}
function context(game: Game): Ctx {
  const events: Event[] = [];
  const dice = () => {
    const [value, seed] = roll(game.seed);
    game.seed = seed;
    return value;
  };
  return {
    game,
    events,
    dice,
    flip: (who, why) => {
      const heads = dice() < 0.5;
      events.push({ t: 'flip', who, heads, why });
      return heads;
    },
  };
}
function shuffle(list: string[], ctx: Ctx) {
  for (let at = list.length - 1; at > 0; at -= 1) {
    const with_ = Math.floor(ctx.dice() * (at + 1));
    [list[at], list[with_]] = [list[with_], list[at]];
  }
}
function draw(ctx: Ctx, who: Who, count: number) {
  const player = ctx.game.players[who];
  const taken = player.deck.splice(0, Math.min(count, player.deck.length));
  player.hand.push(...taken);
  if (taken.length) ctx.events.push({ t: 'draw', who, count: taken.length });
}

/* ---------- reading the table ---------- */

const newMon = (game: Game, card: string): Mon => ({ uid: game.uid++, cards: [card], energy: [], damage: 0, turned: null, burned: false, poisoned: 0, since: game.turnNo, evolved: 0, locked: null, less: null, safe: 0, trapped: 0 });

/** A Pokémon that leaves the Active Spot, or evolves, leaves behind what was done to it there. */
function settle(mon: Mon) {
  mon.turned = null;
  mon.burned = false;
  mon.poisoned = 0;
  mon.locked = null;
  mon.less = null;
  mon.safe = 0;
  mon.trapped = 0;
}

/** Whether a card in the hand may be put on a Pokémon in play, to evolve it. */
export function evolves(game: Game, card: string, mon: Mon) {
  const up = cardOf(card);
  if (up.sort !== 'pokemon' || up.stage === 'basic') return false;
  // nobody evolves on their first turn, and a Pokémon waits a turn after coming into play or evolving
  return up.from === topOf(mon).name && game.turnNo > 2 && mon.since < game.turnNo && mon.evolved < game.turnNo;
}

export type Refusal = 'first-turn' | 'energy' | 'asleep' | 'paralyzed' | 'locked' | 'bench' | 'once' | 'trapped' | null;
/** Why an attack cannot be used now, or null when it can. */
export function attackRefusal(game: Game, who: Who, index: number): Refusal {
  const mon = game.players[who].active;
  if (!mon) return 'energy';
  const attack = topOf(mon).attacks[index];
  if (game.turnNo === 1) return 'first-turn';
  if (mon.turned === 'asleep') return 'asleep';
  if (mon.turned === 'paralyzed') return 'paralyzed';
  if (mon.locked && mon.locked.turn === game.turnNo && (mon.locked.attack === null || mon.locked.attack === attack.name)) return 'locked';
  return pays(mon, attack.cost) ? null : 'energy';
}
/** Why the Active Pokémon cannot retreat now, or null when it can. */
export function retreatRefusal(game: Game, who: Who): Refusal {
  const player = game.players[who];
  const mon = player.active;
  if (!mon || !player.bench.length) return 'bench';
  if (player.retreated) return 'once';
  if (mon.turned === 'asleep') return 'asleep';
  if (mon.turned === 'paralyzed') return 'paralyzed';
  if (mon.trapped === game.turnNo) return 'trapped';
  return mon.energy.length >= topOf(mon).retreat ? null : 'energy';
}

/** Whether a Trainer card would do anything if it were played now. */
export function playable(game: Game, who: Who, card: TrainerCard): boolean {
  const me = game.players[who];
  const them = game.players[other(who)];
  const mine = [...(me.active ? [me.active] : []), ...me.bench];
  const theirs = [...(them.active ? [them.active] : []), ...them.bench];
  // the player who goes first plays no Supporter on that first turn
  if (card.sort === 'supporter' && (me.supporter || game.turnNo === 1)) return false;
  switch (card.effect) {
    case 'research':
    case 'hop':
    case 'incense':
    case 'energysearch':
    case 'greatball':
      return me.deck.length > 0;
    case 'marnie':
      return true;
    case 'boss':
    case 'catcher':
      return them.bench.length > 0;
    case 'lady':
      return mine.some((mon) => mon.damage > 0 || conditionsOf(mon).length > 0);
    case 'potion':
      return mine.some((mon) => mon.damage > 0);
    case 'switch':
      return Boolean(me.active) && me.bench.length > 0;
    case 'quickball':
      return me.hand.length > 1 && me.deck.length > 0;
    case 'hammer':
      return theirs.some((mon) => mon.energy.length > 0);
    case 'retrieval':
      return me.discard.some((id) => cardOf(id).sort === 'energy');
  }
}

/** What an attack would do to the opponent's Active Pokémon: `damage` if every coin comes up tails, `mean` on average. */
export function forecast(game: Game, who: Who, index: number) {
  const mon = game.players[who].active;
  const target = game.players[other(who)].active;
  const none = { damage: 0, mean: 0, weak: false, resist: false };
  if (!mon) return none;
  const card = topOf(mon);
  const attack = card.attacks[index];
  let damage = attack.damage;
  let mean = attack.damage;
  let chance = 1;
  let noWeakness = false;
  const add = (amount: number) => {
    damage += amount;
    mean += amount;
  };
  for (const effect of attack.effects) {
    if (effect.t === 'ifDamaged' && mon.damage > 0) add(effect.add);
    else if (effect.t === 'ifOppDamaged' && target && target.damage > 0) add(effect.add);
    else if (effect.t === 'ifOppV' && target && topOf(target).rule) add(effect.add);
    else if (effect.t === 'ifOppAiling' && target && conditionsOf(target).length) add(effect.add);
    else if (effect.t === 'perCounterSelf') damage = mean = (effect.plus ? damage : 0) + effect.each * (mon.damage / 10);
    else if (effect.t === 'perEnergySelf') damage = mean = (effect.plus ? damage : 0) + effect.each * energyOf(mon).filter((kind) => !effect.kind || kind === effect.kind).length;
    else if (effect.t === 'flipMore') mean += effect.add / 2;
    else if (effect.t === 'flipFail') {
      damage = 0;
      chance = 0.5;
    } else if (effect.t === 'flipTimes') {
      damage = 0;
      mean = (effect.each * effect.coins) / 2;
    } else if (effect.t === 'gust') damage = mean = effect.then;
    else if (effect.t === 'ignoreW') noWeakness = true;
  }
  if (!target) return none;
  const weak = !noWeakness && topOf(target).weak === card.type;
  const resist = topOf(target).resist === card.type;
  const scaled = (amount: number) => {
    if (amount <= 0) return 0;
    let out = amount;
    if (weak) out *= WEAKNESS;
    if (resist) out -= RESISTANCE;
    if (target.less && target.less.turn === game.turnNo) out -= target.less.amount;
    if (target.safe === game.turnNo) out = 0;
    return Math.max(0, out);
  };
  return { damage: scaled(damage), mean: scaled(mean) * chance, weak, resist };
}

/** Everything the player whose move it is may do. Decisions the rules are waiting for are read off `game.prompt`. */
export function legal(game: Game): Action[] {
  if (game.step !== 'main' || game.prompt) {
    if (game.prompt?.kind === 'promote') return game.players[game.prompt.who].bench.map((_, bench) => ({ do: 'promote', bench }));
    return [];
  }
  const who = game.turn;
  const me = game.players[who];
  const actions: Action[] = [];
  const spots = spotsOf(me);
  me.hand.forEach((id, hand) => {
    const card = cardOf(id);
    if (card.sort === 'pokemon') {
      if (card.stage === 'basic') {
        if (me.bench.length < BENCH) actions.push({ do: 'bench', hand });
      } else for (const to of spots) if (evolves(game, id, monAt(me, to)!)) actions.push({ do: 'evolve', hand, to });
    } else if (card.sort === 'energy') {
      if (!me.attached) for (const to of spots) actions.push({ do: 'attach', hand, to });
    } else if (playable(game, who, card)) actions.push({ do: 'play', hand });
  });
  if (retreatRefusal(game, who) === null) me.bench.forEach((_, to) => actions.push({ do: 'retreat', to }));
  if (me.active) topOf(me.active).attacks.forEach((_, index) => attackRefusal(game, who, index) === null && actions.push({ do: 'attack', index }));
  actions.push({ do: 'end' });
  return actions;
}

/* ---------- laying the table ---------- */

const seat = (deck: string[]): Player => ({ deck, hand: [], discard: [], prizes: [], active: null, bench: [], attached: false, supporter: false, retreated: false, mulligans: 0, ready: false });

/** Shuffles both decks and deals. Each player then has to put down an Active Pokémon and any Bench: the rules wait for that with a `setup` prompt. */
export function start(input: { decks: [string[], string[]]; seed: number }): { game: Game; events: Event[] } {
  const game: Game = { players: [seat([...input.decks[0]]), seat([...input.decks[1]])], turn: 0, turnNo: 0, first: 0, step: 'setup', prompt: null, winner: null, why: null, seed: input.seed, uid: 1 };
  const ctx = context(game);
  for (const who of [0, 1] as Who[]) {
    const player = game.players[who];
    shuffle(player.deck, ctx);
    player.hand = player.deck.splice(0, HAND);
    // a hand with no Basic Pokémon is shown, shuffled back and dealt again
    while (!player.hand.some(isBasic)) {
      player.mulligans += 1;
      player.deck.push(...player.hand);
      shuffle(player.deck, ctx);
      player.hand = player.deck.splice(0, HAND);
    }
    if (player.mulligans) ctx.events.push({ t: 'mulligan', who, times: player.mulligans });
  }
  game.prompt = { kind: 'setup', who: 0 };
  return { game, events: ctx.events };
}

function beginTurn(ctx: Ctx) {
  const { game } = ctx;
  const player = game.players[game.turn];
  player.attached = false;
  player.supporter = false;
  player.retreated = false;
  ctx.events.push({ t: 'turn', who: game.turn, no: game.turnNo });
  // a player who cannot draw at the start of their turn has lost
  if (!player.deck.length) return win(ctx, other(game.turn), 'deck');
  draw(ctx, game.turn, 1);
}

function win(ctx: Ctx, who: Who, why: 'prizes' | 'bench' | 'deck') {
  ctx.game.winner = who;
  ctx.game.why = why;
  ctx.game.step = 'over';
  ctx.game.prompt = null;
  ctx.events.push({ t: 'win', who, why });
}

/* ---------- damage, and what follows from it ---------- */

function afflict(ctx: Ctx, who: Who, mon: Mon, status: Condition, counters = 1) {
  if (status === 'burned') mon.burned = true;
  else if (status === 'poisoned') mon.poisoned = Math.max(mon.poisoned, counters);
  else mon.turned = status;
  ctx.events.push({ t: 'condition', who, uid: mon.uid, status });
}

/** Damage from an attack. Weakness and Resistance count for the Active Pokémon only. */
function hit(ctx: Ctx, owner: Who, mon: Mon, base: number, by: { type: Kind; wr: boolean; noWeakness?: boolean }) {
  const card = topOf(mon);
  let amount = base;
  const weak = by.wr && !by.noWeakness && card.weak === by.type;
  const resist = by.wr && card.resist === by.type;
  if (weak) amount *= WEAKNESS;
  if (resist) amount -= RESISTANCE;
  if (mon.less && mon.less.turn === ctx.game.turnNo) amount -= mon.less.amount;
  if (mon.safe === ctx.game.turnNo) amount = 0;
  amount = Math.max(0, amount);
  mon.damage += amount;
  ctx.events.push({ t: 'damage', who: owner, uid: mon.uid, amount, weak, resist, self: false });
}

/** Takes off the table every Pokémon with no hit points left, hands out Prize cards for them, and sees whether that ends the match. */
function sweep(ctx: Ctx) {
  const { game } = ctx;
  for (const who of [other(game.turn), game.turn] as Who[]) {
    const player = game.players[who];
    const taker = game.players[other(who)];
    const fallen = [...(player.active ? [player.active] : []), ...player.bench].filter((mon) => mon.damage >= topOf(mon).hp);
    for (const mon of fallen) {
      const top = topOf(mon);
      ctx.events.push({ t: 'ko', who, uid: mon.uid, card: top.id });
      player.discard.push(...mon.cards, ...mon.energy);
      if (player.active === mon) player.active = null;
      else player.bench.splice(player.bench.indexOf(mon), 1);
      const count = Math.min(top.prize, taker.prizes.length);
      taker.hand.push(...taker.prizes.splice(0, count));
      if (count) ctx.events.push({ t: 'prize', who: other(who), count, left: taker.prizes.length });
    }
  }
  // who has won: all their Prize cards taken, or nothing left standing against them
  const met = ([0, 1] as Who[]).map((who) => {
    const rival = game.players[other(who)];
    return [game.players[who].prizes.length === 0, !rival.active && !rival.bench.length];
  });
  const score = met.map((conditions) => conditions.filter(Boolean).length);
  if (!score[0] && !score[1]) return;
  const winner: Who = score[0] === score[1] ? game.turn : score[0] > score[1] ? 0 : 1;
  win(ctx, winner, met[winner][0] ? 'prizes' : 'bench');
}

/** Between turns: Poison, then Burn, then sleepers, then the end of a paralysis. */
function checkup(ctx: Ctx) {
  const { game } = ctx;
  for (const who of [game.turn, other(game.turn)] as Who[]) {
    const mon = game.players[who].active;
    if (!mon) continue;
    if (mon.poisoned) {
      mon.damage += POISON * mon.poisoned;
      ctx.events.push({ t: 'hurt', who, uid: mon.uid, status: 'poisoned', amount: POISON * mon.poisoned });
    }
    if (mon.burned) {
      mon.damage += BURN;
      ctx.events.push({ t: 'hurt', who, uid: mon.uid, status: 'burned', amount: BURN });
      if (ctx.flip(who, 'burned')) {
        mon.burned = false;
        ctx.events.push({ t: 'cured', who, uid: mon.uid, status: 'burned' });
      }
    }
    if (mon.turned === 'asleep') {
      if (ctx.flip(who, 'asleep')) {
        mon.turned = null;
        ctx.events.push({ t: 'cured', who, uid: mon.uid, status: 'asleep' });
      }
    } else if (mon.turned === 'paralyzed' && who === game.turn) {
      // a paralysis lasts through its owner's next turn, and no longer
      mon.turned = null;
      ctx.events.push({ t: 'cured', who, uid: mon.uid, status: 'paralyzed' });
    }
  }
}

/** Carries the match on from wherever it stands until a player has to decide something. */
function proceed(ctx: Ctx) {
  const { game } = ctx;
  for (;;) {
    if (game.step === 'over' || game.prompt) return;
    // an empty Active Spot is filled before anything else: the player whose turn it is not, first
    const empty = ([other(game.turn), game.turn] as Who[]).find((who) => !game.players[who].active && game.players[who].bench.length > 0);
    if (empty !== undefined) {
      if (game.players[empty].bench.length > 1) {
        game.prompt = { kind: 'promote', who: empty };
        return;
      }
      promote(ctx, empty, 0);
      continue;
    }
    if (game.step === 'ending') {
      ctx.events.push({ t: 'end', who: game.turn });
      game.step = 'checkup';
    } else if (game.step === 'checkup') {
      checkup(ctx);
      game.step = 'next';
      sweep(ctx);
    } else if (game.step === 'next') {
      game.turn = other(game.turn);
      game.turnNo += 1;
      game.step = 'main';
      beginTurn(ctx);
    } else return;
  }
}

function promote(ctx: Ctx, who: Who, bench: number) {
  const player = ctx.game.players[who];
  const [mon] = player.bench.splice(bench, 1);
  player.active = mon;
  ctx.events.push({ t: 'promote', who, uid: mon.uid });
}

/** Brings a Benched Pokémon up and sends the Active one back to its place. */
function swap(ctx: Ctx, who: Who, bench: number, by: Who) {
  const player = ctx.game.players[who];
  const up = player.bench[bench];
  const down = player.active;
  if (!up) return;
  player.active = up;
  if (down) {
    settle(down);
    player.bench[bench] = down;
  } else player.bench.splice(bench, 1);
  ctx.events.push({ t: 'switch', who, uid: up.uid, by });
}

function heal(ctx: Ctx, who: Who, mon: Mon, amount: number) {
  const healed = Math.min(amount, mon.damage);
  mon.damage -= healed;
  if (healed) ctx.events.push({ t: 'heal', who, uid: mon.uid, amount: healed });
}

/* ---------- Trainer cards ---------- */

/** The cards in a pile that a search may take, each listed once for every copy. */
const found = (pile: string[], wanted: (card: Card) => boolean) => pile.filter((id) => wanted(cardOf(id)));

function ask(game: Game, prompt: Prompt) {
  game.prompt = prompt;
}

/** Plays a Trainer card as far as it goes without a decision; leaves a prompt when it needs one. */
function trainer(ctx: Ctx, who: Who, effect: TrainerEffect) {
  const { game } = ctx;
  const me = game.players[who];
  const them = game.players[other(who)];
  const then: Then = { op: 'trainer', effect };
  const owned = (wanted: (mon: Mon) => boolean) => spotsOf(me).filter((spot) => wanted(monAt(me, spot)!));
  switch (effect) {
    case 'research':
      ctx.events.push({ t: 'discard', who, cards: [...me.hand], from: 'hand' });
      me.discard.push(...me.hand.splice(0));
      return draw(ctx, who, 7);
    case 'hop':
      return draw(ctx, who, 3);
    case 'marnie':
      for (const [whose, count] of [[who, 5], [other(who), 4]] as [Who, number][]) {
        const player = game.players[whose];
        shuffle(player.hand, ctx);
        player.deck.push(...player.hand.splice(0));
        draw(ctx, whose, count);
      }
      return;
    case 'boss':
      return ask(game, { kind: 'mon', who, side: 'opp', spots: them.bench.map((_, index) => index), count: 1, optional: false, why: 'boss', then });
    case 'lady':
      return ask(game, { kind: 'mon', who, side: 'own', spots: owned((mon) => mon.damage > 0 || conditionsOf(mon).length > 0), count: 1, optional: false, why: 'lady', then });
    case 'potion':
      return ask(game, { kind: 'mon', who, side: 'own', spots: owned((mon) => mon.damage > 0), count: 1, optional: false, why: 'potion', then });
    case 'switch':
      return ask(game, { kind: 'mon', who, side: 'own', spots: me.bench.map((_, index) => index), count: 1, optional: false, why: 'switch', then });
    case 'quickball':
      return ask(game, { kind: 'cards', who, cards: [...me.hand], from: 'hand', min: 1, max: 1, why: 'quickball-cost', then });
    case 'incense':
      return ask(game, { kind: 'cards', who, cards: found(me.deck, (card) => card.sort === 'pokemon' && card.stage !== 'basic'), from: 'deck', min: 0, max: 1, why: 'incense', then });
    case 'energysearch':
      return ask(game, { kind: 'cards', who, cards: found(me.deck, (card) => card.sort === 'energy'), from: 'deck', min: 0, max: 1, why: 'energysearch', then });
    case 'greatball':
      return ask(game, { kind: 'cards', who, cards: me.deck.slice(0, 7), from: 'top', min: 0, max: 1, why: 'greatball', then });
    case 'retrieval':
      return ask(game, { kind: 'cards', who, cards: found(me.discard, (card) => card.sort === 'energy'), from: 'discard', min: 0, max: 2, why: 'retrieval', then });
    case 'hammer':
      if (!ctx.flip(who, 'card')) return;
      return ask(game, { kind: 'mon', who, side: 'opp', spots: spotsOf(them).filter((spot) => monAt(them, spot)!.energy.length > 0), count: 1, optional: false, why: 'hammer', then });
    case 'catcher':
      if (!ctx.flip(who, 'card')) return;
      return ask(game, { kind: 'mon', who, side: 'opp', spots: them.bench.map((_, index) => index), count: 1, optional: false, why: 'catcher', then });
  }
}

/** Takes named cards out of a pile, one copy for each time a name is given. */
function pull(pile: string[], ids: string[]) {
  for (const id of ids) {
    const at = pile.indexOf(id);
    if (at >= 0) pile.splice(at, 1);
  }
}

/** Goes on with a Trainer card once the player has answered what it asked. */
function trainerAnswered(ctx: Ctx, who: Who, why: Why, effect: TrainerEffect, spots: Spot[], cards: string[]) {
  const { game } = ctx;
  const me = game.players[who];
  const them = game.players[other(who)];
  const [spot] = spots;
  switch (why) {
    case 'boss':
    case 'catcher':
      return swap(ctx, other(who), spot as number, who);
    case 'switch':
      return swap(ctx, who, spot as number, who);
    case 'lady': {
      const mon = monAt(me, spot)!;
      heal(ctx, who, mon, 60);
      if (conditionsOf(mon).length) ctx.events.push({ t: 'cured', who, uid: mon.uid, status: 'all' });
      mon.turned = null;
      mon.burned = false;
      mon.poisoned = 0;
      return;
    }
    case 'potion':
      return heal(ctx, who, monAt(me, spot)!, 30);
    case 'hammer': {
      const mon = monAt(them, spot)!;
      const gone = mon.energy.splice(-1);
      them.discard.push(...gone);
      return void ctx.events.push({ t: 'discard', who: other(who), cards: gone, from: 'energy' });
    }
    case 'quickball-cost':
      pull(me.hand, cards);
      me.discard.push(...cards);
      ctx.events.push({ t: 'discard', who, cards, from: 'hand' });
      return ask(game, { kind: 'cards', who, cards: found(me.deck, (card) => card.sort === 'pokemon' && card.stage === 'basic'), from: 'deck', min: 0, max: 1, why: 'quickball', then: { op: 'trainer', effect } });
    case 'quickball':
    case 'incense':
    case 'energysearch':
    case 'greatball':
      pull(me.deck, cards);
      me.hand.push(...cards);
      if (cards.length) ctx.events.push({ t: 'take', who, cards, from: 'deck', open: true });
      shuffle(me.deck, ctx);
      return void ctx.events.push({ t: 'shuffle', who });
    case 'retrieval':
      pull(me.discard, cards);
      me.hand.push(...cards);
      if (cards.length) ctx.events.push({ t: 'take', who, cards, from: 'discard', open: true });
      return;
    default:
      return;
  }
}

/* ---------- attacks ---------- */

/** The next thing an attack has to ask its player before it can be carried out, given what has been answered so far. */
function nextQuestion(game: Game, who: Who, index: number, picks: Pick[]): Prompt | null {
  const me = game.players[who];
  const them = game.players[other(who)];
  const attack = topOf(me.active!).attacks[index];
  const then: Then = { op: 'attack', index, picks };
  let answered = picks.length;
  const bench = (player: Player) => player.bench.map((_, at) => at);
  for (const effect of attack.effects) {
    let prompt: Prompt | null = null;
    if (effect.t === 'bench' && effect.scope !== 'each' && them.bench.length) prompt = { kind: 'mon', who, side: 'opp', spots: bench(them), count: Math.min(effect.scope === 'two' ? 2 : 1, them.bench.length), optional: false, why: 'bench-hit', then };
    else if (effect.t === 'snipe' && (effect.bench ? them.bench.length : spotsOf(them).length)) prompt = { kind: 'mon', who, side: 'opp', spots: effect.bench ? bench(them) : spotsOf(them), count: 1, optional: false, why: 'snipe', then };
    else if (effect.t === 'gust' && them.bench.length) prompt = { kind: 'mon', who, side: 'opp', spots: bench(them), count: 1, optional: false, why: 'gust', then };
    else if (effect.t === 'switchSelf' && me.bench.length) prompt = { kind: 'mon', who, side: 'own', spots: bench(me), count: 1, optional: Boolean(effect.may), why: 'switch-self', then };
    else if (effect.t === 'call' && me.bench.length < BENCH) prompt = { kind: 'cards', who, cards: found(me.deck, (card) => card.sort === 'pokemon' && card.stage === 'basic'), from: 'deck', min: 0, max: Math.min(effect.count, BENCH - me.bench.length), why: 'call', then };
    if (!prompt) continue;
    if (answered > 0) answered -= 1;
    else return prompt;
  }
  return null;
}

/** Carries an attack out, with every question it had already answered. */
function strike(ctx: Ctx, who: Who, index: number, picks: Pick[]) {
  const { game } = ctx;
  const me = game.players[who];
  const them = game.players[other(who)];
  const mon = me.active!;
  const card = topOf(mon);
  const attack: Attack = card.attacks[index];
  const questions = [...picks];
  // the same walk as `nextQuestion`: an effect that asked something takes the next answer
  const answer = (asked: boolean) => (asked ? questions.shift() : undefined);
  ctx.events.push({ t: 'attack', who, uid: mon.uid, name: attack.name, kind: card.type, target: them.active?.uid ?? 0 });

  if (mon.turned === 'confused' && !ctx.flip(who, 'confused')) {
    mon.damage += CONFUSION;
    ctx.events.push({ t: 'hurt', who, uid: mon.uid, status: 'confused', amount: CONFUSION });
    return;
  }

  // first, everything that changes the number
  let damage = attack.damage;
  let noWeakness = false;
  for (const effect of attack.effects) {
    const target = them.active;
    if (effect.t === 'flipFail') {
      if (!ctx.flip(who, 'attack')) return void ctx.events.push({ t: 'nothing', who });
    } else if (effect.t === 'flipMore') {
      if (ctx.flip(who, 'attack')) damage += effect.add;
    } else if (effect.t === 'flipTimes') {
      let heads = 0;
      for (let coin = 0; coin < effect.coins; coin += 1) if (ctx.flip(who, 'attack')) heads += 1;
      damage = effect.each * heads;
    } else if (effect.t === 'ifDamaged') damage += mon.damage > 0 ? effect.add : 0;
    else if (effect.t === 'ifOppDamaged') damage += target && target.damage > 0 ? effect.add : 0;
    else if (effect.t === 'ifOppV') damage += target && topOf(target).rule ? effect.add : 0;
    else if (effect.t === 'ifOppAiling') damage += target && conditionsOf(target).length ? effect.add : 0;
    else if (effect.t === 'perCounterSelf') damage = (effect.plus ? damage : 0) + effect.each * (mon.damage / 10);
    else if (effect.t === 'perEnergySelf') damage = (effect.plus ? damage : 0) + effect.each * energyOf(mon).filter((kind) => !effect.kind || kind === effect.kind).length;
    else if (effect.t === 'ignoreW') noWeakness = true;
  }

  // a Pokémon pulled up by the attack is the one the attack then hits
  const gust = attack.effects.find((effect) => effect.t === 'gust');
  if (gust && gust.t === 'gust') {
    const picked = answer(them.bench.length > 0);
    if (picked && 'mons' in picked) swap(ctx, other(who), picked.mons[0] as number, who);
    damage = gust.then;
  }
  const struck = them.active;
  if (struck && damage > 0) hit(ctx, other(who), struck, damage, { type: card.type, wr: true, noWeakness });

  // then, in the order they are printed, the things it does besides
  for (const effect of attack.effects) {
    switch (effect.t) {
      case 'status':
        if (struck && struck.damage < topOf(struck).hp && (!effect.flip || ctx.flip(who, 'attack'))) afflict(ctx, other(who), struck, effect.status, effect.counters);
        break;
      case 'statusSelf':
        afflict(ctx, who, mon, effect.status);
        break;
      case 'recoil':
        if (!effect.flipTails || !ctx.flip(who, 'attack')) {
          mon.damage += effect.amount;
          ctx.events.push({ t: 'damage', who, uid: mon.uid, amount: effect.amount, weak: false, resist: false, self: true });
        }
        break;
      case 'heal':
        heal(ctx, who, mon, effect.amount);
        break;
      case 'discardSelf': {
        const gone: string[] = [];
        const limit = effect.count === 'all' ? mon.energy.length : effect.count;
        for (let at = mon.energy.length - 1; at >= 0 && gone.length < limit; at -= 1) {
          if (effect.kind && (cardOf(mon.energy[at]) as EnergyCard).type !== effect.kind) continue;
          gone.push(...mon.energy.splice(at, 1));
        }
        me.discard.push(...gone);
        if (gone.length) ctx.events.push({ t: 'discard', who, cards: gone, from: 'energy' });
        break;
      }
      case 'discardOpp':
        if (struck && struck.energy.length && (!effect.flip || ctx.flip(who, 'attack'))) {
          const gone = struck.energy.splice(-1);
          them.discard.push(...gone);
          ctx.events.push({ t: 'discard', who: other(who), cards: gone, from: 'energy' });
        }
        break;
      case 'bench': {
        const picked = effect.scope === 'each' ? undefined : answer(them.bench.length > 0);
        const targets = effect.scope === 'each' ? [...them.bench] : picked && 'mons' in picked ? picked.mons.map((spot) => monAt(them, spot)!).filter(Boolean) : [];
        for (const target of targets) hit(ctx, other(who), target, effect.amount, { type: card.type, wr: false });
        break;
      }
      case 'snipe': {
        const picked = answer(effect.bench ? them.bench.length > 0 : spotsOf(them).length > 0);
        if (picked && 'mons' in picked) {
          const spot = picked.mons[0];
          const target = monAt(them, spot);
          if (target) hit(ctx, other(who), target, effect.amount, { type: card.type, wr: spot === 'active', noWeakness });
        }
        break;
      }
      case 'call': {
        const picked = answer(me.bench.length < BENCH);
        if (picked && 'cards' in picked) {
          pull(me.deck, picked.cards);
          for (const id of picked.cards) {
            const born = newMon(game, id);
            me.bench.push(born);
            ctx.events.push({ t: 'bench', who, card: id, uid: born.uid });
          }
        }
        if (picked) {
          shuffle(me.deck, ctx);
          ctx.events.push({ t: 'shuffle', who });
        }
        break;
      }
      case 'draw':
        draw(ctx, who, effect.count);
        break;
      case 'less':
        mon.less = { turn: game.turnNo + 1, amount: effect.amount };
        ctx.events.push({ t: 'guard', who, uid: mon.uid, how: 'less' });
        break;
      case 'protect':
        if (!effect.flip || ctx.flip(who, 'attack')) {
          mon.safe = game.turnNo + 1;
          ctx.events.push({ t: 'guard', who, uid: mon.uid, how: 'safe' });
        }
        break;
      case 'lock':
        mon.locked = { turn: game.turnNo + 2, attack: effect.attack ?? null };
        break;
      case 'trap':
        if (struck) struck.trapped = game.turnNo + 1;
        break;
      case 'millOpp': {
        const gone = them.deck.splice(0, effect.count);
        them.discard.push(...gone);
        if (gone.length) ctx.events.push({ t: 'discard', who: other(who), cards: gone, from: 'deck' });
        break;
      }
      case 'switchSelf': {
        const picked = answer(me.bench.length > 0);
        if (picked && 'mons' in picked && picked.mons.length && me.active === mon) swap(ctx, who, picked.mons[0] as number, who);
        break;
      }
      default:
        break;
    }
  }
}

/** Declares an attack: asks whatever it has to ask, and when there is nothing left to ask carries it out and ends the turn. */
function attackWith(ctx: Ctx, who: Who, index: number, picks: Pick[]) {
  const question = nextQuestion(ctx.game, who, index, picks);
  if (question) return ask(ctx.game, question);
  strike(ctx, who, index, picks);
  sweep(ctx);
  if (ctx.game.step !== 'over') ctx.game.step = 'ending';
}

/* ---------- doing one thing ---------- */

const refuse = (action: Action): never => {
  throw new Error(`That cannot be done now: ${JSON.stringify(action)}`);
};

export function apply(before: Game, action: Action): { game: Game; events: Event[] } {
  const game: Game = structuredClone(before);
  const ctx = context(game);
  const { prompt } = game;
  if (game.step === 'over') refuse(action);

  if (prompt) {
    const who = prompt.who;
    const me = game.players[who];
    if (prompt.kind === 'setup' && action.do === 'setup') {
      const places = [action.active, ...action.bench];
      if (new Set(places).size !== places.length || places.some((at) => !me.hand[at] || !isBasic(me.hand[at])) || action.bench.length > BENCH) refuse(action);
      const ids = places.map((at) => me.hand[at]);
      for (const at of [...places].sort((a, b) => b - a)) me.hand.splice(at, 1);
      me.active = newMon(game, ids[0]);
      me.bench = ids.slice(1).map((id) => newMon(game, id));
      me.ready = true;
      game.prompt = null;
      if (!game.players[other(who)].ready) game.prompt = { kind: 'setup', who: other(who) };
      else {
        // both sides are down: Prize cards, the cards owed for the other side's mulligans, and the coin
        for (const player of game.players) player.prizes = player.deck.splice(0, PRIZES);
        const [a, b] = game.players;
        if (b.mulligans > a.mulligans) draw(ctx, 0, b.mulligans - a.mulligans);
        if (a.mulligans > b.mulligans) draw(ctx, 1, a.mulligans - b.mulligans);
        game.first = ctx.flip(0, 'first') ? 0 : 1;
        game.turn = game.first;
        game.turnNo = 1;
        game.step = 'main';
        beginTurn(ctx);
      }
    } else if (prompt.kind === 'promote' && action.do === 'promote') {
      if (!me.bench[action.bench]) refuse(action);
      game.prompt = null;
      promote(ctx, who, action.bench);
    } else if (prompt.kind === 'mon' && action.do === 'pick') {
      const wanted = Math.min(prompt.count, prompt.spots.length);
      const fine = action.mons.every((spot) => prompt.spots.includes(spot)) && new Set(action.mons).size === action.mons.length && (action.mons.length === wanted || (prompt.optional && action.mons.length === 0));
      if (!fine) refuse(action);
      game.prompt = null;
      if (prompt.then.op === 'trainer') trainerAnswered(ctx, who, prompt.why, prompt.then.effect, action.mons, []);
      else attackWith(ctx, who, prompt.then.index, [...prompt.then.picks, { mons: action.mons }]);
    } else if (prompt.kind === 'cards' && action.do === 'take') {
      const fine = new Set(action.cards).size === action.cards.length && action.cards.every((at) => prompt.cards[at] !== undefined) && action.cards.length >= Math.min(prompt.min, prompt.cards.length) && action.cards.length <= prompt.max;
      // from the top of the deck only a Pokémon may be taken
      const ids = action.cards.map((at) => prompt.cards[at]);
      if (!fine || (prompt.why === 'greatball' && ids.some((id) => cardOf(id).sort !== 'pokemon'))) refuse(action);
      game.prompt = null;
      if (prompt.then.op === 'trainer') trainerAnswered(ctx, who, prompt.why, prompt.then.effect, [], ids);
      else attackWith(ctx, who, prompt.then.index, [...prompt.then.picks, { cards: ids }]);
    } else refuse(action);
    proceed(ctx);
    return { game, events: ctx.events };
  }

  if (game.step !== 'main') refuse(action);
  const who = game.turn;
  const me = game.players[who];
  const allowed = legal(game).some((one) => JSON.stringify(one) === JSON.stringify(action));
  if (!allowed) refuse(action);

  switch (action.do) {
    case 'bench': {
      const [id] = me.hand.splice(action.hand, 1);
      const mon = newMon(game, id);
      me.bench.push(mon);
      ctx.events.push({ t: 'bench', who, card: id, uid: mon.uid });
      break;
    }
    case 'evolve': {
      const mon = monAt(me, action.to)!;
      const from = topOf(mon).id;
      const [id] = me.hand.splice(action.hand, 1);
      mon.cards.push(id);
      mon.evolved = game.turnNo;
      settle(mon);
      ctx.events.push({ t: 'evolve', who, card: id, uid: mon.uid, from });
      break;
    }
    case 'attach': {
      const mon = monAt(me, action.to)!;
      const [id] = me.hand.splice(action.hand, 1);
      mon.energy.push(id);
      me.attached = true;
      ctx.events.push({ t: 'attach', who, card: id, uid: mon.uid });
      break;
    }
    case 'play': {
      const [id] = me.hand.splice(action.hand, 1);
      const card = cardOf(id) as TrainerCard;
      me.discard.push(id);
      if (card.sort === 'supporter') me.supporter = true;
      ctx.events.push({ t: 'play', who, card: id });
      trainer(ctx, who, card.effect);
      break;
    }
    case 'retreat': {
      const mon = me.active!;
      const paid = mon.energy.splice(mon.energy.length - topOf(mon).retreat, topOf(mon).retreat);
      me.discard.push(...paid);
      if (paid.length) ctx.events.push({ t: 'discard', who, cards: paid, from: 'energy' });
      const up = me.bench[action.to];
      settle(mon);
      me.active = up;
      me.bench[action.to] = mon;
      me.retreated = true;
      ctx.events.push({ t: 'retreat', who, from: mon.uid, to: up.uid });
      break;
    }
    case 'attack':
      attackWith(ctx, who, action.index, []);
      break;
    case 'end':
      game.step = 'ending';
      break;
    default:
      refuse(action);
  }
  proceed(ctx);
  return { game, events: ctx.events };
}
