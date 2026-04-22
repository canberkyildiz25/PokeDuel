'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface Star {
  w: number; h: number; left: string; top: string;
  dur: number; delay: number;
}

interface Props {
  onEnter: () => void;
  visible: boolean;
}

export default function SplashScreen({ onEnter, visible }: Props) {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    setStars(
      Array.from({ length: 60 }, () => ({
        w: Math.random() * 3 + 1,
        h: Math.random() * 3 + 1,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        dur: Math.random() * 3 + 1.5,
        delay: Math.random() * 2,
      }))
    );
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          style={{ background: 'radial-gradient(ellipse at center, #1a0a2e 0%, #0a0a0f 70%)' }}
        >
          {/* Stars — generated client-side to avoid SSR mismatch */}
          {stars.map((s, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white"
              style={{ width: s.w, height: s.h, left: s.left, top: s.top }}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: s.dur, repeat: Infinity, delay: s.delay }}
            />
          ))}

          {/* Pokéball */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 1, type: 'spring', stiffness: 120 }}
            className="relative mb-8"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              className="w-32 h-32 relative"
            >
              {/* Top half */}
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div className="h-1/2 bg-red-600" />
                <div className="h-1/2 bg-white" />
              </div>
              {/* Center line */}
              <div className="absolute top-1/2 left-0 right-0 h-[6px] bg-gray-900 -translate-y-1/2 z-10" />
              {/* Center button */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20
                w-10 h-10 rounded-full bg-white border-4 border-gray-900 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.4, 1], backgroundColor: ['#ddd', '#fff', '#ddd'] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-4 h-4 rounded-full bg-gray-200"
                />
              </div>
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-4 border-gray-900" />
            </motion.div>

            {/* Glow */}
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full blur-xl"
              style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.5) 0%, transparent 70%)' }}
            />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-glow text-6xl md:text-8xl font-black tracking-widest mb-2"
            style={{
              background: 'linear-gradient(135deg, #FFD700, #FF6B00, #FFD700)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            POKÉDUEL
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="text-2xl md:text-3xl font-bold tracking-[0.5em] text-yellow-300/80 mb-12"
          >
            KART SAVAŞI
          </motion.p>

          {/* Enter button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.4, duration: 0.5 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={onEnter}
            className="px-10 py-4 rounded-full text-lg font-bold text-black cursor-pointer
              relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
              boxShadow: '0 0 30px rgba(255,215,0,0.5)',
            }}
          >
            <motion.span
              animate={{ opacity: [1, 0.7, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ⚡ BAŞLA ⚡
            </motion.span>
          </motion.button>

          {/* Lightning bolts */}
          {[-120, 120].map((x, i) => (
            <motion.div
              key={i}
              className="absolute top-1/2 text-4xl pointer-events-none"
              style={{ left: `calc(50% + ${x}px)` }}
              animate={{ opacity: [0, 1, 0], y: [-10, 0, -10] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
            >
              ⚡
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
