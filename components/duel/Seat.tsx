'use client';

import { Drop, Fire, Lightning, MoonStars, Spiral } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';
import { cardById } from '@/lib/cards';
import { BENCH, conditionsOf, energyOf, hpLeft, PRIZES, topOf } from '@/lib/duel/game';
import type { Condition, Mon, Player, Spot, Who } from '@/lib/duel/types';
import { CONDITION } from '@/lib/words';
import { Pips } from '../Bits';
import { CardBack, CardFace } from '../CardFace';

/** Something that has just happened to a Pokémon, shown over it for a moment. */
export interface Mark {
  key: string;
  uid: number;
  text: string;
  tone: 'hit' | 'hard' | 'heal' | 'ail' | 'note';
  /** Whether it waits for an attack to land before it shows. */
  late: boolean;
}

const AILS: Record<Condition, ReactNode> = {
  burned: <Fire size={14} weight="fill" aria-hidden="true" />,
  poisoned: <Drop size={14} weight="fill" aria-hidden="true" />,
  asleep: <MoonStars size={14} weight="fill" aria-hidden="true" />,
  paralyzed: <Lightning size={14} weight="fill" aria-hidden="true" />,
  confused: <Spiral size={14} weight="bold" aria-hidden="true" />,
};

/** A card travelling from one place on the mat to another. */
const TRAVEL = { type: 'spring', duration: 0.5, bounce: 0.12 } as const;

function Troubles({ mon }: { mon: Mon }) {
  const list = conditionsOf(mon);
  if (!list.length) return null;
  return (
    <span className="troubles">
      {list.map((name) => (
        <span key={name} className="trouble" data-ail={name}>
          {AILS[name]}
          {CONDITION[name]}
        </span>
      ))}
    </span>
  );
}

function Marks({ marks, uid }: { marks: Mark[]; uid: number }) {
  const mine = marks.filter((mark) => mark.uid === uid);
  if (!mine.length) return null;
  return (
    <span className="marks" aria-hidden="true">
      {mine.map((mark, order) => (
        <span key={mark.key} className="mark" data-tone={mark.tone} data-late={mark.late ? '' : undefined} style={{ '--n': order } as CSSProperties}>
          {mark.text}
        </span>
      ))}
    </span>
  );
}

/** A Pokémon lying in its place: the card on top, and under its edge the card it evolved from. */
function MonView({ mon, small, shaken, fallen, marks, state, saying, onPress }: { mon: Mon; small: boolean; shaken: boolean; fallen: boolean; marks: Mark[]; state: 'open' | 'picked' | null; saying: string; onPress: () => void }) {
  const top = topOf(mon);
  return (
    <motion.div className={small ? 'spot spot--small' : 'spot'} layoutId={`mon-${mon.uid}`} transition={TRAVEL} data-uid={mon.uid} data-shaken={shaken ? '' : undefined} data-fallen={fallen ? '' : undefined} data-deep={mon.cards.length > 1 ? '' : undefined} data-state={state ?? undefined} data-kind={top.type}>
      <button type="button" className="spot__card" onClick={onPress} aria-label={saying}>
        <CardFace card={{ ...top, kind: top.type }} sizes={small ? '(min-width: 40rem) 5rem, 17vw' : '(min-width: 40rem) 9rem, 30vw'} lead={!small} />
      </button>
      {small && (
        <span className="spot__facts">
          <b className="fig" data-low={hpLeft(mon) <= top.hp * 0.3 ? '' : undefined}>
            {hpLeft(mon)}
          </b>
          {mon.energy.length > 0 && <Pips kinds={energyOf(mon)} />}
        </span>
      )}
      <Marks marks={marks} uid={mon.uid} />
    </motion.div>
  );
}

/* One side of the mat: the Active Pokémon with everything known about it,
   the five places of the Bench, the Prize cards still to be taken, the deck
   and the discard pile. What pressing a Pokémon does is the table's business. */
export function Seat({
  who,
  player,
  name,
  mark,
  marks,
  shaken,
  fallen,
  stateOf,
  onSpot,
  saying,
  placing,
  onPlace,
  preview,
  onDiscard,
  under,
}: {
  who: Who;
  player: Player;
  name: string;
  mark: ReactNode;
  marks: Mark[];
  /** The numbers of the Pokémon that have just been hit, so that they can flinch. */
  shaken: number[];
  /** The numbers of the Pokémon that have just been Knocked Out and are about to leave the mat. */
  fallen: number[];
  /** Whether a Pokémon is one of those being chosen between, or has been picked. */
  stateOf: (spot: Spot) => 'open' | 'picked' | null;
  onSpot: (spot: Spot) => void;
  /** What pressing a Pokémon does, in words. */
  saying: (spot: Spot) => string;
  /** Whether a card in the hand is waiting for an empty place on the Bench. */
  placing?: boolean;
  onPlace?: () => void;
  /** The cards chosen for the first Active Spot and Bench, before they are put down. */
  preview?: { active: string | null; bench: string[] };
  onDiscard: () => void;
  under?: ReactNode;
}) {
  const active = player.active;
  const top = active ? topOf(active) : null;
  const share = active && top ? hpLeft(active) / top.hp : 1;
  const ghost = (id: string | null | undefined) => {
    const card = id ? cardById(id) : null;
    return card ? <CardFace card={card} sizes="9rem" tilt={false} /> : null;
  };
  const lastDiscard = player.discard.length ? cardById(player.discard[player.discard.length - 1]) : null;
  const mine = who === 0;

  return (
    <div className="seat" data-who={mine ? 'you' : 'rival'}>
      <div className="seat__who">
        {mark}
        <span className="seat__name">{name}</span>
        {!mine && (
          <span className="seat__hand fig" role="img" aria-label={`Elinde ${player.hand.length} kart`}>
            <span className="label">El</span> {player.hand.length}
          </span>
        )}
      </div>

      <div className="seat__prizes" role="img" aria-label={`${player.prizes.length} ödül kartı kaldı, ${PRIZES} üzerinden`}>
        <span className="label">Ödül</span>
        <span className="prizes">
          {Array.from({ length: PRIZES }, (_, index) => (
            <i key={index} data-left={index < player.prizes.length ? '' : undefined} />
          ))}
        </span>
        <b className="fig">{player.prizes.length}</b>
      </div>

      <div className="seat__front">
        <div className="zone zone--active" data-empty={active ? undefined : ''}>
          {active ? <MonView mon={active} small={false} shaken={shaken.includes(active.uid)} fallen={fallen.includes(active.uid)} marks={marks} state={stateOf('active')} saying={saying('active')} onPress={() => onSpot('active')} /> : ghost(preview?.active)}
        </div>
        {active && top ? (
          <div className="paper tag">
            <p className="tag__name">{top.name}</p>
            <span className="health" data-low={share <= 0.3 ? '' : undefined}>
              <span className="fig">
                {hpLeft(active)}
                <span className="health__of"> / {top.hp}</span>
              </span>
              <span className="health__bar" role="img" aria-label={`Can ${hpLeft(active)}, en çok ${top.hp}`}>
                <i style={{ transform: `scaleX(${share})` }} />
              </span>
            </span>
            <p className="tag__row">
              <Pips kinds={energyOf(active)} />
            </p>
            <Troubles mon={active} />
            {under && <div className="tag__acts">{under}</div>}
          </div>
        ) : (
          <div className="tag tag--none" />
        )}
      </div>

      <ul className="bench" aria-label={mine ? 'Yedeğin' : 'Rakibin yedeği'}>
        {Array.from({ length: BENCH }, (_, index) => {
          const mon = player.bench[index];
          const pending = !mon ? preview?.bench[index - player.bench.length] : undefined;
          return (
            <li key={mon ? `m${mon.uid}` : `e${index}`}>
              <div className="zone" data-empty={mon ? undefined : ''}>
                {mon ? (
                  <MonView mon={mon} small shaken={shaken.includes(mon.uid)} fallen={fallen.includes(mon.uid)} marks={marks} state={stateOf(index)} saying={saying(index)} onPress={() => onSpot(index)} />
                ) : pending ? (
                  ghost(pending)
                ) : placing && index === player.bench.length ? (
                  <button type="button" className="zone__put" onClick={onPlace}>
                    Buraya koy
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="piles">
        <span className="pile" role="img" aria-label={`Destede ${player.deck.length} kart`}>
          <span className="pile__card">{player.deck.length > 0 && <CardBack />}</span>
          <span className="label">Deste</span>
          <b className="fig">{player.deck.length}</b>
        </span>
        <button type="button" className="pile" onClick={onDiscard} disabled={!player.discard.length} aria-label={`${mine ? 'Iskartan' : 'Rakibin ıskartası'}: ${player.discard.length} kart. Bak`}>
          <span className="pile__card">{lastDiscard && <CardFace card={lastDiscard} sizes="4rem" tilt={false} />}</span>
          <span className="label">Iskarta</span>
          <b className="fig">{player.discard.length}</b>
        </button>
      </div>
    </div>
  );
}
