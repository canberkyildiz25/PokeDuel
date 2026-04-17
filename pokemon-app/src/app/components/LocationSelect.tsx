'use client';
import { motion } from 'framer-motion';
import { LOCATIONS, Location } from '@/lib/locations';
import { Trainer } from '@/lib/trainers';

interface Props {
  trainer: Trainer;
  onSelect: (location: Location) => void;
  onBack: () => void;
}

export default function LocationSelect({ trainer, onSelect, onBack }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4 relative z-10">
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={onBack}
        className="self-start mb-6 px-3 py-1.5 rounded-full text-sm text-white/60 hover:text-white cursor-pointer"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        ← Geri
      </motion.button>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <h2 className="text-4xl md:text-5xl font-black tracking-widest mb-2"
          style={{
            background: 'linear-gradient(135deg,#FFD700,#FF6B00)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
          ARENA SEÇ
        </h2>
        <p className="text-white/40 text-sm">Mücadelenin gerçekleşeceği yeri seç</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full max-w-5xl">
        {LOCATIONS.map((loc, i) => (
          <motion.button
            key={loc.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            whileHover={{ y: -10, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(loc)}
            className="relative rounded-2xl overflow-hidden cursor-pointer text-left h-52 border-0 outline-none"
            style={{
              border: `1px solid ${loc.accent}44`,
              boxShadow: `0 4px 30px ${loc.accent}22`,
            }}
          >
            {/* Background image with gradient fallback */}
            <div
              className="absolute inset-0"
              style={{ background: loc.bg }}
            />
            <div
              className="absolute inset-0 bg-center bg-cover bg-no-repeat"
              style={{ backgroundImage: `url(${loc.image})` }}
            />
            {/* Dark overlay so text is readable */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)' }} />

            {/* Animated glow on hover */}
            <motion.div
              className="absolute inset-0 opacity-0 rounded-2xl"
              style={{ background: `radial-gradient(circle at 50% 50%, ${loc.accent}33, transparent 70%)` }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />

            {/* Floating particles */}
            {[...Array(4)].map((_, j) => (
              <motion.div key={j}
                className="absolute w-1 h-1 rounded-full"
                style={{
                  background: loc.accent,
                  left: `${20 + j * 20}%`,
                  top: `${30 + (j % 2) * 30}%`,
                }}
                animate={{ y: [0, -12, 0], opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2 + j * 0.5, repeat: Infinity, delay: j * 0.4 }}
              />
            ))}

            <div className="relative z-10 p-5 h-full flex flex-col justify-end">
              <div className="text-3xl mb-1">{loc.emoji}</div>
              <h3 className="font-black text-white text-lg leading-tight mb-1">{loc.name}</h3>
              <p className="text-white/60 text-xs leading-relaxed line-clamp-2 mb-2">{loc.description}</p>

              <div className="flex items-center justify-between">
                <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ background: `${loc.accent}44`, color: loc.accent, border: `1px solid ${loc.accent}66` }}>
                  {loc.weatherEffect}
                </span>
                {loc.typeBonus && (
                  <span className="text-xs text-white/50">
                    ⚡ {loc.typeBonus} +15%
                  </span>
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
