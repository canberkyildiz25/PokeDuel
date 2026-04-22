'use client';
import { useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { TcgCard, RARITY_LABEL } from '@/lib/tcg-types';
import { Spring, clamp, round, adjust } from '@/lib/spring';

interface Props {
  card: TcgCard;
  selected: boolean;
  selectable: boolean;
  slot?: 1 | 2;
  onClick: () => void;
}

const INTERACT = { stiffness: 0.066, damping: 0.25 };
const SNAP     = { stiffness: 0.01,  damping: 0.06  };

// TCG type → CSS class (for glow color)
const typeClass = (types?: string[]) => {
  const t = types?.[0]?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    fire: 'fire', water: 'water', grass: 'grass', lightning: 'electric',
    psychic: 'psychic', fighting: 'fighting', darkness: 'dark',
    metal: 'steel', dragon: 'dragon', fairy: 'fairy',
  };
  return map[t] ?? '';
};

export default function PokemonCard({ card, selected, selectable, slot, onClick }: Props) {
  const rotatorRef = useRef<HTMLDivElement>(null);
  const sRotate = useRef(new Spring({ x: 0,  y: 0  }, INTERACT));
  const sGlare  = useRef(new Spring({ x: 50, y: 50, o: 0 }, INTERACT));
  const sBg     = useRef(new Spring({ x: 50, y: 50 }, INTERACT));
  const rafRef  = useRef<number | null>(null);

  const applyVars = useCallback(() => {
    const el = rotatorRef.current;
    if (!el) return;

    const mr = sRotate.current.tick();
    const mg = sGlare.current.tick();
    const mb = sBg.current.tick();

    const r = sRotate.current.get();
    const g = sGlare.current.get();
    const b = sBg.current.get();

    const fromCenter = clamp(Math.sqrt((g.y - 50) ** 2 + (g.x - 50) ** 2) / 50, 0, 1);

    el.style.setProperty('--pointer-x',           `${g.x.toFixed(2)}%`);
    el.style.setProperty('--pointer-y',           `${g.y.toFixed(2)}%`);
    el.style.setProperty('--pointer-from-center', fromCenter.toFixed(3));
    el.style.setProperty('--pointer-from-top',    (g.y / 100).toFixed(3));
    el.style.setProperty('--pointer-from-left',   (g.x / 100).toFixed(3));
    el.style.setProperty('--card-opacity',        g.o.toFixed(3));
    el.style.setProperty('--rotate-x',            `${r.x.toFixed(2)}deg`);
    el.style.setProperty('--rotate-y',            `${r.y.toFixed(2)}deg`);
    el.style.setProperty('--background-x',        `${b.x.toFixed(2)}%`);
    el.style.setProperty('--background-y',        `${b.y.toFixed(2)}%`);

    if (mr || mg || mb) {
      rafRef.current = requestAnimationFrame(applyVars);
    } else {
      rafRef.current = null;
    }
  }, []);

  const startRaf = useCallback(() => {
    if (rafRef.current === null)
      rafRef.current = requestAnimationFrame(applyVars);
  }, [applyVars]);

  const interact = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = {
      x: clamp(round((100 / rect.width)  * (e.clientX - rect.left))),
      y: clamp(round((100 / rect.height) * (e.clientY - rect.top))),
    };
    const center = { x: pct.x - 50, y: pct.y - 50 };

    sRotate.current.set({ x: round(-(center.x / 3.5)), y: round(center.y / 3.5) }, INTERACT);
    sGlare.current .set({ x: pct.x, y: pct.y, o: 1 }, INTERACT);
    sBg.current    .set({ x: adjust(pct.x, 0, 100, 37, 63), y: adjust(pct.y, 0, 100, 33, 67) }, INTERACT);
    startRaf();
  }, [selectable, selected, startRaf]);

  const interactEnd = useCallback(() => {
    setTimeout(() => {
      sRotate.current.set({ x: 0,  y: 0  }, SNAP);
      sGlare.current .set({ x: 50, y: 50, o: 0 }, SNAP);
      sBg.current    .set({ x: 50, y: 50 }, SNAP);
      startRaf();
    }, 500);
  }, [startRaf]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const rLabel = RARITY_LABEL[card.rarity.toLowerCase()] ?? card.rarity;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`ptcg-card ${typeClass(card.types)}${selected ? ' selected' : ''}${!selectable && !selected ? ' disabled' : ''}`}
      data-rarity="rare holo"
    >
      <div className="card__translater">
        <div
          ref={rotatorRef}
          className="card__rotator"
          onPointerMove={interact}
          onMouseOut={interactEnd}
          onClick={selectable || selected ? onClick : undefined}
          style={{ cursor: selectable || selected ? 'pointer' : 'not-allowed' }}
        >
          {/* Slot badge */}
          {selected && slot && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-2 left-2 z-[50] w-7 h-7 rounded-full flex items-center
                justify-center text-xs font-black text-black shadow-lg"
              style={{ background: slot === 1 ? '#FFD700' : '#C0C0C0', pointerEvents: 'none' }}
            >
              {slot}
            </motion.div>
          )}

          {selected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-2 right-2 z-[50] w-7 h-7 rounded-full bg-green-500
                flex items-center justify-center text-white text-sm font-bold shadow-lg"
              style={{ pointerEvents: 'none' }}
            >
              ✓
            </motion.div>
          )}

          <div className="card__front">
            {/* Real TCG card image — fills the entire card face */}
            <Image
              src={card.images.small}
              alt={card.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 16vw"
              priority={false}
            />
          </div>

          {/* Shine + glare as direct rotator children so .card__rotator > * makes them full-card */}
          <div className="card__shine" />
          <div className="card__glare" />
        </div>
      </div>

      {/* Card name + rarity below the card */}
      <div className="card-label">
        <span className="card-label-name">{card.name}</span>
        <span className="card-label-rarity">{rLabel}</span>
      </div>
    </motion.div>
  );
}
