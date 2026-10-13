import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cardsOf, DECKS } from '../cards.ts';
import { apply, attackRefusal, BENCH, cardOf, forecast, HAND, isBasic, legal, PRIZES, retreatRefusal, shelve, start, topOf } from './game.ts';
import { choose } from './rival.ts';
import type { Action, Attack, Card, Effect, Event, Game, Kind, Level, Mon, PokemonCard, Who } from './types.ts';

/* ---------- cards made for the tests ---------- */

const attack = (name: string, cost: Kind[], damage: number, effects: Effect[] = []): Attack => ({ name, cost, damage, mark: '', effects, text: '' });
const mon = (id: string, over: Partial<PokemonCard> = {}): PokemonCard => ({ id, name: id, sort: 'pokemon', stage: 'basic', from: null, hp: 100, type: 'Fire', rule: null, prize: 1, attacks: [attack('Hit', ['Fire'], 30)], weak: null, resist: null, retreat: 1, rarity: 'test', small: '', large: '', ...over });
const TEST: Card[] = [
  mon('t-basic'),
  mon('t-stage1', { stage: 'stage1', from: 't-basic', hp: 140, attacks: [attack('Big', ['Fire', 'Colorless'], 80)] }),
  mon('t-water', { type: 'Water', weak: 'Fire', attacks: [attack('Splash', ['Water'], 20)] }),
  mon('t-wall', { type: 'Metal', resist: 'Fire', hp: 60 }),
  mon('t-v', { rule: 'v', prize: 2, hp: 60 }),
  mon('t-vmax', { stage: 'vmax', from: 't-v', rule: 'vmax', prize: 3, hp: 70 }),
  mon('t-sleep', { attacks: [attack('Lull', ['Fire'], 10, [{ t: 'status', status: 'asleep' }])] }),
  mon('t-poison', { attacks: [attack('Sting', ['Fire'], 10, [{ t: 'status', status: 'poisoned' }])] }),
  mon('t-burn', { attacks: [attack('Sear', ['Fire'], 10, [{ t: 'status', status: 'burned' }])] }),
  mon('t-stun', { attacks: [attack('Zap', ['Fire'], 10, [{ t: 'status', status: 'paralyzed' }])] }),
  mon('t-daze', { attacks: [attack('Spin', ['Fire'], 10, [{ t: 'status', status: 'confused' }])] }),
  mon('t-bench', { attacks: [attack('Quake', ['Fire'], 20, [{ t: 'bench', amount: 20, scope: 'each' }]), attack('Dart', ['Fire'], 0, [{ t: 'snipe', amount: 30, bench: false }])] }),
  mon('t-coin', { attacks: [attack('Maybe', ['Fire'], 50, [{ t: 'flipFail' }]), attack('Many', ['Fire'], 0, [{ t: 'flipTimes', coins: 4, each: 20 }])] }),
  mon('t-guard', { attacks: [attack('Brace', ['Fire'], 10, [{ t: 'less', amount: 20 }]), attack('Tire', ['Fire'], 60, [{ t: 'lock' }, { t: 'recoil', amount: 20 }])] }),
  { id: 't-fire', name: 'Fire Energy', sort: 'energy', type: 'Fire', small: '', large: '' },
  { id: 't-drop', name: 'Water Energy', sort: 'energy', type: 'Water', small: '', large: '' },
  { id: 't-potion', name: 'Potion', sort: 'item', effect: 'potion', text: '', small: '', large: '' },
  { id: 't-switch', name: 'Switch', sort: 'item', effect: 'switch', text: '', small: '', large: '' },
  { id: 't-quick', name: 'Quick Ball', sort: 'item', effect: 'quickball', text: '', small: '', large: '' },
  { id: 't-hop', name: 'Hop', sort: 'supporter', effect: 'hop', text: '', small: '', large: '' },
  { id: 't-research', name: "Professor's Research", sort: 'supporter', effect: 'research', text: '', small: '', large: '' },
  { id: 't-boss', name: "Boss's Orders", sort: 'supporter', effect: 'boss', text: '', small: '', large: '' },
];
shelve(TEST);

const fill = (ids: string[], size = 60) => Array.from({ length: size }, (_, at) => ids[at % ids.length]);
const PLAIN = fill(['t-basic', 't-fire', 't-fire']);

const play = (game: Game, ...actions: Action[]) => {
  const events: Event[] = [];
  let now = game;
  for (const action of actions) {
    const done = apply(now, action);
    now = done.game;
    events.push(...done.events);
  }
  return { game: now, events };
};

/** A match past its setup, with player 0 to move, on a turn late enough for anything to be allowed. Hands and Pokémon are then set by the test. */
function table(mine: string, theirs: string, options: { hand?: string[]; bench?: string[]; theirBench?: string[]; energy?: number; seed?: number } = {}): Game {
  let { game } = start({ decks: [PLAIN, PLAIN], seed: options.seed ?? 3 });
  for (const who of [0, 1] as Who[]) {
    const hand = game.players[who].hand;
    game = apply(game, { do: 'setup', active: hand.findIndex(isBasic), bench: [] }).game;
  }
  game.turn = 0;
  game.turnNo = 5;
  const born = (id: string, energy = 0): Mon => ({ uid: game.uid++, cards: [id], energy: Array.from({ length: energy }, () => 't-fire'), damage: 0, turned: null, burned: false, poisoned: 0, since: 1, evolved: 0, locked: null, less: null, safe: 0, trapped: 0 });
  game.players[0].active = born(mine, options.energy ?? 3);
  game.players[1].active = born(theirs, 3);
  game.players[0].bench = (options.bench ?? []).map((id) => born(id, 2));
  game.players[1].bench = (options.theirBench ?? []).map((id) => born(id, 2));
  game.players[0].hand = options.hand ?? [];
  game.players[0].attached = false;
  return game;
}
const active = (game: Game, who: Who) => game.players[who].active!;

/* ---------- laying the table ---------- */

test('each player is dealt seven cards with a Basic Pokémon among them, then sets six Prize cards aside', () => {
  const { game } = start({ decks: [PLAIN, PLAIN], seed: 11 });
  assert.equal(game.prompt?.kind, 'setup');
  for (const player of game.players) {
    assert.equal(player.hand.length, HAND);
    assert.ok(player.hand.some(isBasic));
  }
  const after = play(game, { do: 'setup', active: game.players[0].hand.findIndex(isBasic), bench: [] });
  assert.deepEqual(after.game.prompt, { kind: 'setup', who: 1 });
  const done = play(after.game, { do: 'setup', active: after.game.players[1].hand.findIndex(isBasic), bench: [] });
  assert.equal(done.game.step, 'main');
  assert.equal(done.game.turnNo, 1);
  for (const player of done.game.players) assert.equal(player.prizes.length, PRIZES);
  // whoever goes first has drawn a card
  const first = done.game.players[done.game.first];
  assert.equal(first.hand.length, HAND - 1 + 1);
  assert.equal(first.deck.length, 60 - HAND - PRIZES - 1);
});

test('a hand with no Basic Pokémon is dealt again, and the other player draws a card for it', () => {
  // one Basic in sixty: most hands have none
  const thin = [...fill(['t-fire'], 59), 't-basic'];
  const { game, events } = start({ decks: [thin, PLAIN], seed: 5 });
  const times = game.players[0].mulligans;
  assert.ok(times > 0);
  assert.ok(events.some((event) => event.t === 'mulligan' && event.who === 0 && event.times === times));
  let now = game;
  for (const who of [0, 1] as Who[]) now = apply(now, { do: 'setup', active: now.players[who].hand.findIndex(isBasic), bench: [] }).game;
  const drawn = now.first === 1 ? 1 : 0;
  assert.equal(now.players[1].hand.length, HAND - 1 + times + drawn);
});

test('the player who goes first cannot attack or play a Supporter on that turn', () => {
  let { game } = start({ decks: [fill(['t-basic', 't-fire', 't-hop']), PLAIN], seed: 2 });
  for (const who of [0, 1] as Who[]) game = apply(game, { do: 'setup', active: game.players[who].hand.findIndex(isBasic), bench: [] }).game;
  game.turn = 0;
  game.players[0].hand = ['t-fire', 't-hop'];
  const withEnergy = play(game, { do: 'attach', hand: 0, to: 'active' }).game;
  assert.equal(attackRefusal(withEnergy, 0, 0), 'first-turn');
  assert.ok(!legal(withEnergy).some((action) => action.do === 'attack' || action.do === 'play'));
  // and on the second turn of the match both are allowed
  const next = play(withEnergy, { do: 'end' }).game;
  next.players[1].hand = ['t-fire', 't-hop'];
  const theirs = play(next, { do: 'attach', hand: 0, to: 'active' }).game;
  assert.ok(legal(theirs).some((action) => action.do === 'attack'));
  assert.ok(legal(theirs).some((action) => action.do === 'play'));
});

/* ---------- a turn ---------- */

test('one Energy card a turn', () => {
  const game = table('t-basic', 't-basic', { hand: ['t-fire', 't-fire'], energy: 0 });
  const after = play(game, { do: 'attach', hand: 0, to: 'active' }).game;
  assert.equal(active(after, 0).energy.length, 1);
  assert.ok(!legal(after).some((action) => action.do === 'attach'));
});

test('an attack needs its own kind of Energy; Colorless is paid with anything', () => {
  const game = table('t-stage1', 't-basic', { energy: 0 });
  active(game, 0).energy = ['t-drop', 't-drop'];
  assert.equal(attackRefusal(game, 0, 0), 'energy');
  active(game, 0).energy = ['t-fire', 't-drop'];
  assert.equal(attackRefusal(game, 0, 0), null);
});

test('a Pokémon evolves from the one named on it, but not on the turn it came into play', () => {
  const game = table('t-basic', 't-basic', { hand: ['t-stage1', 't-basic'] });
  const benched = play(game, { do: 'bench', hand: 1 }).game;
  // the one just put down has to wait; the Active one has been there since turn 1
  assert.deepEqual(legal(benched).filter((action) => action.do === 'evolve'), [{ do: 'evolve', hand: 0, to: 'active' }]);
  active(benched, 0).damage = 40;
  active(benched, 0).poisoned = 1;
  const evolved = play(benched, { do: 'evolve', hand: 0, to: 'active' }).game;
  assert.equal(topOf(active(evolved, 0)).id, 't-stage1');
  // damage stays, the Special Condition does not
  assert.equal(active(evolved, 0).damage, 40);
  assert.equal(active(evolved, 0).poisoned, 0);
  assert.equal(active(evolved, 0).energy.length, 3);
});

test('nobody evolves on their first turn', () => {
  const game = table('t-basic', 't-basic', { hand: ['t-stage1'] });
  game.turnNo = 2;
  assert.ok(!legal(game).some((action) => action.do === 'evolve'));
});

test('retreating costs Energy, happens once a turn, and leaves Special Conditions behind', () => {
  const game = table('t-basic', 't-basic', { bench: ['t-water'], energy: 2 });
  active(game, 0).burned = true;
  const { game: after } = play(game, { do: 'retreat', to: 0 });
  assert.equal(topOf(active(after, 0)).id, 't-water');
  assert.equal(after.players[0].bench[0].energy.length, 1);
  assert.equal(after.players[0].bench[0].burned, false);
  assert.equal(retreatRefusal(after, 0), 'once');
  // without the Energy for it there is no retreating
  const poor = table('t-basic', 't-basic', { bench: ['t-water'], energy: 0 });
  assert.equal(retreatRefusal(poor, 0), 'energy');
});

/* ---------- damage ---------- */

test('Weakness doubles the damage and Resistance takes thirty off', () => {
  const weak = play(table('t-basic', 't-water'), { do: 'attack', index: 0 });
  assert.equal(active(weak.game, 1).damage, 60);
  assert.deepEqual(forecast(table('t-basic', 't-water'), 0, 0), { damage: 60, mean: 60, weak: true, resist: false });
  const resisted = play(table('t-basic', 't-wall'), { do: 'attack', index: 0 });
  assert.equal(active(resisted.game, 1).damage, 0);
});

test('damage to the Bench ignores Weakness and Resistance', () => {
  const { game } = play(table('t-bench', 't-basic', { theirBench: ['t-water', 't-wall'] }), { do: 'attack', index: 0 });
  assert.deepEqual(game.players[1].bench.map((one) => one.damage), [20, 20]);
});

test('an attack that picks its target waits for the pick', () => {
  const asked = play(table('t-bench', 't-basic', { theirBench: ['t-water'] }), { do: 'attack', index: 1 }).game;
  assert.equal(asked.prompt?.kind, 'mon');
  const { game } = play(asked, { do: 'pick', mons: [0] });
  assert.equal(game.players[1].bench[0].damage, 30);
  assert.equal(game.turn, 1);
});

test('coins: tails makes one attack do nothing, and another does damage for each heads', () => {
  let nothing = 0;
  const totals = new Set<number>();
  for (let seed = 1; seed <= 40; seed += 1) {
    const fail = play(table('t-coin', 't-basic', { seed }), { do: 'attack', index: 0 });
    if (fail.events.some((event) => event.t === 'nothing')) {
      nothing += 1;
      assert.equal(active(fail.game, 1).damage, 0);
    } else assert.equal(active(fail.game, 1).damage, 50);
    const many = play(table('t-coin', 't-basic', { seed }), { do: 'attack', index: 1 });
    const heads = many.events.filter((event) => event.t === 'flip' && event.why === 'attack' && event.heads).length;
    assert.equal(active(many.game, 1)?.damage ?? 100, Math.min(100, heads * 20));
    totals.add(heads);
  }
  assert.ok(nothing > 8 && nothing < 32);
  assert.ok(totals.size >= 4);
});

test('what an attack does to its own Pokémon: less damage next turn, no attack the turn after, recoil', () => {
  const braced = play(table('t-guard', 't-basic'), { do: 'attack', index: 0 }).game;
  const hitBack = play(braced, { do: 'attack', index: 0 }).game;
  assert.equal(active(hitBack, 0).damage, 10);
  const tired = play(table('t-guard', 't-basic'), { do: 'attack', index: 1 });
  assert.equal(active(tired.game, 0).damage, 20);
  const back = play(tired.game, { do: 'end' }).game;
  assert.equal(attackRefusal(back, 0, 0), 'locked');
  // a turn later it can attack again
  const later = play(back, { do: 'end' }, { do: 'end' }).game;
  assert.equal(attackRefusal(later, 0, 0), null);
});

/* ---------- Special Conditions ---------- */

test('Poison puts a damage counter on between turns, every turn', () => {
  const struck = play(table('t-poison', 't-basic'), { do: 'attack', index: 0 }).game;
  assert.equal(active(struck, 1).damage, 20);
  const later = play(struck, { do: 'end' }).game;
  assert.equal(active(later, 1).damage, 30);
});

test('a Burn puts two damage counters on, then a coin decides whether it goes out', () => {
  let out = 0;
  for (let seed = 1; seed <= 30; seed += 1) {
    const { game, events } = play(table('t-burn', 't-basic', { seed }), { do: 'attack', index: 0 });
    assert.equal(active(game, 1).damage, 30);
    const cured = events.some((event) => event.t === 'cured' && event.status === 'burned');
    assert.equal(active(game, 1).burned, !cured);
    if (cured) out += 1;
  }
  assert.ok(out > 6 && out < 24);
});

test('an Asleep Pokémon cannot attack or retreat until a coin wakes it', () => {
  let woke = 0;
  for (let seed = 1; seed <= 30; seed += 1) {
    const { game } = play(table('t-sleep', 't-basic', { theirBench: ['t-water'], seed }), { do: 'attack', index: 0 });
    if (active(game, 1).turned === null) woke += 1;
    else {
      assert.equal(attackRefusal(game, 1, 0), 'asleep');
      assert.equal(retreatRefusal(game, 1), 'asleep');
    }
  }
  assert.ok(woke > 6 && woke < 24);
});

test('a Paralyzed Pokémon misses its next turn and is then well', () => {
  const struck = play(table('t-stun', 't-basic'), { do: 'attack', index: 0 }).game;
  assert.equal(active(struck, 1).turned, 'paralyzed');
  assert.equal(attackRefusal(struck, 1, 0), 'paralyzed');
  const after = play(struck, { do: 'end' }).game;
  assert.equal(active(after, 1).turned, null);
});

test('a Confused Pokémon flips to attack; tails puts three damage counters on itself', () => {
  let hurt = 0;
  for (let seed = 1; seed <= 30; seed += 1) {
    const dazed = play(table('t-daze', 't-basic', { seed }), { do: 'attack', index: 0 }).game;
    const { game, events } = play(dazed, { do: 'attack', index: 0 });
    if (events.some((event) => event.t === 'hurt' && event.status === 'confused')) {
      hurt += 1;
      assert.equal(active(game, 1).damage, 10 + 30);
      assert.equal(active(game, 0).damage, 0);
    } else assert.equal(active(game, 0).damage, 30);
  }
  assert.ok(hurt > 6 && hurt < 24);
});

/* ---------- Knock Outs and winning ---------- */

test('a Knock Out gives a Prize card, two for a Pokémon V, and the Bench fills the Active Spot', () => {
  const game = table('t-stage1', 't-v', { theirBench: ['t-basic', 't-water'] });
  const { game: after, events } = play(game, { do: 'attack', index: 0 });
  assert.ok(events.some((event) => event.t === 'ko'));
  assert.equal(after.players[0].prizes.length, PRIZES - 2);
  assert.equal(after.players[0].hand.length, 2);
  assert.deepEqual(after.prompt, { kind: 'promote', who: 1 });
  const { game: on } = play(after, { do: 'promote', bench: 1 });
  assert.equal(topOf(active(on, 1)).id, 't-water');
  assert.equal(on.turn, 1);
});

test('a Pokémon VMAX gives three Prize cards', () => {
  const { game } = play(table('t-stage1', 't-vmax', { theirBench: ['t-basic'] }), { do: 'attack', index: 0 });
  assert.equal(game.players[0].prizes.length, PRIZES - 3);
  assert.equal(game.players[0].hand.length, 3);
});

test('the match is won by taking the last Prize card, or when the other side has nobody left', () => {
  const last = table('t-stage1', 't-v', { theirBench: ['t-basic'] });
  last.players[0].prizes = ['t-fire'];
  const won = play(last, { do: 'attack', index: 0 });
  assert.equal(won.game.winner, 0);
  assert.equal(won.game.why, 'prizes');
  const alone = play(table('t-stage1', 't-v'), { do: 'attack', index: 0 });
  assert.equal(alone.game.winner, 0);
  assert.equal(alone.game.why, 'bench');
  assert.deepEqual(legal(alone.game), []);
});

test('a player who cannot draw at the start of their turn loses', () => {
  const game = table('t-basic', 't-basic');
  game.players[1].deck = [];
  const { game: after } = play(game, { do: 'end' });
  assert.equal(after.winner, 0);
  assert.equal(after.why, 'deck');
});

/* ---------- Trainer cards ---------- */

test('one Supporter a turn; Items as many as there are', () => {
  const game = table('t-basic', 't-basic', { hand: ['t-hop', 't-hop', 't-potion', 't-potion'] });
  active(game, 0).damage = 70;
  const afterHop = play(game, { do: 'play', hand: 0 }).game;
  assert.equal(afterHop.players[0].hand.length, 3 + 3);
  assert.ok(!legal(afterHop).some((action) => action.do === 'play' && cardOf(afterHop.players[0].hand[action.hand]).sort === 'supporter'));
  const healed = play(afterHop, { do: 'play', hand: 1 }, { do: 'pick', mons: ['active'] }, { do: 'play', hand: 1 }, { do: 'pick', mons: ['active'] }).game;
  assert.equal(active(healed, 0).damage, 10);
});

test("Professor's Research throws the hand away and draws seven", () => {
  const game = table('t-basic', 't-basic', { hand: ['t-research', 't-fire', 't-fire'] });
  const { game: after } = play(game, { do: 'play', hand: 0 });
  assert.equal(after.players[0].hand.length, 7);
  assert.equal(after.players[0].discard.filter((id) => id === 't-fire').length, 2);
});

test("Boss's Orders pulls a Benched Pokémon up, and Switch sends mine back", () => {
  const game = table('t-basic', 't-basic', { hand: ['t-boss', 't-switch'], bench: ['t-water'], theirBench: ['t-v'] });
  const pulled = play(game, { do: 'play', hand: 0 }, { do: 'pick', mons: [0] }).game;
  assert.equal(topOf(active(pulled, 1)).id, 't-v');
  const switched = play(pulled, { do: 'play', hand: 0 }, { do: 'pick', mons: [0] }).game;
  assert.equal(topOf(active(switched, 0)).id, 't-water');
});

test('Quick Ball costs a card from the hand, then finds a Basic Pokémon in the deck', () => {
  const game = table('t-basic', 't-basic', { hand: ['t-quick', 't-fire'] });
  const asked = play(game, { do: 'play', hand: 0 }).game;
  assert.equal(asked.prompt?.kind === 'cards' && asked.prompt.why, 'quickball-cost');
  const searching = play(asked, { do: 'take', cards: [0] }).game;
  assert.ok(searching.prompt?.kind === 'cards' && searching.prompt.from === 'deck' && searching.prompt.cards.every(isBasic));
  const size = searching.players[0].deck.length;
  const { game: after } = play(searching, { do: 'take', cards: [0] });
  assert.deepEqual(after.players[0].hand, ['t-basic']);
  assert.equal(after.players[0].deck.length, size - 1);
  assert.ok(after.players[0].discard.includes('t-fire'));
});

/* ---------- the whole thing ---------- */

test('the same moves from the same seed play out the same', () => {
  const run = () => {
    let { game } = start({ decks: [cardsOf(DECKS[0]), cardsOf(DECKS[1])], seed: 99 });
    let seed = 7;
    const dice = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const log: string[] = [];
    for (let step = 0; step < 400 && game.step !== 'over'; step += 1) {
      const done = apply(game, choose(game, 'steady', dice));
      game = done.game;
      log.push(...done.events.map((event) => JSON.stringify(event)));
    }
    return log.join('\n');
  };
  assert.equal(run(), run());
});

/** Plays a whole match between two ways of playing; gives the winner and how long it took. */
function match(decks: [number, number], levels: [Level, Level], seed: number) {
  let { game } = start({ decks: [cardsOf(DECKS[decks[0]]), cardsOf(DECKS[decks[1]])], seed });
  let state = seed * 7919 + 13;
  const dice = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
  let steps = 0;
  while (game.step !== 'over') {
    const mover = game.prompt?.who ?? game.turn;
    game = apply(game, choose(game, levels[mover], dice)).game;
    steps += 1;
    assert.ok(steps < 4000, `a match between decks ${decks} went on for ever (seed ${seed})`);
    // nothing is ever made or lost: each side still has its sixty cards somewhere
    if (steps % 25 === 0) {
      for (const player of game.players) {
        const inPlay = [...(player.active ? [player.active] : []), ...player.bench].reduce((sum, one) => sum + one.cards.length + one.energy.length, 0);
        assert.equal(player.deck.length + player.hand.length + player.discard.length + player.prizes.length + inPlay, 60);
        assert.ok(player.bench.length <= BENCH);
      }
    }
  }
  return { winner: game.winner as Who, turns: game.turnNo, why: game.why };
}

test('every deck plays whole matches against every other, at every level, to an end', () => {
  const levels: Level[] = ['easy', 'steady', 'sharp'];
  const ends = { prizes: 0, bench: 0, deck: 0 };
  let seed = 1;
  for (let a = 0; a < DECKS.length; a += 1)
    for (let b = 0; b < DECKS.length; b += 1) {
      const result = match([a, b], [levels[(a + b) % 3], levels[(a * 2 + b) % 3]], (seed += 1));
      ends[result.why!] += 1;
    }
  // most matches are won on Prize cards, as at a real table
  assert.ok(ends.prizes > ends.deck, JSON.stringify(ends));
});

test('whatever is pressed, the rules never break: random legal moves play matches out', () => {
  for (let seed = 1; seed <= 24; seed += 1) {
    let { game } = start({ decks: [cardsOf(DECKS[seed % DECKS.length]), cardsOf(DECKS[(seed * 3) % DECKS.length])], seed });
    let state = seed;
    const dice = () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };
    for (let step = 0; step < 3000 && game.step !== 'over'; step += 1) {
      const prompt = game.prompt;
      let action: Action;
      if (prompt && prompt.kind !== 'promote') action = choose(game, dice() < 0.5 ? 'easy' : 'steady', dice);
      else {
        const options = legal(game);
        // ending the turn is one choice among many, so turns are long and odd things get tried
        action = options[Math.floor(dice() * options.length)];
      }
      game = apply(game, action).game;
    }
    assert.equal(game.step, 'over', `seed ${seed} did not finish`);
  }
});

test('the sharper opponent wins more often than not', () => {
  // every pairing of decks is played twice from the same shuffle, with the two levels changing seats,
  // so that neither a deck nor going first decides it
  const rate = (strong: Level, weak: Level, pairs: number) => {
    let wins = 0;
    for (let pair = 0; pair < pairs; pair += 1) {
      const decks: [number, number] = [pair % DECKS.length, (pair * 3 + 1) % DECKS.length];
      if (match(decks, [strong, weak], 9000 + pair).winner === 0) wins += 1;
      if (match(decks, [weak, strong], 9000 + pair).winner === 1) wins += 1;
    }
    return wins / (pairs * 2);
  };
  const steadyOverEasy = rate('steady', 'easy', 60);
  const sharpOverEasy = rate('sharp', 'easy', 60);
  const sharpOverSteady = rate('sharp', 'steady', 300);
  assert.ok(steadyOverEasy >= 0.8, `steady beat easy ${steadyOverEasy}`);
  assert.ok(sharpOverEasy >= 0.8, `sharp beat easy ${sharpOverEasy}`);
  assert.ok(sharpOverSteady > 0.52, `sharp beat steady ${sharpOverSteady}`);
});
