'use client';

import { useEffect, useRef } from 'react';
import type { Kind } from '@/lib/duel/types';
import { KIND } from '@/lib/words';

interface Pictured {
  name: string;
  small: string;
  large: string;
  kind?: Kind;
}

/* Where a card is, as it leans: how far it is turned, where the pointer is
   over it, how far the foil has slid, and how brightly it is lit. */
const FIELDS = ['rx', 'ry', 'px', 'py', 'bx', 'by', 'lit'] as const;
type Pose = Record<(typeof FIELDS)[number], number>;
const REST: Pose = { rx: 0, ry: 0, px: 50, py: 50, bx: 50, by: 50, lit: 0 };
/** How hard a card is pulled towards where it should be, and how much of its speed it loses on the way. */
const FOLLOW = { pull: 0.07, drag: 0.26 };
const RETURN = { pull: 0.035, drag: 0.2 };
/** How far a card turns towards the pointer: the pointer at an edge turns it this many degrees. */
const TURN = 14;

/* Makes one card lean after the pointer on springs, as a card held in the
   hand does: it turns in all four directions, the foil slides, and the glare
   sits under the pointer. Nothing runs while the card lies still. */
function leaning(card: HTMLElement, touch: boolean) {
  const now: Pose = { ...REST };
  const speed: Pose = { rx: 0, ry: 0, px: 0, py: 0, bx: 0, by: 0, lit: 0 };
  let goal: Pose = { ...REST };
  let how = FOLLOW;
  let frame = 0;
  let leaving = 0;

  const draw = () => {
    card.style.setProperty('--rx', `${now.rx.toFixed(2)}deg`);
    card.style.setProperty('--ry', `${now.ry.toFixed(2)}deg`);
    card.style.setProperty('--px', `${now.px.toFixed(1)}%`);
    card.style.setProperty('--py', `${now.py.toFixed(1)}%`);
    card.style.setProperty('--bx', `${now.bx.toFixed(1)}%`);
    card.style.setProperty('--by', `${now.by.toFixed(1)}%`);
    card.style.setProperty('--lit', now.lit.toFixed(3));
  };
  const step = () => {
    let moving = false;
    for (const field of FIELDS) {
      speed[field] = (speed[field] + (goal[field] - now[field]) * how.pull) * (1 - how.drag);
      now[field] += speed[field];
      if (Math.abs(speed[field]) > 0.004 || Math.abs(goal[field] - now[field]) > 0.02) moving = true;
    }
    draw();
    if (moving) frame = requestAnimationFrame(step);
    else {
      frame = 0;
      if (goal.lit === 0) {
        for (const name of ['--rx', '--ry', '--px', '--py', '--bx', '--by', '--lit']) card.style.removeProperty(name);
        card.removeAttribute('data-lit');
      }
    }
  };
  const run = () => {
    if (!frame) frame = requestAnimationFrame(step);
  };

  const over = (event: PointerEvent) => {
    if (event.pointerType === 'touch' && !touch) return;
    if (!document.documentElement.classList.contains('live')) return;
    clearTimeout(leaving);
    const box = card.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((event.clientX - box.left) / box.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - box.top) / box.height) * 100));
    // the side under the pointer rises towards it
    goal = { ry: -((x - 50) / 50) * TURN, rx: ((y - 50) / 50) * TURN, px: x, py: y, bx: 37 + x * 0.26, by: 33 + y * 0.34, lit: 1 };
    how = FOLLOW;
    card.setAttribute('data-lit', '');
    run();
  };
  const away = () => {
    clearTimeout(leaving);
    leaving = window.setTimeout(() => {
      goal = { ...REST };
      how = RETURN;
      run();
    }, 140);
  };

  card.addEventListener('pointermove', over);
  card.addEventListener('pointerleave', away);
  card.addEventListener('pointercancel', away);
  card.addEventListener('pointerup', away);
  return () => {
    card.removeEventListener('pointermove', over);
    card.removeEventListener('pointerleave', away);
    card.removeEventListener('pointercancel', away);
    card.removeEventListener('pointerup', away);
    clearTimeout(leaving);
    if (frame) cancelAnimationFrame(frame);
  };
}

/* A card, face up. The picture is the scan on the card database's server: a
   small one and a large one, and the browser takes whichever the space calls
   for. Under a mouse the card leans towards the pointer and its foil catches
   the light; `touch` lets a finger do the same, for a card held up to be
   looked at. A visitor who has asked for less motion gets a card lying flat. */
export function CardFace({ card, sizes, tilt = true, touch = false, lead = false, out = false, label }: { card: Pictured; sizes: string; tilt?: boolean; touch?: boolean; lead?: boolean; out?: boolean; label?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!tilt || out || !ref.current) return;
    return leaning(ref.current, touch);
  }, [tilt, touch, out]);

  return (
    <span ref={ref} className="card" data-kind={card.kind} data-out={out ? '' : undefined} data-touch={touch ? '' : undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element -- the scan is on another site's server and is shown as it comes */}
      <img src={card.small} srcSet={`${card.small} 245w, ${card.large} 734w`} sizes={sizes} alt={label ?? (card.kind ? `${card.name}, ${KIND[card.kind]} kartı` : card.name)} width={245} height={342} loading={lead ? 'eager' : 'lazy'} decoding="async" draggable={false} />
      <span className="card__foil" aria-hidden="true" />
      <span className="card__glare" aria-hidden="true" />
    </span>
  );
}

/** A card lying face down. The back is this table's own. */
export function CardBack({ label }: { label?: string }) {
  return <span className="card card--back" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'} />;
}
