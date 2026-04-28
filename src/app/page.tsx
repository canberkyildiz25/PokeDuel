'use client';
import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trainer, getRival } from '@/lib/trainers';
import { Location } from '@/lib/locations';
import { TcgCard } from '@/lib/tcg-types';
import StarField from './components/StarField';
import SplashScreen from './components/SplashScreen';
import AudioPlayer from './components/AudioPlayer';
import TrainerSelect from './components/TrainerSelect';
import DeckSelect from './components/DeckSelect';
import LocationSelect from './components/LocationSelect';
import BattleScreen from './components/BattleScreen';

type Screen = 'splash' | 'trainer' | 'deck' | 'location' | 'battle';

const SCREEN_LABELS: Record<Screen, string> = {
  splash: '', trainer: 'Antrenör', deck: 'Deste', location: 'Arena', battle: 'Savaş',
};
const STEPS: Screen[] = ['trainer', 'deck', 'location', 'battle'];

export default function Home() {
  const [screen, setScreen]         = useState<Screen>('splash');
  const [trainer, setTrainer]       = useState<Trainer | null>(null);
  const [deck, setDeck]             = useState<TcgCard[]>([]);
  const [supporter, setSupporter]   = useState<TcgCard | null>(null);
  const [location, setLocation]     = useState<Location | null>(null);

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const [musicPlaying, setMusicPlaying] = useState(false);

  useEffect(() => {
    const a = new Audio('https://archive.org/download/PokemonThemeSong/Pok%C3%A9mon%20Theme%20Song.mp3');
    a.loop = true;
    a.volume = 0.45;
    audioElRef.current = a;
    return () => { a.pause(); a.src = ''; };
  }, []);

  const startMusic = () => {
    const a = audioElRef.current;
    if (!a) return;
    a.play().then(() => setMusicPlaying(true)).catch(() => {});
  };

  const toggleMusic = () => {
    const a = audioElRef.current;
    if (!a) return;
    if (musicPlaying) {
      a.pause();
      setMusicPlaying(false);
    } else {
      a.play().catch(() => {});
      setMusicPlaying(true);
    }
  };

  const rival = trainer ? getRival(trainer.id) : null;

  // ── Browser back-button support ──────────────────────────────────────────
  const screenRef = useRef<Screen>(screen);
  screenRef.current = screen;
  const isBackNav = useRef(false);

  // Push a history entry on every forward navigation (not on back-triggered changes)
  useEffect(() => {
    if (screen !== 'splash' && !isBackNav.current) {
      window.history.pushState({ screen }, '');
    }
    isBackNav.current = false;
  }, [screen]);

  useEffect(() => {
    const onPopState = () => {
      isBackNav.current = true;
      const cur = screenRef.current;
      if      (cur === 'battle')   setScreen('location');
      else if (cur === 'location') setScreen('deck');
      else if (cur === 'deck')     setScreen('trainer');
      else if (cur === 'trainer')  setScreen('splash');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  const reset = () => {
    setTrainer(null); setDeck([]); setSupporter(null); setLocation(null);
    setScreen('trainer');
  };

  return (
    <div className="min-h-screen relative"
      style={{ background: screen === 'battle' ? 'transparent' : 'linear-gradient(135deg,#0a0a1a 0%,#0f0f2e 50%,#0a0a1a 100%)' }}>
      {screen !== 'battle' && <StarField />}
      <AudioPlayer playing={musicPlaying} onToggle={toggleMusic} />

      <SplashScreen
        visible={screen === 'splash'}
        onEnter={() => { startMusic(); setScreen('trainer'); }}
      />

      {screen !== 'splash' && screen !== 'battle' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center gap-2 py-3"
          style={{ background: 'rgba(10,10,26,0.8)', backdropFilter: 'blur(8px)' }}
        >
          {STEPS.filter(s => s !== 'battle').map((step, i) => {
            const stepIdx = STEPS.indexOf(step);
            const curIdx  = STEPS.indexOf(screen);
            const done    = stepIdx < curIdx;
            const active  = step === screen;
            return (
              <div key={step} className="flex items-center gap-2">
                {i > 0 && <div className="w-8 h-px" style={{ background: done ? '#FFD700' : 'rgba(255,255,255,0.15)' }} />}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all"
                  style={{
                    background: active ? 'rgba(255,215,0,0.2)' : done ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.05)',
                    border: active ? '1px solid #FFD700' : done ? '1px solid rgba(255,215,0,0.4)' : '1px solid rgba(255,255,255,0.1)',
                    color: active ? '#FFD700' : done ? 'rgba(255,215,0,0.7)' : 'rgba(255,255,255,0.3)',
                  }}>
                  {done ? '✓' : i + 1} {SCREEN_LABELS[step]}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {screen === 'trainer' && (
          <motion.div key="trainer"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            className="pt-16">
            <TrainerSelect onSelect={t => { setTrainer(t); setScreen('deck'); }} />
          </motion.div>
        )}

        {screen === 'deck' && trainer && (
          <motion.div key="deck"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            className="pt-16">
            <DeckSelect
              trainer={trainer}
              onConfirm={(d, s) => { setDeck(d); setSupporter(s); setScreen('location'); }}
              onBack={() => setScreen('trainer')}
            />
          </motion.div>
        )}

        {screen === 'location' && trainer && (
          <motion.div key="location"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            className="pt-16">
            <LocationSelect
              trainer={trainer}
              onSelect={l => { setLocation(l); setScreen('battle'); }}
              onBack={() => setScreen('deck')}
            />
          </motion.div>
        )}

        {screen === 'battle' && trainer && rival && location && supporter && (
          <motion.div key="battle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <BattleScreen
              playerTrainer={trainer}
              playerDeck={deck}
              playerSupporter={supporter}
              aiTrainer={rival}
              location={location}
              onRematch={reset}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
