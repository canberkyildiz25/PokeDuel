'use client';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  emoji: string;
}

const CELEBRATION_EMOJIS = ['🎉', '✨', '⭐', '🌟', '💫', '🎊', '🏆', '🎯'];

export default function Confetti() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.2,
      duration: 2 + Math.random() * 1,
      size: 20 + Math.random() * 30,
      emoji: CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)],
    }));
    setParticles(newParticles);
  }, []);

  return (
    <>
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          initial={{ opacity: 1, y: -100, x: 0, rotate: 0, scale: 1 }}
          animate={{
            opacity: 0,
            y: window.innerHeight + 100,
            x: (Math.random() - 0.5) * 200,
            rotate: Math.random() * 720,
            scale: 0,
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: 'easeInOut',
          }}
          className="fixed pointer-events-none"
          style={{
            left: `${particle.left}%`,
            top: 0,
            fontSize: particle.size,
            zIndex: 9999,
          }}
        >
          {particle.emoji}
        </motion.div>
      ))}
    </>
  );
}
