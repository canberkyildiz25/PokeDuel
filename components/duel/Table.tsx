'use client';

import { Star } from '@phosphor-icons/react';
import { LayoutGroup } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { cardById, deckById } from '@/lib/cards';
import { advise } from '@/lib/coach';
import { attackRefusal, BENCH, cardOf, forecast, isBasic, legal, PRIZES, retreatRefusal, topOf } from '@/lib/duel/game';
import type { Action, Card, Event, Spot, Who } from '@/lib/duel/types';
import { IMPACT, playFx } from '@/lib/fx';
import { MAT_OF, trainerById } from '@/lib/people';
import { sound } from '@/lib/sound';
import { act, begin, clearTable, moverOf, rivalStep, setTaught, standUp, toggleCoach, useStore, type Beat } from '@/lib/store';
import { ASK, CONDITION, LEVEL, REFUSAL, says, TRAINER } from '@/lib/words';
import { Pips, Stamp } from '../Bits';
import { CardFace } from '../CardFace';
import { CardSheet } from '../CardSheet';
import { CardsDialog } from './CardsDialog';
import { Seat, type Mark } from './Seat';

/** How long the opponent takes over each step, so that what it does can be followed. */
const THINKS = 950;
const NOTHING = { marks: [] as Mark[], shaken: [] as number[], fallen: [] as number[] };

/* What a beat puts over the cards for a moment, which of them flinch, and which fall. */
function marksOf(beat: Beat) {
  if (!beat.live) return NOTHING;
  const marks: Mark[] = [];
  const shaken: number[] = [];
  const fallen: number[] = [];
  const struck = beat.events.some((event) => event.t === 'attack');
  beat.events.forEach((event, order) => {
    const key = `${beat.n}-${order}`;
    if (event.t === 'damage') {
      marks.push({ key, uid: event.uid, text: event.amount ? `−${event.amount}` : 'Etkisiz', tone: event.amount === 0 ? 'note' : event.weak ? 'hard' : 'hit', late: struck });
      if (event.amount) shaken.push(event.uid);
    } else if (event.t === 'heal') marks.push({ key, uid: event.uid, text: `+${event.amount}`, tone: 'heal', late: false });
    else if (event.t === 'hurt') marks.push({ key, uid: event.uid, text: `−${event.amount}`, tone: 'ail', late: false });
    else if (event.t === 'condition') marks.push({ key, uid: event.uid, text: CONDITION[event.status], tone: 'ail', late: struck });
    else if (event.t === 'guard') marks.push({ key, uid: event.uid, text: 'Korunuyor', tone: 'note', late: struck });
    else if (event.t === 'ko') fallen.push(event.uid);
  });
  return { marks, shaken, fallen };
}

function heard(events: Event[]) {
  const has = (type: Event['t']) => events.some((event) => event.t === type);
  const strike = events.find((event) => event.t === 'attack');
  const landed = events.some((event) => event.t === 'damage' && event.amount > 0);
  const hard = events.some((event) => event.t === 'damage' && event.weak);
  if (has('win')) return;
  if (has('flip')) sound.coin();
  if (strike && strike.t === 'attack') {
    sound.strike(strike.kind);
    if (landed) setTimeout(hard ? sound.hard : sound.hit, IMPACT);
  } else if (has('attach')) sound.token();
  else if (has('bench') || has('evolve') || has('play') || has('promote') || has('retreat') || has('switch') || has('draw')) sound.card();
  if (has('heal')) sound.heal();
  if (has('condition') || has('hurt')) sound.ail();
  if (has('ko')) setTimeout(sound.out, strike ? IMPACT + 200 : 0);
  if (has('prize')) setTimeout(sound.prize, strike ? IMPACT + 420 : 120);
}

const WHY_OVER = { prizes: 'Bütün ödül kartları alındı.', bench: 'Sahada Pokémon kalmadı.', deck: 'Çekilecek kart kalmadı.' } as const;

/** The match. Everything on the mat is read straight off the table the rules keep; pressing something hands the rules one action. */
export function Table() {
  const router = useRouter();
  const ready = useStore((state) => state.ready);
  const game = useStore((state) => state.game);
  const view = useStore((state) => state.view);
  const seat = useStore((state) => state.seat);
  const rivalId = useStore((state) => state.rival);
  const rivalDeck = useStore((state) => state.rivalDeck);
  const slip = useStore((state) => state.slip);
  const beat = useStore((state) => state.beat);
  const coachOn = useStore((state) => state.coach);
  const taught = useStore((state) => state.taught);
  const [looking, setLooking] = useState<Card | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [retreating, setRetreating] = useState(false);
  const [picked, setPicked] = useState<Spot[]>([]);
  const [first, setFirst] = useState<{ active: number | null; bench: number[] }>({ active: null, bench: [] });
  const [pile, setPile] = useState<Who | null>(null);
  const mat = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const log = useRef<HTMLOListElement>(null);

  // no match on the table: back to where one is made
  useEffect(() => {
    if (ready && !game) router.replace(seat.trainer ? '/deste/' : '/kayit/');
  }, [ready, game, seat.trainer, router]);

  // the opponent takes its steps one at a time, with a pause before each, once the table has caught up
  useEffect(() => {
    if (!game || game !== view || game.step === 'over' || moverOf(game) !== 1) return;
    const wait = setTimeout(rivalStep, THINKS);
    return () => clearTimeout(wait);
  }, [game, view]);

  // what has just happened is heard and acted out, and the slip is kept at its last line
  const heardBeat = useRef(0);
  useEffect(() => {
    if (beat.n === heardBeat.current) return;
    heardBeat.current = beat.n;
    heard(beat.events);
    const win = beat.events.find((event) => event.t === 'win');
    if (win) setTimeout(win.who === 0 ? sound.win : sound.lose, 600);
    log.current?.scrollTo({ top: log.current.scrollHeight });

    // an attack: its Pokémon lunges at the one it is aimed at, and its kind's effect crosses the mat
    const strike = beat.events.find((event) => event.t === 'attack');
    if (!strike || strike.t !== 'attack' || !mat.current || !canvas.current || !document.documentElement.classList.contains('live')) return;
    const from = mat.current.querySelector<HTMLElement>(`[data-uid="${strike.uid}"]`);
    const to = mat.current.querySelector<HTMLElement>(`[data-uid="${strike.target}"]`);
    if (!from || !to) return;
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    const dx = (b.left + b.width / 2 - (a.left + a.width / 2)) * 0.3;
    const dy = (b.top + b.height / 2 - (a.top + a.height / 2)) * 0.3;
    from.querySelector('.spot__card')?.animate(
      [
        { transform: 'translate3d(0, 0, 0) scale(1)' },
        { transform: `translate3d(${-dx * 0.25}px, ${-dy * 0.25}px, 0) scale(1.04)`, offset: 0.22 },
        { transform: `translate3d(${dx}px, ${dy}px, 0) scale(1.1)`, offset: 0.5 },
        { transform: 'translate3d(0, 0, 0) scale(1)' },
      ],
      { duration: 560, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
    );
    playFx(
      canvas.current,
      strike.kind,
      a,
      b,
      beat.events.some((event) => event.t === 'damage' && event.weak),
    );
  }, [beat]);

  const fx = useMemo(() => marksOf(beat), [beat]);

  if (!ready || !game || !view) return <main id="main" className="wrap duel" aria-busy="true" />;

  const meTrainer = trainerById(seat.trainer);
  const rival = trainerById(rivalId);
  const names: [string, string] = [meTrainer?.name ?? 'Sen', rival?.name ?? 'Rakip'];
  const myDeck = deckById(seat.deck);
  const [me, them] = view.players;
  const settled = view === game;
  const over = game.step === 'over';
  const mine = settled && !over && moverOf(game) === 0;
  const prompt = mine ? game.prompt : null;
  const options = mine && !prompt ? legal(game) : [];
  const can = (wanted: Action) => options.some((option) => JSON.stringify(option) === JSON.stringify(wanted));
  const active = me.active;
  const held = mine && !prompt && sel !== null && sel < me.hand.length ? sel : null;
  const heldCard = held === null ? null : cardOf(me.hand[held]);
  const settingUp = prompt?.kind === 'setup';
  const flipped = [...beat.events].reverse().find((event) => event.t === 'flip');
  const strike = beat.live ? beat.events.find((event) => event.t === 'attack') : undefined;
  const advice = coachOn && settled ? advise(game, held, first) : null;
  const hinted = (control: NonNullable<NonNullable<typeof advice>['control']>, attack?: number) => (advice?.control === control && (attack === undefined || advice.attack === attack) ? '' : undefined);

  const go = (action: Action) => {
    setSel(null);
    setRetreating(false);
    setPicked([]);
    act(action);
  };
  const look = (id: string | undefined) => setLooking(id ? (cardById(id) ?? null) : null);

  /** One of the Pokémon a question is about has been pressed. */
  const choose = (spot: Spot) => {
    if (prompt?.kind !== 'mon') return;
    const need = Math.min(prompt.count, prompt.spots.length);
    const next = picked.includes(spot) ? picked.filter((one) => one !== spot) : [...picked, spot];
    if (next.length >= need) go({ do: 'pick', mons: next });
    else setPicked(next);
  };

  const asked = (side: 'own' | 'opp', spot: Spot) => prompt?.kind === 'mon' && prompt.side === side && prompt.spots.includes(spot);
  const myState = (spot: Spot) => {
    if (asked('own', spot)) return picked.includes(spot) ? 'picked' : 'open';
    if (typeof spot === 'number' && (prompt?.kind === 'promote' || (retreating && can({ do: 'retreat', to: spot })))) return 'open';
    if (held !== null && (can({ do: 'attach', hand: held, to: spot }) || can({ do: 'evolve', hand: held, to: spot }))) return 'open';
    if (advice?.spots.includes(spot)) return 'hint';
    return null;
  };
  const onMySpot = (spot: Spot) => {
    const mon = spot === 'active' ? me.active : me.bench[spot];
    if (asked('own', spot)) return choose(spot);
    if (typeof spot === 'number' && prompt?.kind === 'promote') return go({ do: 'promote', bench: spot });
    if (typeof spot === 'number' && retreating && can({ do: 'retreat', to: spot })) return go({ do: 'retreat', to: spot });
    if (held !== null && can({ do: 'attach', hand: held, to: spot })) return go({ do: 'attach', hand: held, to: spot });
    if (held !== null && can({ do: 'evolve', hand: held, to: spot })) return go({ do: 'evolve', hand: held, to: spot });
    if (mon) look(topOf(mon).id);
  };
  const onTheirSpot = (spot: Spot) => {
    const mon = spot === 'active' ? them.active : them.bench[spot];
    if (asked('opp', spot)) return choose(spot);
    if (mon) look(topOf(mon).id);
  };
  const sayingFor = (side: Who) => (spot: Spot) => {
    const mon = spot === 'active' ? view.players[side].active : view.players[side].bench[spot];
    const name = mon ? topOf(mon).name : 'Pokémon';
    if (side === 0 ? myState(spot) === 'open' || myState(spot) === 'picked' : asked('opp', spot)) return `${name}: seç`;
    return `${name} kartına yakından bak`;
  };

  /** A card in the hand has been pressed. */
  const onHand = (place: number) => {
    if (!mine) return look(me.hand[place]);
    if (settingUp) {
      if (!isBasic(me.hand[place])) return look(me.hand[place]);
      sound.card();
      return setFirst((now) => {
        if (now.active === place) return { active: now.bench[0] ?? null, bench: now.bench.slice(1) };
        if (now.bench.includes(place)) return { ...now, bench: now.bench.filter((one) => one !== place) };
        if (now.active === null) return { ...now, active: place };
        return now.bench.length < BENCH ? { ...now, bench: [...now.bench, place] } : now;
      });
    }
    if (prompt) return look(me.hand[place]);
    sound.card();
    setRetreating(false);
    setSel(held === place ? null : place);
  };

  const status = over
    ? game.winner === 0
      ? 'Maç senin.'
      : `Maç ${names[1]} tarafında kaldı.`
    : !settled
      ? strike && strike.t === 'attack'
        ? `${names[strike.who]} saldırıyor.`
        : 'Bekle.'
      : !mine
        ? game.prompt
          ? `${names[1]} seçiyor.`
          : `${names[1]} oynuyor.`
        : prompt
          ? prompt.kind === 'setup'
            ? ASK.setup
            : prompt.kind === 'promote'
              ? ASK.promote
              : ASK[prompt.why]
          : retreating
            ? 'Ortaya gelecek Pokémon’una dokun.'
            : game.turnNo === 1
              ? 'Sıra sende. İlk turda saldırı ve Destekçi yok.'
              : 'Sıra sende.';

  /** What is said about the card held up from the hand, and what can be done with it. */
  const about = () => {
    if (!heldCard || held === null) return null;
    if (heldCard.sort === 'energy') return { says: me.attached ? 'Bu tur bir Enerji bağladın.' : 'Bağlamak için bir Pokémon’una dokun.', act: null };
    if (heldCard.sort === 'pokemon' && heldCard.stage === 'basic') return can({ do: 'bench', hand: held }) ? { says: 'Temel Pokémon: yedekte boş bir yere konur.', act: { label: 'Yedeğe koy', action: { do: 'bench', hand: held } as Action } } : { says: 'Yedekte boş yer yok.', act: null };
    if (heldCard.sort === 'pokemon') {
      const somewhere = options.some((option) => option.do === 'evolve' && option.hand === held);
      return { says: somewhere ? `${heldCard.from} kartına dokun: üstüne konur.` : game.turnNo <= 2 ? 'İlk turunda evrim yok.' : `Şu an evrimleşebilecek bir ${heldCard.from} yok. Bu tur sahaya inen ya da evrimleşen Pokémon bir tur bekler.`, act: null };
    }
    const fine = can({ do: 'play', hand: held });
    const why = heldCard.sort === 'supporter' && me.supporter ? ' Bu tur bir Destekçi oynadın.' : heldCard.sort === 'supporter' && game.turnNo === 1 ? ' İlk turda Destekçi oynanmaz.' : ' Şu an bir etkisi olmaz.';
    return { says: TRAINER[heldCard.effect].does + (fine ? '' : why), act: fine ? { label: 'Oyna', action: { do: 'play', hand: held } as Action } : null };
  };
  const told = about();
  const retreatWhy = active && mine && !prompt ? retreatRefusal(game, 0) : null;
  const canRetreat = mine && !prompt && retreatWhy === null && Boolean(active);

  const attacks = active
    ? topOf(active).attacks.map((attack, index) => {
        const refusal = attackRefusal(view, 0, index);
        const open = can({ do: 'attack', index });
        const guess = forecast(view, 0, index);
        const paid = Math.min(active.energy.length, attack.cost.length);
        const missing = attack.cost.length - paid;
        const why = mine && !prompt && !open && refusal ? (refusal === 'energy' && missing > 0 ? `${missing} Enerji daha gerekli.` : REFUSAL[refusal]) : null;
        return { attack, index, open, why, guess, paid };
      })
    : [];

  const nearest = attacks.filter((one) => one.why).sort((a, b) => a.attack.cost.length - a.paid - (b.attack.cost.length - b.paid))[0];
  const cardsPrompt = prompt?.kind === 'cards' ? prompt : null;
  const matLook = MAT_OF[myDeck?.type ?? 'Colorless'];
  /** How many Prize cards a side has taken; before the piles are set aside, none. */
  const taken = (who: Who) => (view.turnNo === 0 ? 0 : PRIZES - view.players[who].prizes.length);

  return (
    <main id="main" className="wrap duel" data-over={over ? '' : undefined}>
      <h1 className="sr-only">
        {names[0]}, {names[1]} karşısında
      </h1>

      <div className="duel__main">
      <LayoutGroup>
        <section ref={mat} className="mat" data-mat={matLook.id} data-kind={myDeck?.type} data-struck={strike ? '' : undefined} aria-label="Mat">
          <Seat who={1} player={them} name={names[1]} mark={<Stamp mark={rival?.mark ?? 'R'} lean={5} />} marks={fx.marks} shaken={fx.shaken} fallen={fx.fallen} stateOf={(spot) => (asked('opp', spot) ? (picked.includes(spot) ? 'picked' : 'open') : null)} onSpot={onTheirSpot} saying={sayingFor(1)} onDiscard={() => setPile(1)} />

          <div className="mid" data-yours={mine ? '' : undefined}>
            <span className="coin" key={flipped ? beat.n : 'still'} data-toss={flipped && flipped.t === 'flip' && beat.live ? (flipped.heads ? 'heads' : 'tails') : undefined} data-face={flipped && flipped.t === 'flip' && !flipped.heads ? 'tails' : 'heads'} aria-hidden="true">
              <span className="coin__face">
                <Star size={26} weight="fill" />
              </span>
              <span className="coin__face coin__face--tails">
                <Star size={26} />
              </span>
            </span>
            <p className="mid__say" role="status">
              {status}
            </p>
            <p className="mid__round label">
              Tur <span className="fig">{Math.max(1, view.turnNo)}</span> · {matLook.name}
            </p>
          </div>

          <Seat
            who={0}
            player={me}
            name={names[0]}
            mark={<Stamp mark={meTrainer?.mark ?? 'S'} />}
            marks={fx.marks}
            shaken={fx.shaken}
            fallen={fx.fallen}
            stateOf={myState}
            onSpot={onMySpot}
            saying={sayingFor(0)}
            placing={held !== null && can({ do: 'bench', hand: held })}
            onPlace={() => held !== null && go({ do: 'bench', hand: held })}
            preview={settingUp ? { active: first.active === null ? null : me.hand[first.active], bench: first.bench.map((place) => me.hand[place]) } : undefined}
            onDiscard={() => setPile(0)}
            under={
              // on a narrow table the attacks are chosen beside the Pokémon that makes them
              active && (
                <>
                  {attacks.map(({ attack, index, open, why, paid }) => (
                    <button key={attack.name} type="button" className="btn btn--small tag__attack" disabled={!open} data-hint={hinted('attack', index)} title={why ?? undefined} onClick={() => go({ do: 'attack', index })}>
                      <span className="tag__attack-name">{attack.name}</span>
                      <span className="tag__attack-cost">
                        <Pips kinds={attack.cost} paid={paid} label={attack.cost.length ? undefined : 'Bedelsiz'} />
                      </span>
                      <b className="fig">{attack.damage ? `${attack.damage}${attack.mark}` : '—'}</b>
                    </button>
                  ))}
                  {mine && !prompt && !attacks.some((one) => one.open) && nearest?.why && (
                    <p className="tag__note">
                      {nearest.why}
                      {nearest.why.includes('Enerji') ? ' Boş boncuklar eksik Enerji.' : ''}
                    </p>
                  )}
                  <button type="button" className="btn btn--line btn--small tag__attack" disabled={!canRetreat} aria-pressed={retreating} onClick={() => setRetreating((now) => !now)}>
                    <span>{retreating ? 'Vazgeç' : 'Geri çek'}</span>
                    <b className="fig">{topOf(active).retreat}</b>
                  </button>
                </>
              )
            }
          />

          <canvas ref={canvas} className="fx" aria-hidden="true" />
          {strike && strike.t === 'attack' && (
            <p key={beat.n} className="callout" data-kind={strike.kind} data-who={strike.who === 0 ? 'you' : 'rival'} aria-hidden="true">
              {strike.name}
            </p>
          )}
        </section>
      </LayoutGroup>

      <section className="hand" aria-label="Elin" data-setup={settingUp ? '' : undefined}>
        <div className="paper hand__bar">
          <p className="hand__say" aria-live="polite">
            {advice ? (
              <>
                <strong className="coach">Koç</strong> {advice.say}
                {advice.why && <span className="coach__why">{advice.why}</span>}
              </>
            ) : settingUp ? (
              `Ortada: ${first.active === null ? '—' : cardOf(me.hand[first.active]).name}. Yedekte: ${first.bench.length}.`
            ) : heldCard ? (
              <>
                <strong>{heldCard.name}</strong> {told?.says}
              </>
            ) : prompt ? (
              status
            ) : mine ? (
              'Elinden bir karta dokun ya da saldırını seç.'
            ) : (
              `Elinde ${me.hand.length} kart.`
            )}
          </p>
          <div className="hand__acts">
            {settingUp && (
              <button
                type="button"
                className="btn btn--go btn--small"
                disabled={first.active === null}
                data-hint={hinted('ready')}
                onClick={() => {
                  if (first.active === null) return;
                  const action: Action = { do: 'setup', active: first.active, bench: first.bench };
                  setFirst({ active: null, bench: [] });
                  go(action);
                }}
              >
                Hazırım
              </button>
            )}
            {prompt?.kind === 'mon' && prompt.optional && (
              <button type="button" className="btn btn--line btn--small" onClick={() => go({ do: 'pick', mons: [] })}>
                Geç
              </button>
            )}
            {told?.act && (
              <button type="button" className="btn btn--go btn--small" data-hint={hinted(told.act.action.do === 'bench' ? 'bench' : 'play')} onClick={() => go(told.act!.action)}>
                {told.act.label}
              </button>
            )}
            {held !== null &&
              options
                .filter((option): option is Extract<Action, { do: 'attach' | 'evolve' }> => (option.do === 'attach' || option.do === 'evolve') && option.hand === held)
                .map((option) => {
                  const mon = option.to === 'active' ? me.active : me.bench[option.to];
                  if (!mon) return null;
                  return (
                    <button key={`${option.do}-${option.to}`} type="button" className="btn btn--go btn--small" onClick={() => go(option)}>
                      {option.do === 'attach' ? `${topOf(mon).name}${option.to === 'active' ? ' (ortada)' : ''}: bağla` : `${topOf(mon).name}: evrimleştir`}
                    </button>
                  );
                })}
            {heldCard && (
              <button type="button" className="btn btn--line btn--small" onClick={() => setLooking(heldCard)}>
                Yakından bak
              </button>
            )}
            {mine && !prompt && (
              <button type="button" className="btn btn--small" disabled={!can({ do: 'end' })} data-hint={hinted('end')} onClick={() => go({ do: 'end' })}>
                Turu bitir
              </button>
            )}
            <button type="button" className="link hand__coach" aria-pressed={coachOn} onClick={toggleCoach}>
              {coachOn ? 'Koçu kapat' : 'Koçu aç'}
            </button>
          </div>
        </div>
        <ul className="hand__cards" style={{ '--n': Math.max(1, me.hand.length) } as CSSProperties}>
          {me.hand.map((id, place) => {
            const card = cardOf(id);
            const chosen = settingUp ? (first.active === place ? 'Orta' : first.bench.includes(place) ? 'Yedek' : null) : null;
            const usable = settingUp ? isBasic(id) : options.some((option) => 'hand' in option && option.hand === place);
            return (
              <li key={`${place}-${id}`} data-held={held === place ? '' : undefined} data-chosen={chosen ? '' : undefined} data-dull={mine && !usable ? '' : undefined} data-hint={advice?.hand.includes(place) && held !== place ? '' : undefined}>
                <button type="button" className="handcard" onClick={() => onHand(place)} aria-pressed={settingUp ? chosen !== null : mine && !prompt ? held === place : undefined} aria-label={`${card.name}${chosen ? `, ${chosen.toLocaleLowerCase('tr')}` : ''}`}>
                  <CardFace card={card.sort === 'pokemon' ? { ...card, kind: card.type } : card} sizes="(min-width: 40rem) 6rem, 22vw" tilt={false} />
                  {chosen && <b className="handcard__tag">{chosen}</b>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      </div>

      <aside className="paper moveslip" aria-label="Hamle fişi">
        <h2 className="paper__head">Hamle fişi</h2>
        {active ? (
          <ul className="plays">
            {attacks.map(({ attack, index, open, why, guess, paid }) => (
              <li key={attack.name}>
                <button type="button" className="play" disabled={!open} data-kind={active ? topOf(active).type : undefined} data-strong={guess.weak ? '' : undefined} data-hint={hinted('attack', index)} onClick={() => go({ do: 'attack', index })}>
                  <span className="play__name">{attack.name}</span>
                  <Pips kinds={attack.cost} paid={paid} label={attack.cost.length ? undefined : 'Bedelsiz'} />
                  <span className="fig play__hit">
                    {attack.damage ? `${attack.damage}${attack.mark}` : '—'}
                    {(guess.weak || guess.resist) && guess.damage > 0 ? ` → ${guess.damage}` : ''}
                  </span>
                  <span className="play__does">
                    {attack.effects.map(says).join(' ')}
                    {guess.weak ? ' Zayıflık: ×2.' : ''}
                    {guess.resist ? ' Direnç: −30.' : ''}
                    {why ? ` ${why}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="moveslip__hint">Ortada Pokémon yok.</p>
        )}
        <div className="moveslip__row">
          <button type="button" className="btn btn--line btn--small" disabled={!canRetreat} aria-pressed={retreating} onClick={() => setRetreating((now) => !now)}>
            {retreating ? 'Vazgeç' : 'Geri çek'}
          </button>
          <button type="button" className="btn btn--small" disabled={!can({ do: 'end' })} data-hint={hinted('end')} onClick={() => go({ do: 'end' })}>
            Turu bitir
          </button>
        </div>
        <p className="moveslip__hint">
          {active && retreatWhy ? `Geri çekilme: ${REFUSAL[retreatWhy]}` : active ? `Geri çekilme bedeli: ${topOf(active).retreat} Enerji. Turda bir kez.` : ''}
        </p>
      </aside>

      <aside className="paper scoreslip" aria-label="Maç fişi">
        <h2 className="paper__head">Maç fişi</h2>
        <dl className="scoreslip__top">
          <div>
            <dt className="printed">{names[0]}</dt>
            <dd className="fig">
              {taken(0)} / {PRIZES}
            </dd>
          </div>
          <div>
            <dt className="printed">{names[1]}</dt>
            <dd className="fig">
              {taken(1)} / {PRIZES}
            </dd>
          </div>
        </dl>
        <p className="printed scoreslip__round">
          {LEVEL[seat.level].name} · {myDeck?.name} – {deckById(rivalDeck)?.name}
        </p>
        <ol ref={log} className="lines" aria-live="polite" tabIndex={0} aria-label="Olanlar">
          {slip.map((line) => (
            <li key={line.n} data-who={line.who === 0 ? 'you' : 'rival'} data-loud={line.loud ? '' : undefined}>
              <span className="fig lines__n">{String(Math.max(1, line.turn)).padStart(2, '0')}</span>
              <span>{line.text}</span>
            </li>
          ))}
        </ol>
        <p className="scoreslip__foot">
          <button
            type="button"
            className="link"
            onClick={() => {
              clearTable();
              router.push('/deste/');
            }}
          >
            Maçı bırak
          </button>
          <button type="button" className="link" onClick={() => setTaught(false)}>
            Nasıl oynanır
          </button>
          <Link className="link" href="/kurallar/">
            Kurallar
          </Link>
        </p>
      </aside>

      {!taught && !over && (
        <div className="verdict howto" role="dialog" aria-modal="false" aria-labelledby="howto-title">
          <div className="paper verdict__slip howto__slip">
            <p className="printed">Masaya oturmadan önce</p>
            <h2 id="howto-title" className="howto__title">
              Nasıl oynanır
            </h2>
            <ol className="howto__steps">
              <li>
                <strong>Amaç:</strong> rakibinin Pokémon’larını nakavt etmek. Her nakavt sana ödül kartı kazandırır; {PRIZES} ödülü ilk toplayan kazanır.
              </li>
              <li>
                <strong>Masa:</strong> ortada bir Pokémon dövüşür, en çok beşi yedekte bekler. Ortadaki düşerse yerine yedekten biri geçer.
              </li>
              <li>
                <strong>Enerji:</strong> saldırmak için Enerji gerekir. Elinden Enerji kartına dokun, sonra çıkan “bağla” düğmesine bas. Turda bir Enerji bağlanır.
              </li>
              <li>
                <strong>Saldırı:</strong> saldırının yanındaki boncuklar bedelidir; hepsi dolunca düğme açılır. Saldırmak turu bitirir.
              </li>
            </ol>
            <p className="verdict__kinds">Alttaki Koç her adımda ne yapabileceğini söyler ve ilgili kartı parlatır. İstersen kapatabilirsin.</p>
            <div className="verdict__acts">
              <button type="button" className="btn btn--go" onClick={() => setTaught(true)}>
                Anladım
              </button>
              <Link className="btn btn--line" href="/kurallar/">
                Bütün kurallar
              </Link>
            </div>
          </div>
        </div>
      )}

      {over && settled && (
        <div className="verdict" role="dialog" aria-modal="false" aria-labelledby="verdict-title">
          <div className="paper verdict__slip">
            <p className="printed">
              {LEVEL[seat.level].name} · {myDeck?.name} destesi
            </p>
            <h2 id="verdict-title">
              <span className="stamp stamp--word" data-won={game.winner === 0 ? '' : undefined}>
                {game.winner === 0 ? 'Kazandın' : 'Kaybettin'}
              </span>
            </h2>
            <dl>
              <div>
                <dt className="printed">Ödül kartları</dt>
                <dd className="fig">
                  {taken(0)} – {taken(1)}
                </dd>
              </div>
              <div>
                <dt className="printed">Süren tur</dt>
                <dd className="fig">{game.turnNo}</dd>
              </div>
              <div>
                <dt className="printed">Rakibin destesi</dt>
                <dd>{deckById(rivalDeck)?.name}</dd>
              </div>
            </dl>
            <p className="verdict__kinds">
              {game.why ? WHY_OVER[game.why] : ''} {game.winner === 0 ? `${names[1]} bu turda yenildi.` : `${names[1]} bu sefer daha iyi oynadı.`}
            </p>
            <div className="verdict__acts">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setSel(null);
                  begin();
                  sound.coin();
                }}
              >
                Rövanş
              </button>
              <button
                type="button"
                className="btn btn--line"
                onClick={() => {
                  clearTable();
                  router.push('/deste/');
                }}
              >
                Desteyi değiştir
              </button>
            </div>
            <button
              type="button"
              className="link verdict__leave"
              onClick={() => {
                standUp();
                router.push('/');
              }}
            >
              Masadan kalk
            </button>
          </div>
        </div>
      )}

      <CardsDialog
        title={cardsPrompt ? ASK[cardsPrompt.why] : ''}
        cards={cardsPrompt ? cardsPrompt.cards : null}
        choose={cardsPrompt ? { min: cardsPrompt.min, max: cardsPrompt.max, can: (card) => cardsPrompt.why !== 'greatball' || card.sort === 'pokemon', onTake: (places) => go({ do: 'take', cards: places }) } : undefined}
        onLook={setLooking}
      />
      <CardsDialog title={pile === 0 ? 'Iskartan' : `${names[1]}: ıskarta`} cards={pile === null ? null : [...view.players[pile].discard].reverse()} onClose={() => setPile(null)} onLook={setLooking} />
      <CardSheet card={looking} onClose={() => setLooking(null)} />
    </main>
  );
}
