'use client';
import { useRef, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Trainer } from '@/lib/trainers';
import { TcgCard } from '@/lib/tcg-types';
import { Spring, clamp, round, adjust } from '@/lib/spring';
import cardsData from '@/lib/cards.json';

const ALL_CARDS = cardsData as TcgCard[];
const INTERACT = { stiffness: 0.066, damping: 0.25 };
const SNAP     = { stiffness: 0.01,  damping: 0.06  };
const DECK_SIZE = 3;

const SUPPORTER_CARDS = ALL_CARDS.filter(
  c => c.supertype === 'Trainer' && c.subtypes?.includes('Supporter')
);

// Human-readable effect descriptions
const SUPPORTER_EFFECTS: Record<string, string> = {
  'swsh9-132':    'Rakibin aktif kartını değiştirir',
  'swsh45-60':    'Aktif kartına 40 HP iyileştirir',
  'swsh6-196':    'Rakibin bir sonraki saldırısını engeller',
  'swsh9-167':    'Bu tur iki kez saldır',
  'swsh1-200':    'Her iki taraf 20 hasar alır',
  'swsh11tg-TG27':'Su kartların hasarı +30 artar',
  'swsh12tg-TG26':'Bir sonraki hasarı %50 azaltır',
  'swsh11tg-TG26':'Ateş kartların hasarı +30 artar',
  'swsh10-204':   'Tüm kartların 20 HP kazanır',
  'swsh12-205':   'Aktif kart 10–50 HP kazanır',
  'swsh1-173':    'Aktif karta 30 HP verir',
};

interface Props {
  trainer: Trainer;
  onConfirm: (deck: TcgCard[], supporter: TcgCard) => void;
  onBack: () => void;
}

function HoloCard({ card, selected, selectable, onClick }: {
  card: TcgCard; selected: boolean; selectable: boolean; onClick: () => void;
}) {
  const rotRef = useRef<HTMLDivElement>(null);
  const sR = useRef(new Spring({ x: 0, y: 0 }, INTERACT));
  const sG = useRef(new Spring({ x: 50, y: 50, o: 0 }, INTERACT));
  const sB = useRef(new Spring({ x: 50, y: 50 }, INTERACT));
  const raf = useRef<number | null>(null);

  const applyVars = useCallback(() => {
    const el = rotRef.current; if (!el) return;
    const mr = sR.current.tick();
    const mg = sG.current.tick();
    const mb = sB.current.tick();
    const r = sR.current.get(), g = sG.current.get(), b = sB.current.get();
    const fc = clamp(Math.sqrt((g.y-50)**2+(g.x-50)**2)/50,0,1);
    el.style.setProperty('--pointer-x',`${g.x.toFixed(2)}%`);
    el.style.setProperty('--pointer-y',`${g.y.toFixed(2)}%`);
    el.style.setProperty('--pointer-from-center',fc.toFixed(3));
    el.style.setProperty('--card-opacity',g.o.toFixed(3));
    el.style.setProperty('--rotate-x',`${r.x.toFixed(2)}deg`);
    el.style.setProperty('--rotate-y',`${r.y.toFixed(2)}deg`);
    el.style.setProperty('--background-x',`${b.x.toFixed(2)}%`);
    el.style.setProperty('--background-y',`${b.y.toFixed(2)}%`);
    if(mr||mg||mb) raf.current=requestAnimationFrame(applyVars);
    else raf.current=null;
  },[]);

  const startRaf = useCallback(()=>{ if(raf.current===null) raf.current=requestAnimationFrame(applyVars); },[applyVars]);

  const interact = useCallback((e: React.PointerEvent<HTMLDivElement>)=>{
    const rect=e.currentTarget.getBoundingClientRect();
    const pct={x:clamp(round((100/rect.width)*(e.clientX-rect.left))),y:clamp(round((100/rect.height)*(e.clientY-rect.top)))};
    const center={x:pct.x-50,y:pct.y-50};
    sR.current.set({x:round(-(center.x/3.5)),y:round(center.y/3.5)},INTERACT);
    sG.current.set({x:pct.x,y:pct.y,o:1},INTERACT);
    sB.current.set({x:adjust(pct.x,0,100,37,63),y:adjust(pct.y,0,100,33,67)},INTERACT);
    startRaf();
  },[startRaf]);

  const interactEnd = useCallback(()=>{
    setTimeout(()=>{
      sR.current.set({x:0,y:0},SNAP); sG.current.set({x:50,y:50,o:0},SNAP); sB.current.set({x:50,y:50},SNAP);
      startRaf();
    },500);
  },[startRaf]);

  useEffect(()=>()=>{ if(raf.current) cancelAnimationFrame(raf.current); },[]);

  return (
    <div
      className={`ptcg-card${selected?' selected':''}${!selectable&&!selected?' disabled':''}`}
      data-rarity="rare holo"
      onClick={selectable||selected ? onClick : undefined}
    >
      <div className="card__translater">
        <div ref={rotRef} className="card__rotator"
          onPointerMove={interact} onMouseOut={interactEnd}
          style={{ cursor: selectable||selected ? 'pointer' : 'not-allowed' }}
        >
          {selected && (
            <motion.div initial={{scale:0}} animate={{scale:1}}
              className="absolute top-1 right-1 z-[50] w-6 h-6 rounded-full bg-green-500
                flex items-center justify-center text-white text-xs font-bold"
              style={{pointerEvents:'none'}}>✓</motion.div>
          )}
          <div className="card__front">
            <Image src={card.images.small} alt={card.name} fill className="object-cover" sizes="140px" />
            <div className="card__shine" /><div className="card__glare" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SupporterCard({ card, selected, onClick }: { card: TcgCard; selected: boolean; onClick: () => void }) {
  const rotRef = useRef<HTMLDivElement>(null);
  const sR = useRef(new Spring({ x: 0, y: 0 }, INTERACT));
  const sG = useRef(new Spring({ x: 50, y: 50, o: 0 }, INTERACT));
  const sB = useRef(new Spring({ x: 50, y: 50 }, INTERACT));
  const raf = useRef<number | null>(null);

  const applyVars = useCallback(() => {
    const el = rotRef.current; if (!el) return;
    const mr = sR.current.tick();
    const mg = sG.current.tick();
    const mb = sB.current.tick();
    const r = sR.current.get(), g = sG.current.get(), b = sB.current.get();
    const fc = clamp(Math.sqrt((g.y-50)**2+(g.x-50)**2)/50,0,1);
    el.style.setProperty('--pointer-x',`${g.x.toFixed(2)}%`);
    el.style.setProperty('--pointer-y',`${g.y.toFixed(2)}%`);
    el.style.setProperty('--pointer-from-center',fc.toFixed(3));
    el.style.setProperty('--card-opacity',g.o.toFixed(3));
    el.style.setProperty('--rotate-x',`${r.x.toFixed(2)}deg`);
    el.style.setProperty('--rotate-y',`${r.y.toFixed(2)}deg`);
    el.style.setProperty('--background-x',`${b.x.toFixed(2)}%`);
    el.style.setProperty('--background-y',`${b.y.toFixed(2)}%`);
    if(mr||mg||mb) raf.current=requestAnimationFrame(applyVars);
    else raf.current=null;
  },[]);

  const startRaf = useCallback(()=>{ if(raf.current===null) raf.current=requestAnimationFrame(applyVars); },[applyVars]);

  const interact = useCallback((e: React.PointerEvent<HTMLDivElement>)=>{
    const rect=e.currentTarget.getBoundingClientRect();
    const pct={x:clamp(round((100/rect.width)*(e.clientX-rect.left))),y:clamp(round((100/rect.height)*(e.clientY-rect.top)))};
    const center={x:pct.x-50,y:pct.y-50};
    sR.current.set({x:round(-(center.x/3.5)),y:round(center.y/3.5)},INTERACT);
    sG.current.set({x:pct.x,y:pct.y,o:1},INTERACT);
    sB.current.set({x:adjust(pct.x,0,100,37,63),y:adjust(pct.y,0,100,33,67)},INTERACT);
    startRaf();
  },[startRaf]);

  const interactEnd = useCallback(()=>{
    setTimeout(()=>{
      sR.current.set({x:0,y:0},SNAP); sG.current.set({x:50,y:50,o:0},SNAP); sB.current.set({x:50,y:50},SNAP);
      startRaf();
    },500);
  },[startRaf]);

  useEffect(()=>()=>{ if(raf.current) cancelAnimationFrame(raf.current); },[]);

  return (
    <div className="flex flex-col items-center gap-2 cursor-pointer" onClick={onClick}>
      <div className={`ptcg-card${selected ? ' selected' : ''}`} data-rarity="rare holo">
        <div className="card__translater">
          <div ref={rotRef} className="card__rotator" onPointerMove={interact} onMouseOut={interactEnd}>
            {selected && (
              <motion.div initial={{scale:0}} animate={{scale:1}}
                className="absolute top-1 right-1 z-[50] w-6 h-6 rounded-full bg-yellow-400
                  flex items-center justify-center text-black text-xs font-black"
                style={{pointerEvents:'none'}}>S</motion.div>
            )}
            <div className="card__front">
              <Image src={card.images.small} alt={card.name} fill className="object-cover" sizes="140px" />
              <div className="card__shine" /><div className="card__glare" />
            </div>
          </div>
        </div>
      </div>
      <div className="text-center max-w-[120px]">
        <div className="text-white/80 text-[10px] font-black truncate">{card.name}</div>
        <div className="text-yellow-400/70 text-[9px] leading-tight mt-0.5">
          {SUPPORTER_EFFECTS[card.id] ?? 'Özel efekt'}
        </div>
      </div>
    </div>
  );
}

export default function DeckSelect({ trainer, onConfirm, onBack }: Props) {
  const [deck, setDeck] = useState<TcgCard[]>([]);
  const [supporter, setSupporter] = useState<TcgCard | null>(null);
  const [search, setSearch] = useState('');

  const pool = ALL_CARDS.filter(c =>
    c.supertype !== 'Trainer' &&
    (!c.types || trainer.specialty.some(s => c.types?.includes(s)) || c.types?.includes('Colorless'))
  );

  const filtered = pool.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (c: TcgCard) => {
    setDeck(prev => {
      if (prev.find(d => d.id === c.id)) return prev.filter(d => d.id !== c.id);
      if (prev.length >= DECK_SIZE) return prev;
      return [...prev, c];
    });
  };

  const canConfirm = deck.length === DECK_SIZE && supporter !== null;

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 px-4 py-4"
        style={{ background: 'rgba(10,10,26,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="max-w-6xl mx-auto flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={onBack}
              className="px-3 py-1.5 rounded-full text-sm text-white/60 hover:text-white cursor-pointer transition-all"
              style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)'}}>
              ← Geri
            </motion.button>
            <div>
              <h2 className="text-xl font-black text-white">
                <span style={{ color: trainer.color }}>{trainer.emoji} {trainer.name}</span>
                <span className="text-white/50 font-normal text-base ml-2">— Deste Seç</span>
              </h2>
              <p className="text-white/40 text-xs">{DECK_SIZE} Pokémon + 1 Supporter • {trainer.specialty.join(', ')} tipi</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🔍</span>
              <input type="text" placeholder="Kart ara..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-full text-sm text-white placeholder-white/30 outline-none"
                style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)'}} />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* Pokemon slots */}
              {Array.from({length: DECK_SIZE}).map((_,i) => (
                <div key={i} className="w-10 h-14 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{
                    background: deck[i] ? `${trainer.color}33` : 'rgba(255,255,255,0.05)',
                    border: deck[i] ? `1px solid ${trainer.color}66` : '1px dashed rgba(255,255,255,0.15)',
                  }}>
                  {deck[i]
                    ? <Image src={deck[i].images.small} alt={deck[i].name} width={40} height={56} className="object-cover rounded" />
                    : <span className="text-white/20">{i+1}</span>}
                </div>
              ))}

              {/* Supporter slot */}
              <div className="w-10 h-14 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{
                  background: supporter ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)',
                  border: supporter ? '1px solid rgba(255,215,0,0.6)' : '1px dashed rgba(255,215,0,0.3)',
                }}>
                {supporter
                  ? <Image src={supporter.images.small} alt={supporter.name} width={40} height={56} className="object-cover rounded" />
                  : <span className="text-yellow-400/40 text-base">S</span>}
              </div>

              <motion.button
                whileHover={canConfirm?{scale:1.05}:{}}
                whileTap={canConfirm?{scale:0.95}:{}}
                onClick={() => canConfirm && onConfirm(deck, supporter!)}
                className="px-4 py-2 rounded-full font-black text-sm ml-2 transition-all"
                style={{
                  background: canConfirm ? `linear-gradient(135deg,${trainer.color},${trainer.color2})` : 'rgba(255,255,255,0.08)',
                  color: canConfirm ? '#000' : 'rgba(255,255,255,0.3)',
                  cursor: canConfirm ? 'pointer' : 'not-allowed',
                  boxShadow: canConfirm ? `0 0 20px ${trainer.color}66` : 'none',
                }}>
                {deck.length}/{DECK_SIZE} {supporter ? '✓' : 'S?'} Onayla →
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Pokemon card grid */}
      <div className="px-4 pt-6 pb-2 max-w-6xl mx-auto w-full">
        <div className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">
          ⚔️ Pokémon Kartları — {deck.length}/{DECK_SIZE} seçildi
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          <AnimatePresence>
            {filtered.map((c, i) => (
              <motion.div key={c.id}
                initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}}
                transition={{delay:Math.min(i*0.02,0.3)}}>
                <HoloCard
                  card={c}
                  selected={!!deck.find(d=>d.id===c.id)}
                  selectable={deck.length < DECK_SIZE || !!deck.find(d=>d.id===c.id)}
                  onClick={()=>toggle(c)}
                />
                <div className="text-center mt-1">
                  <div className="text-white/60 text-[10px] font-bold truncate">{c.name}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-white/40">Kart bulunamadı</div>
        )}
      </div>

      {/* Supporter card section */}
      <div className="px-4 pt-4 pb-10 max-w-6xl mx-auto w-full">
        <div className="text-yellow-400/80 text-xs font-bold uppercase tracking-widest mb-4">
          ✨ Supporter Kartı — 1 seç (savaşta bir kez kullanılabilir)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {SUPPORTER_CARDS.map(c => (
            <SupporterCard
              key={c.id}
              card={c}
              selected={supporter?.id === c.id}
              onClick={() => setSupporter(prev => prev?.id === c.id ? null : c)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
