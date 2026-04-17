'use client';
import { motion } from 'framer-motion';
import { STAT_COLORS, STAT_LABELS } from '@/lib/pokemon-utils';

interface Props {
  statName: string;
  value: number;
  max?: number;
  delay?: number;
  highlight?: 'win' | 'lose' | null;
}

export default function StatBar({ statName, value, max = 255, delay = 0, highlight }: Props) {
  const pct = Math.min((value / max) * 100, 100);
  const color = STAT_COLORS[statName] ?? '#aaa';
  const label = STAT_LABELS[statName] ?? statName;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-16 text-right text-xs font-bold text-white/60 shrink-0">{label}</span>
      <span
        className="w-8 text-center text-xs font-black shrink-0"
        style={{
          color: highlight === 'win' ? '#4ade80' : highlight === 'lose' ? '#f87171' : '#fff',
        }}
      >
        {value}
      </span>
      <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, delay, ease: 'easeOut' }}
          className="h-full rounded-full relative overflow-hidden"
          style={{ background: color }}
        >
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: delay + 0.5 }}
            className="absolute inset-0 w-full"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
