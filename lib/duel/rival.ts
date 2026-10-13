/* The opponent. It plays by the same rules through the same two functions the
   page uses, and it sees what a player across the table would see: its own
   hand, everything in play, both discard piles, and how many cards the other
   side holds. It never looks at the other hand, at either deck's order, or
   at a Prize card.

   It decides one thing at a time. Three ways of playing:
     easy    puts Pokémon down, gives its Active Pokémon Energy and attacks
             with whatever it can; it forgets its Trainer cards half the time
     steady  builds its Bench, evolves, uses its Trainer cards when they do
             something, and takes the hardest attack it can pay for
     sharp   does all that, and also reads the next turn: it pulls up a
             Pokémon it can Knock Out, retreats one that is about to fall,
             and keeps a Supporter for when it needs it */

import { attackRefusal, BENCH, cardOf, conditionsOf, forecast, hpLeft, isBasic, legal, monAt, pays, retreatRefusal, spotsOf, topOf } from './game.ts';
import { other, type Action, type Game, type Level, type Mon, type Player, type PokemonCard, type Spot, type TrainerCard, type Who } from './types.ts';

type Dice = () => number;
const pick = <T,>(list: T[], dice: Dice): T => list[Math.floor(dice() * list.length)];
const best = <T,>(list: T[], score: (item: T) => number): T | undefined => list.reduce<T | undefined>((top, item) => (top === undefined || score(item) > score(top) ? item : top), undefined);

/** The hardest hit a Pokémon card can ever give, and what it takes. */
const peak = (card: PokemonCard) => Math.max(...card.attacks.map((attack) => attack.damage));
const dearest = (card: PokemonCard) => Math.max(...card.attacks.map((attack) => attack.cost.length));

/** How much a Pokémon in play is worth keeping and feeding: what it can do, how much of it is left. */
function promise(mon: Mon) {
  const card = topOf(mon);
  return peak(card) + hpLeft(mon) / 4 + mon.energy.length * 15 - (card.rule ? 10 : 0);
}

/** The best attack the Active Pokémon can use right now: which one, and what it is expected to do. Judged `plainly`, the best attack is simply the one that hits hardest. */
function bestAttack(game: Game, who: Who, plainly = false) {
  const mon = game.players[who].active;
  const target = game.players[other(who)].active;
  if (!mon || !target) return null;
  const options = topOf(mon).attacks.map((attack, index) => ({ index, attack, told: forecast(game, who, index) })).filter(({ index }) => attackRefusal(game, who, index) === null);
  const left = hpLeft(target);
  const scored = options.map((option) => {
    const { attack, told } = option;
    let score = told.mean;
    if (plainly) return { ...option, score };
    if (told.damage >= left) score += 1000 + topOf(target).prize * 200;
    else if (told.mean >= left) score += 300;
    for (const effect of attack.effects) {
      if (effect.t === 'status') score += effect.flip ? 12 : 25;
      else if (effect.t === 'recoil') score -= effect.amount / 2;
      else if (effect.t === 'lock') score -= 20;
      else if (effect.t === 'discardSelf') score -= effect.count === 'all' ? 30 : 10 * effect.count;
      else if (effect.t === 'bench' || effect.t === 'snipe') score += effect.amount / 2;
      else if (effect.t === 'discardOpp' || effect.t === 'less' || effect.t === 'protect' || effect.t === 'heal') score += 15;
      else if (effect.t === 'draw' || effect.t === 'call') score += 10;
    }
    return { ...option, score };
  });
  return best(scored, (option) => option.score) ?? null;
}

/** What the other side's Active Pokémon could do to mine next turn, if it had the Energy for its dearest attack. */
function threat(game: Game, who: Who) {
  const theirs = game.players[other(who)].active;
  const mine = game.players[who].active;
  if (!theirs || !mine) return 0;
  const card = topOf(theirs);
  const energy = theirs.energy.length + 1;
  const reach = Math.max(0, ...card.attacks.filter((attack) => attack.cost.length <= energy).map((attack) => attack.damage));
  const weak = topOf(mine).weak === card.type ? 2 : 1;
  return reach * weak - (topOf(mine).resist === card.type ? 30 : 0);
}

/** Whether a Pokémon could attack this turn if it were in the Active Spot now. */
const ready = (mon: Mon) => topOf(mon).attacks.some((attack) => pays(mon, attack.cost));

/** Which of my Pokémon should take the Energy card in my hand. */
function feed(game: Game, who: Who, level: Level): Spot | null {
  const me = game.players[who];
  const spots = spotsOf(me);
  if (!spots.length) return null;
  if (level === 'easy') return me.active ? 'active' : spots[0];
  const wants = (mon: Mon) => dearest(topOf(mon)) - mon.energy.length;
  const active = me.active;
  if (level === 'sharp') {
    const facing = game.players[other(who)].active;
    // an Active Pokémon that cannot attack yet gets what it needs to; after that the Energy goes where it will
    // do the most, and not onto a Pokémon that is about to fall with it
    const cheapest = active ? Math.min(...topOf(active).attacks.map((attack) => attack.cost.length)) : 0;
    const falls = active ? threat(game, who) >= hpLeft(active) : false;
    if (active && active.energy.length < cheapest && cheapest - active.energy.length === 1 && !falls) return 'active';
    const all = spots.map((spot) => ({ spot, mon: monAt(me, spot)! })).filter(({ mon }) => wants(mon) > 0);
    const chosen = best(all, ({ spot, mon }) => peak(topOf(mon)) + hpLeft(mon) / 2 + mon.energy.length * 25 + matchup(mon, facing) + (spot === 'active' ? (falls ? -200 : 40) : 0));
    return chosen ? chosen.spot : active ? 'active' : spots[0];
  }
  // the Active Pokémon first, while it still lacks Energy for something
  if (active && wants(active) > 0) return 'active';
  const hungry = me.bench.map((mon, index) => ({ mon, index })).filter(({ mon }) => wants(mon) > 0);
  const next = best(hungry, ({ mon }) => promise(mon));
  if (next) return next.index;
  return active ? 'active' : spots[0];
}

/** What one of my Benched Pokémon could do this turn if it were in the Active Spot instead: the table is imagined, not changed. */
function ifUp(game: Game, who: Who, bench: number) {
  const imagined: Game = { ...game, players: [...game.players] as [Player, Player] };
  imagined.players[who] = { ...game.players[who], active: game.players[who].bench[bench] };
  return bestAttack(imagined, who);
}
/** Whether an attack found by `bestAttack` finishes off the Pokémon it is aimed at. */
const finishes = (game: Game, who: Who, attack: ReturnType<typeof bestAttack>) => {
  const target = game.players[other(who)].active;
  return Boolean(attack && target && attack.told.damage >= hpLeft(target));
};

/** How a Pokémon of mine stands against the one facing it: good when it hits a Weakness, bad when it has one. */
function matchup(mon: Mon, facing: Mon | null) {
  if (!facing) return 0;
  const mine = topOf(mon);
  const theirs = topOf(facing);
  return (theirs.weak === mine.type ? 120 : 0) - (theirs.resist === mine.type ? 30 : 0) - (mine.weak === theirs.type ? 90 : 0);
}

/** The Benched Pokémon to bring up when the Active Spot is empty, or when the one in it should leave. */
function successor(player: Player, facing: Mon | null = null): number {
  const scored = player.bench.map((mon, index) => ({ index, score: (ready(mon) ? 500 : 0) + promise(mon) + matchup(mon, facing) }));
  return best(scored, (one) => one.score)?.index ?? 0;
}

/** The Pokémon on the other side that is easiest to finish off, and whether my Active Pokémon can do it now. */
function prey(game: Game, who: Who, spots: Spot[]) {
  const them = game.players[other(who)];
  const mine = game.players[who].active;
  const reach = mine ? Math.max(0, ...topOf(mine).attacks.filter((attack) => pays(mine, attack.cost)).map((attack) => attack.damage)) : 0;
  const scored = spots.map((spot) => {
    const mon = monAt(them, spot)!;
    const need = hpLeft(mon) / (mine && topOf(mon).weak === topOf(mine).type ? 2 : 1);
    return { spot, falls: reach >= need && reach > 0, score: (reach >= need && reach > 0 ? 1000 + topOf(mon).prize * 300 : 0) - hpLeft(mon) + mon.energy.length * 20 };
  });
  return best(scored, (one) => one.score)!;
}

/** Answers a question the rules have put to the opponent. */
function answer(game: Game, level: Level, dice: Dice): Action {
  const prompt = game.prompt!;
  const who = prompt.who;
  const me = game.players[who];
  const them = game.players[other(who)];

  if (prompt.kind === 'setup') {
    const basics = me.hand.map((id, at) => ({ id, at })).filter(({ id }) => isBasic(id));
    const value = (id: string) => {
      const card = cardOf(id) as PokemonCard;
      const quick = Math.min(...card.attacks.map((attack) => attack.cost.length));
      return card.hp + (quick <= 1 ? 40 : 0) - (card.rule ? 30 : 0);
    };
    const lead = level === 'easy' ? pick(basics, dice) : best(basics, ({ id }) => value(id))!;
    const rest = basics.filter((one) => one !== lead).slice(0, level === 'easy' ? 1 : BENCH);
    return { do: 'setup', active: lead.at, bench: rest.map((one) => one.at) };
  }
  if (prompt.kind === 'promote') {
    if (level === 'easy') return { do: 'promote', bench: Math.floor(dice() * me.bench.length) };
    // the sharp opponent brings up whoever would take a Knock Out on its next turn
    const finisher = level === 'sharp' ? me.bench.findIndex((_, index) => finishes(game, who, ifUp(game, who, index))) : -1;
    return { do: 'promote', bench: finisher >= 0 ? finisher : successor(me, level === 'sharp' ? them.active : null) };
  }

  if (prompt.kind === 'mon') {
    const count = Math.min(prompt.count, prompt.spots.length);
    if (level === 'easy') return { do: 'pick', mons: prompt.spots.slice(0, count) };
    let order: Spot[];
    if (prompt.side === 'own') {
      const score = (spot: Spot) => {
        const mon = monAt(me, spot)!;
        if (prompt.why === 'potion' || prompt.why === 'lady') return mon.damage + (spot === 'active' ? 15 : 0) + conditionsOf(mon).length * 20;
        const takes = level === 'sharp' && typeof spot === 'number' && finishes(game, who, ifUp(game, who, spot));
        return (takes ? 2000 : 0) + (ready(mon) ? 500 : 0) + promise(mon);
      };
      order = [...prompt.spots].sort((a, b) => score(b) - score(a));
      // an attack that lets its Pokémon step back only does so when that helps
      if (prompt.optional && me.active && hpLeft(me.active) > threat(game, who)) return { do: 'pick', mons: [] };
    } else if (prompt.why === 'hammer') order = [...prompt.spots].sort((a, b) => monAt(them, b)!.energy.length + (b === 'active' ? 0.5 : 0) - (monAt(them, a)!.energy.length + (a === 'active' ? 0.5 : 0)));
    else if (prompt.why === 'bench-hit' || prompt.why === 'snipe') order = [...prompt.spots].sort((a, b) => hpLeft(monAt(them, a)!) - hpLeft(monAt(them, b)!));
    else order = [prey(game, who, prompt.spots).spot, ...prompt.spots];
    return { do: 'pick', mons: [...new Set(order)].slice(0, count) };
  }

  // cards to take from a pile, or one to throw away
  const places = prompt.cards.map((id, at) => ({ id, at, card: cardOf(id) }));
  if (prompt.why === 'quickball-cost') {
    const energies = places.filter(({ card }) => card.sort === 'energy');
    const spare = energies.length > 2 ? energies[0] : (places.find(({ card }) => card.sort === 'item') ?? places.find(({ card }) => card.sort === 'pokemon' && card.stage !== 'basic' && !spotsOf(me).some((spot) => topOf(monAt(me, spot)!).name === card.from)) ?? energies[0] ?? places[0]);
    return { do: 'take', cards: [spare.at] };
  }
  const inPlay = spotsOf(me).map((spot) => topOf(monAt(me, spot)!).name);
  const worth = ({ card }: (typeof places)[number]) => {
    if (card.sort === 'energy') return 50;
    if (card.sort !== 'pokemon') return 0;
    if (card.stage === 'basic') return me.bench.length >= BENCH ? 0 : 20 + card.hp / 10 + (me.hand.some((id) => (cardOf(id) as PokemonCard).from === card.name) ? 60 : 0);
    return inPlay.includes(card.from ?? '') ? 100 + card.hp / 10 : 10;
  };
  const wanted = places
    .filter((place) => (prompt.why === 'greatball' ? place.card.sort === 'pokemon' : true))
    .filter((place) => worth(place) > 0)
    .sort((a, b) => worth(b) - worth(a))
    .slice(0, prompt.max);
  return { do: 'take', cards: wanted.map((place) => place.at) };
}

/** Whether playing a Trainer card now is worth it. */
function worthPlaying(game: Game, who: Who, card: TrainerCard, level: Level): boolean {
  const me = game.players[who];
  const them = game.players[other(who)];
  const mine = spotsOf(me).map((spot) => monAt(me, spot)!);
  const energyInHand = me.hand.filter((id) => cardOf(id).sort === 'energy').length;
  const attack = bestAttack(game, who);
  const target = them.active;
  switch (card.effect) {
    case 'research':
      // throwing a full hand away is a waste; an empty one is not. The sharp opponent first puts down the Energy it would lose
      if (level !== 'sharp') return me.hand.length <= 4;
      return (me.attached || energyInHand === 0) && me.hand.length <= 4 && me.deck.length > 12 && !me.hand.some((id) => mine.some((mon) => (cardOf(id) as PokemonCard).from === topOf(mon).name));
    case 'hop':
      return me.hand.length <= (level === 'sharp' ? 8 : 6) && me.deck.length > 6;
    case 'marnie':
      return me.hand.length <= 4 || them.hand.length >= 7;
    case 'potion':
      return mine.some((mon) => mon.damage >= 30);
    case 'lady':
      return mine.some((mon) => mon.damage >= 60 || mon.turned !== null);
    case 'switch': {
      const active = me.active!;
      const stuck = active.turned === 'asleep' || active.turned === 'paralyzed' || !ready(active);
      if (stuck && me.bench.some(ready)) return true;
      return level === 'sharp' && !finishes(game, who, attack) && me.bench.some((_, index) => finishes(game, who, ifUp(game, who, index)));
    }
    case 'boss':
    case 'catcher': {
      // worth it when a Benched Pokémon can be finished off and the Active one cannot
      const canFinishActive = attack && target ? attack.told.damage >= hpLeft(target) : false;
      return !canFinishActive && prey(game, who, them.bench.map((_, index) => index)).falls;
    }
    case 'hammer':
      return true;
    case 'quickball':
      if (level === 'sharp') return me.bench.length < 4 && me.hand.length > 2;
      return me.bench.length < 3 && (energyInHand > 2 || me.hand.some((id) => cardOf(id).sort === 'item' && id !== card.id));
    case 'greatball':
      return me.bench.length < 4;
    case 'incense':
      return mine.some((mon) => topOf(mon).stage !== 'vmax');
    case 'energysearch':
      return energyInHand === 0;
    case 'retrieval':
      return energyInHand <= 1;
  }
}

/** What the opponent does next: an answer to a question, or one step of its turn. `dice` is given so that a test can make it repeat itself. */
export function choose(game: Game, level: Level, dice: Dice = Math.random): Action {
  if (game.prompt) return answer(game, level, dice);
  const who = game.turn;
  const me = game.players[who];
  const options = legal(game);
  const has = (kind: Action['do']) => options.filter((option) => option.do === kind);

  // Pokémon onto the Bench
  const benchable = has('bench') as Extract<Action, { do: 'bench' }>[];
  if (benchable.length && me.bench.length < (level === 'easy' ? 2 : level === 'steady' ? 4 : 5)) {
    const one = level === 'easy' ? benchable[0] : best(benchable, (option) => (cardOf(me.hand[option.hand]) as PokemonCard).hp + (me.hand.some((id) => (cardOf(id) as PokemonCard).from === cardOf(me.hand[option.hand]).name) ? 100 : 0))!;
    return one;
  }
  // evolve whatever can be evolved, the Active Pokémon first
  const evolvable = has('evolve') as Extract<Action, { do: 'evolve' }>[];
  if (evolvable.length && (level !== 'easy' || dice() < 0.6)) return evolvable.find((option) => option.to === 'active') ?? evolvable[0];

  // Trainer cards
  const cards = (has('play') as Extract<Action, { do: 'play' }>[]).map((option) => ({ option, card: cardOf(me.hand[option.hand]) as TrainerCard }));
  if (cards.length && (level !== 'easy' || dice() < 0.5)) {
    // Items before a Supporter, so that a new hand is not drawn over cards that could have been played
    const order = [...cards].sort((a, b) => Number(a.card.sort === 'supporter') - Number(b.card.sort === 'supporter'));
    const useful = order.find(({ card }) => (level === 'easy' ? card.sort === 'item' || me.hand.length <= 3 : worthPlaying(game, who, card, level)));
    if (useful) return useful.option;
  }

  // one Energy
  const attachable = has('attach') as Extract<Action, { do: 'attach' }>[];
  if (attachable.length) {
    const to = feed(game, who, level);
    const option = attachable.find((one) => one.to === to);
    if (option) return option;
  }

  // step back, when staying means doing nothing or falling
  if (level !== 'easy' && me.active && retreatRefusal(game, who) === null) {
    const active = me.active;
    const mine = bestAttack(game, who);
    if (level === 'sharp' && !finishes(game, who, mine)) {
      // somebody on the Bench can take the Knock Out that the Active Pokémon cannot
      const finisher = me.bench.findIndex((_, index) => finishes(game, who, ifUp(game, who, index)));
      if (finisher >= 0) return { do: 'retreat', to: finisher };
    }
    const to = successor(me, level === 'sharp' ? game.players[other(who)].active : null);
    const better = me.bench[to];
    if (better && ready(better) && !mine && topOf(active).retreat <= 1) return { do: 'retreat', to };
  }

  const attack = level === 'easy' ? (has('attack')[0] as Extract<Action, { do: 'attack' }> | undefined) : bestAttack(game, who, level === 'steady');
  if (attack) return { do: 'attack', index: attack.index };
  return { do: 'end' };
}
