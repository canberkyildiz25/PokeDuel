/* The coach: somebody standing behind your chair who says, at every moment,
   one thing you could do next and why. It reads the same table the rules
   keep and suggests only what the rules allow; it never plays for you. */

import { attackRefusal, BENCH, cardOf, energyOf, evolves, forecast, hpLeft, isBasic, legal, monAt, pays, spotsOf, topOf } from './duel/game.ts';
import type { Game, Mon, PokemonCard, Spot } from './duel/types.ts';
import { ASK, KIND, TRAINER } from './words.ts';

export interface Advice {
  /** What to do now. */
  say: string;
  /** Why it is worth doing, when that is not plain. */
  why?: string;
  /** The cards in the hand it is about. */
  hand: number[];
  /** Your own Pokémon it is about. */
  spots: Spot[];
  /** The control to press. */
  control?: 'ready' | 'attack' | 'end' | 'play' | 'bench';
  /** For an attack: which one. */
  attack?: number;
}

const nameOf = (mon: Mon) => topOf(mon).name;

/** How many more Energy a Pokémon needs before its cheapest attack can be used; 0 when one can. */
function short(mon: Mon) {
  const card = topOf(mon);
  if (card.attacks.some((attack) => pays(mon, attack.cost))) return 0;
  return Math.max(1, Math.min(...card.attacks.map((attack) => attack.cost.length - mon.energy.length)));
}
/** How many more Energy a Pokémon needs before its dearest attack can be used. */
const wants = (mon: Mon) => Math.max(0, Math.max(...topOf(mon).attacks.map((attack) => attack.cost.length)) - mon.energy.length);

/** What the coach says. `held` is the card held up from the hand, `chosen` what has been picked for the first Active Spot and Bench. */
export function advise(game: Game, held: number | null, chosen: { active: number | null; bench: number[] }): Advice | null {
  if (game.step === 'over') return null;
  const me = game.players[0];
  const them = game.players[1];
  const prompt = game.prompt;
  const nothing = { hand: [], spots: [] };

  if ((prompt && prompt.who !== 0) || (!prompt && game.turn !== 0)) return { ...nothing, say: 'Şimdi rakip oynuyor. Yaptığı her şey maç fişine yazılır; sıra sana gelince burada ne yapabileceğini söylerim.' };

  if (prompt?.kind === 'setup') {
    const basics = me.hand.map((id, at) => ({ id, at })).filter(({ id }) => isBasic(id));
    if (chosen.active === null)
      return { ...nothing, hand: basics.map(({ at }) => at), say: 'Maç başlıyor. Parlayan kartlar elindeki Temel Pokémon’lar: birine dokun, ortaya o çıkar ve ilk o dövüşür.', why: 'Canı yüksek olanı ortaya koymak iyi bir başlangıçtır.' };
    const rest = basics.filter(({ at }) => at !== chosen.active && !chosen.bench.includes(at)).map(({ at }) => at);
    return {
      ...nothing,
      hand: rest,
      control: 'ready',
      say: rest.length ? 'İstersen kalan Temel Pokémon’lara da dokun: yedeğe giderler. Sonra Hazırım’a bas.' : 'Hazırım’a bas: kartlar açılır, ilk turu yazı tura belirler.',
      why: 'Yedekte Pokémon olması önemli: ortadaki nakavt olursa yerine yedekten biri geçer. Kimse kalmazsa maçı kaybedersin.',
    };
  }
  if (prompt?.kind === 'promote') return { ...nothing, spots: me.bench.map((_, at) => at), say: 'Ortadaki Pokémon’un nakavt oldu. Yedekten birine dokun: ortaya o geçer.', why: 'Saldırısına yetecek Enerjisi olanı seçmek iyi olur.' };
  if (prompt?.kind === 'mon') return { ...nothing, spots: prompt.side === 'own' ? prompt.spots : [], say: ASK[prompt.why] };
  if (prompt?.kind === 'cards') return { ...nothing, say: ASK[prompt.why] };

  const options = legal(game);
  const active = me.active;

  // a card is already held up: say what to do with it
  if (held !== null && me.hand[held]) {
    const card = cardOf(me.hand[held]);
    if (card.sort === 'energy') {
      const targets = options.filter((option) => option.do === 'attach' && option.hand === held).map((option) => (option as { to: Spot }).to);
      return targets.length ? { ...nothing, spots: targets, say: `Alttaki “bağla” düğmelerinden birine bas: ${card.name} o Pokémon’a bağlanır. Sarı çerçeveli Pokémon’a dokunmak da olur.` } : { ...nothing, say: 'Bu tur zaten bir Enerji bağladın. Karta tekrar dokunup bırak.' };
    }
    if (card.sort === 'pokemon' && card.stage === 'basic') return { ...nothing, control: 'bench', say: `Yedeğe koy’a bas ya da yedekte boş bir yere dokun: ${card.name} oraya geçer.` };
    if (card.sort === 'pokemon') {
      const targets = options.filter((option) => option.do === 'evolve' && option.hand === held).map((option) => (option as { to: Spot }).to);
      return targets.length ? { ...nothing, spots: targets, say: `Alttaki “${card.from}: evrimleştir” düğmesine bas: ${card.name} onun üstüne konur.` } : { ...nothing, say: `${card.name} yalnızca ${card.from} kartının üstüne konur; o da bu tur hazır değil. Karta tekrar dokunup bırak.` };
    }
    return options.some((option) => option.do === 'play' && option.hand === held) ? { ...nothing, control: 'play', say: `Oyna’ya bas: ${TRAINER[card.effect].does}` } : { ...nothing, say: 'Bu kart şu an bir işe yaramaz. Karta tekrar dokunup bırak.' };
  }

  const handOf = (wanted: (id: string) => boolean) => me.hand.map((id, at) => ({ id, at })).filter(({ id }) => wanted(id));

  // 1. somebody on the Bench, so that a Knock Out does not end the match
  const benchable = handOf(isBasic).filter(() => me.bench.length < BENCH);
  if (benchable.length && me.bench.length < 2) {
    const [first] = benchable;
    return { ...nothing, hand: [first.at], say: `Elindeki ${cardOf(first.id).name} bir Temel Pokémon: dokun, sonra Yedeğe koy’a bas.`, why: 'Ortadaki nakavt olursa yerine yedekten biri geçer. Kimse kalmazsa maçı kaybedersin.' };
  }

  // 1b. an empty Bench and no Basic Pokémon in the hand: a card that finds one, or a new hand
  if (!me.bench.length && !benchable.length) {
    const finder = handOf((id) => {
      const card = cardOf(id);
      return (card.sort === 'item' && (card.effect === 'quickball' || card.effect === 'greatball')) || (card.sort === 'supporter' && (card.effect === 'research' || card.effect === 'hop' || card.effect === 'marnie'));
    }).find(({ at }) => options.some((option) => option.do === 'play' && option.hand === at));
    if (finder) {
      const card = cardOf(finder.id);
      return { ...nothing, hand: [finder.at], say: `Yedeğin boş. ${card.name} kartına dokun, sonra Oyna’ya bas: ${card.sort !== 'energy' && 'effect' in card ? TRAINER[card.effect].does : ''}`, why: 'Ortadaki nakavt olduğunda yerine geçecek kimse yoksa maçı kaybedersin.' };
    }
  }

  // 2. evolve: a stronger card on top of the one it grows from
  const evolution = handOf((id) => cardOf(id).sort === 'pokemon' && !isBasic(id)).find(({ id }) => spotsOf(me).some((spot) => evolves(game, id, monAt(me, spot)!)));
  if (evolution) {
    const card = cardOf(evolution.id) as PokemonCard;
    const spots = spotsOf(me).filter((spot) => evolves(game, evolution.id, monAt(me, spot)!));
    return { ...nothing, hand: [evolution.at], spots, say: `${card.name}, ${card.from} kartının üstüne konabilir: ${card.name} kartına dokun, sonra çıkan “evrimleştir” düğmesine bas.`, why: 'Evrimleşen Pokémon’un canı ve saldırıları büyür; üstündeki Enerji ve hasar onda kalır.' };
  }

  // 3. one Energy a turn, where an attack needs it
  const energy = handOf((id) => cardOf(id).sort === 'energy');
  if (!me.attached && energy.length && active) {
    const target: Spot | undefined = short(active) > 0 || wants(active) > 0 ? 'active' : spotsOf(me).find((spot) => wants(monAt(me, spot)!) > 0);
    if (target !== undefined) {
      const mon = monAt(me, target)!;
      const missing = short(mon);
      return {
        ...nothing,
        hand: [energy[0].at],
        spots: [target],
        say: `Elindeki ${cardOf(energy[0].id).name} kartına dokun, sonra çıkan “${nameOf(mon)}: bağla” düğmesine bas.`,
        why: missing > 0 ? `Saldırmak için Enerji gerekir: kartın solundaki simgeler kadar. ${nameOf(mon)} için ${missing} Enerji daha lazım. Her tur bir Enerji bağlayabilirsin.` : 'Daha güçlü saldırısı için Enerji biriktiriyorsun. Her tur bir Enerji bağlayabilirsin.',
      };
    }
  }

  // 4. attack, with what hits hardest
  const attacks = options.filter((option) => option.do === 'attack').map((option) => (option as { index: number }).index);
  if (attacks.length && active) {
    const best = attacks.reduce((top, index) => (forecast(game, 0, index).mean > forecast(game, 0, top).mean ? index : top), attacks[0]);
    const told = forecast(game, 0, best);
    const attack = topOf(active).attacks[best];
    const target = them.active;
    const falls = target && told.damage >= hpLeft(target);
    return {
      ...nothing,
      control: 'attack',
      attack: best,
      say: `Saldır: ${attack.name}${told.damage ? ` (${told.damage} hasar)` : ''}. Saldırı turunu bitirir, o yüzden önce yapmak istediğin başka bir şey varsa onu yap.`,
      why: falls ? `Bu saldırı ${nameOf(target)} kartını nakavt eder: ödül kartı alırsın. Altı ödül kartını ilk toplayan kazanır.` : told.weak ? `${nameOf(target!)} ${KIND[topOf(active).type]} türüne zayıf: hasar iki katına çıkıyor.` : undefined,
    };
  }

  // 5. a Supporter that draws cards, when the hand is thin
  const drawer = handOf((id) => {
    const card = cardOf(id);
    return card.sort === 'supporter' && (card.effect === 'hop' || card.effect === 'research' || card.effect === 'marnie');
  }).find(({ at }) => options.some((option) => option.do === 'play' && option.hand === at));
  if (drawer && me.hand.length <= 4) return { ...nothing, hand: [drawer.at], say: `${cardOf(drawer.id).name} kartına dokun, sonra Oyna’ya bas: elin dolar.`, why: 'Destekçi kartlarından turda yalnızca bir tane oynanır.' };

  // 6. nothing more to do this turn
  if (game.turnNo === 1) return { ...nothing, control: 'end', say: 'İlk turda saldırı yok. Turu bitir’e bas; sıra rakibe geçer.', why: 'İlk oynayan, ilk turunda saldıramaz. Kural böyle.' };
  if (active && attackRefusal(game, 0, 0) === 'energy' && topOf(active).attacks.every((_, index) => attackRefusal(game, 0, index) !== null))
    return { ...nothing, control: 'end', say: `${nameOf(active)} henüz saldıramaz: Enerjisi yetmiyor. Turu bitir’e bas.`, why: `Kartın solundaki simgeler saldırının bedeli. Şu an ${energyOf(active).length} Enerjisi var; her tur bir tane daha bağlayabilirsin.` };
  return { ...nothing, control: 'end', say: 'Bu tur yapacak başka bir şey kalmadı: Turu bitir’e bas.', why: them.active ? `Rakibin ortasında ${nameOf(them.active)} var; ${hpLeft(them.active)} canı kaldı.` : undefined };
}

