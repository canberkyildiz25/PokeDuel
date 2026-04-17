'use client';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { TcgCard, rarityScore, RARITY_LABEL } from '@/lib/tcg-types';
import { useState } from 'react';

interface Props {
  card1: TcgCard;
  card2: TcgCard;
  onClose: () => void;
}

export default function CompareModal({ card1, card2, onClose }: Props) {
  const [battled, setBattled] = useState(false);

  const score1 = rarityScore(card1.rarity);
  const score2 = rarityScore(card2.rarity);
  const winner = score1 > score2 ? card1 : score2 > score1 ? card2 : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center p-4"
        style={{ backdropFilter: 'blur(10px)', background: 'rgba(0,0,0,0.88)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="w-full max-w-3xl rounded-3xl overflow-hidden"
          style={{ background: 'rgba(15,15,30,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 className="text-lg font-black text-white tracking-widest">⚔️ KART KARŞILAŞTIRMA</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/50
                hover:text-white hover:bg-white/10 transition-all cursor-pointer text-sm"
            >✕</button>
          </div>

          {/* Cards side by side */}
          <div className="grid grid-cols-3 gap-6 p-6 items-center">
            <CardFace card={card1} isWinner={battled && winner?.id === card1.id} battled={battled} side="left" />

            {/* VS column */}
            <div className="flex flex-col items-center gap-4">
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-5xl font-black"
                style={{
                  background: 'linear-gradient(135deg,#FFD700,#FF6B00)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >VS</motion.div>

              {!battled && (
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setBattled(true)}
                  className="px-5 py-2.5 rounded-full font-black text-sm text-black cursor-pointer"
                  style={{ background: 'linear-gradient(135deg,#FFD700,#FF6B00)', boxShadow: '0 0 20px rgba(255,200,0,.5)' }}
                >⚡ DÖVÜŞ!</motion.button>
              )}

              {battled && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="text-center"
                >
                  {winner ? (
                    <>
                      <div className="text-3xl mb-1">🏆</div>
                      <div className="text-xs text-white/50 mb-1">Kazanan</div>
                      <div className="text-sm font-black text-yellow-400">{winner.name}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-3xl mb-1">🤝</div>
                      <div className="text-xs text-white/60">Beraberlik!</div>
                    </>
                  )}
                </motion.div>
              )}
            </div>

            <CardFace card={card2} isWinner={battled && winner?.id === card2.id} battled={battled} side="right" />
          </div>

          {/* Stats comparison */}
          <div className="px-6 pb-6">
            <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <CompareRow label="İsim" v1={card1.name} v2={card2.name} />
              <CompareRow label="Tür" v1={card1.types?.join(', ') ?? '—'} v2={card2.types?.join(', ') ?? '—'} />
              <CompareRow label="Set" v1={card1.set.toUpperCase()} v2={card2.set.toUpperCase()} />
              <CompareRow label="Alt Tür" v1={card1.subtypes.join(', ')} v2={card2.subtypes.join(', ')} />
              <CompareRow
                label="Nadir"
                v1={RARITY_LABEL[card1.rarity.toLowerCase()] ?? card1.rarity}
                v2={RARITY_LABEL[card2.rarity.toLowerCase()] ?? card2.rarity}
                score1={score1} score2={score2}
              />
              <CompareRow
                label="Güç Puanı"
                v1={String(score1)}
                v2={String(score2)}
                score1={score1} score2={score2}
                isScore
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function CardFace({ card, isWinner, battled, side }: {
  card: TcgCard; isWinner: boolean; battled: boolean; side: 'left' | 'right';
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      {battled && isWinner && (
        <motion.div initial={{ y: -20, scale: 0 }} animate={{ y: 0, scale: 1 }} className="text-3xl">👑</motion.div>
      )}
      <motion.div
        className="relative rounded-xl overflow-hidden shadow-2xl"
        style={{ aspectRatio: '0.718', width: '100%' }}
        animate={
          battled && isWinner
            ? { x: [0, side === 'left' ? 8 : -8, 0], scale: [1, 1.05, 1] }
            : battled && !isWinner
            ? { opacity: [1, 0.6, 1] }
            : { y: [0, -6, 0] }
        }
        transition={battled
          ? { duration: 0.6, repeat: 2 }
          : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Image
          src={card.images.large || card.images.small}
          alt={card.name}
          fill
          className="object-cover"
          sizes="200px"
        />
      </motion.div>
      <div className="text-center">
        <div className="font-black text-white text-sm">{card.name}</div>
        <div className="text-white/40 text-xs">{card.set.toUpperCase()} #{card.number}</div>
      </div>
    </div>
  );
}

function CompareRow({ label, v1, v2, score1, score2, isScore }: {
  label: string; v1: string; v2: string;
  score1?: number; score2?: number; isScore?: boolean;
}) {
  const win1 = score1 !== undefined && score2 !== undefined && score1 > score2;
  const win2 = score1 !== undefined && score2 !== undefined && score2 > score1;

  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b border-white/5 last:border-0 text-sm items-center">
      <div className={`text-right font-bold ${isScore ? 'text-lg' : ''}`}
        style={{ color: win1 ? '#4ade80' : win2 ? '#f87171' : '#fff' }}>
        {v1}
      </div>
      <div className="text-center text-white/30 text-xs font-bold uppercase tracking-widest">{label}</div>
      <div className={`text-left font-bold ${isScore ? 'text-lg' : ''}`}
        style={{ color: win2 ? '#4ade80' : win1 ? '#f87171' : '#fff' }}>
        {v2}
      </div>
    </div>
  );
}
