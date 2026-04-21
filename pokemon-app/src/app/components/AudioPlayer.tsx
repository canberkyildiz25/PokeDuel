'use client';
import { useEffect, useRef, useState } from 'react';

const TRACK = 'https://archive.org/download/PokemonThemeSong/Pok%C3%A9mon%20Theme%20Song.mp3';

export default function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);

  // Initialize audio element once
  useEffect(() => {
    const a = new Audio();
    a.loop = true;
    a.volume = 0.45;
    audioRef.current = a;
    return () => { a.pause(); a.src = ''; };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;

    if (!started) {
      a.src = TRACK;
      a.play().then(() => { setStarted(true); setPlaying(true); }).catch(() => {});
      return;
    }

    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().catch(() => {});
      setPlaying(true);
    }
  };

  return (
    <button
      onClick={toggle}
      title={playing ? 'Müziği durdur' : 'Müziği çal'}
      className="fixed top-4 right-4 z-50 w-11 h-11 rounded-full flex items-center justify-center text-xl
        hover:scale-110 transition-transform duration-200 cursor-pointer"
      style={{
        background: 'rgba(0,0,0,0.55)',
        border: '1px solid rgba(255,215,0,0.3)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {playing ? '🎵' : '🔇'}
    </button>
  );
}
