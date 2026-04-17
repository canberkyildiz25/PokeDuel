'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { TRAINERS, Trainer } from '@/lib/trainers';
import Confetti from './Confetti';

interface Props {
  onSelect: (trainer: Trainer) => void;
}

function TrainerCard({ trainer, index, onSelect, onCelebrate }: { trainer: Trainer; index: number; onSelect: (t: Trainer) => void; onCelebrate: () => void }) {
  const [imgError, setImgError] = useState(false);

  const handleSelect = () => {
    onCelebrate();
    setTimeout(() => onSelect(trainer), 100);
  };
  return (
    <motion.button
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ y: -8, scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={handleSelect}
      className="relative rounded-2xl overflow-hidden cursor-pointer text-left p-0 border-0 outline-none group"
      style={{
        background: `linear-gradient(145deg, ${trainer.color}33, #0f0f2e)`,
        border: `1px solid ${trainer.color}55`,
        boxShadow: `0 4px 20px ${trainer.color}22`,
      }}
    >
      <div className="absolute inset-0 opacity-10"
        style={{ background: `radial-gradient(circle at 50% 30%, ${trainer.color}, transparent 70%)` }} />

      {/* Sprite */}
      <div className="relative flex justify-center items-end pt-4 pb-0" style={{ height: 110 }}>
        {!imgError ? (
          <motion.img
            src={trainer.sprite}
            alt={trainer.name}
            onError={() => setImgError(true)}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }}
            className="h-full object-contain drop-shadow-lg"
            style={{ filter: `drop-shadow(0 0 15px ${trainer.color}88)` }}
          />
        ) : (
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }}
            className="text-5xl"
          >
            {trainer.emoji}
          </motion.div>
        )}
      </div>

      <div className="px-3 pt-2 pb-4">
        <div className="font-black text-white text-sm leading-tight mb-0.5">{trainer.name}</div>
        <div className="text-[10px] text-white/40 mb-2 leading-tight">{trainer.title}</div>
        <div className="flex gap-1 flex-wrap">
          {trainer.specialty.map(t => (
            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: `${trainer.color}44`, color: trainer.color, border: `1px solid ${trainer.color}66` }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      <motion.div className="absolute inset-0 rounded-2xl pointer-events-none" initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }} style={{ background: `linear-gradient(135deg, ${trainer.color}15, transparent)` }} />
    </motion.button>
  );
}

export default function TrainerSelect({ onSelect }: Props) {
  const [showCelebration, setShowCelebration] = useState(false);

  const handleCelebrate = () => {
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2500);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-10 px-4 relative z-10">
      {showCelebration && <Confetti />}
      <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <h2 className="text-4xl md:text-5xl font-black tracking-widest mb-2"
          style={{ background: 'linear-gradient(135deg,#FFD700,#FF6B00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          ANTRENÖR SEÇ
        </h2>
        <p className="text-white/40 text-sm tracking-widest">Seni temsil edecek antrenörü seç</p>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full max-w-5xl">
        {TRAINERS.map((trainer, i) => (
          <TrainerCard key={trainer.id} trainer={trainer} index={i} onSelect={onSelect} onCelebrate={handleCelebrate} />
        ))}
      </div>
    </div>
  );
}
