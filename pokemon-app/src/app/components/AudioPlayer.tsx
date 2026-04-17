'use client';
import { useEffect, useRef, useState } from 'react';

// Pokémon Theme — "Gotta Catch 'Em All" (English anime opening)
// Key: G major | BPM: ~140
const e=0.21, q=0.43, dq=0.64, h=0.86;
const D4=293.66, E4=329.63, Fs4=369.99, G4=392.00, A4=440.00, B4=493.88;
const C5=523.25, D5=587.33, E5=659.25, G5=783.99, A5=880.00;

const MELODY = [
  // ── Intro riff ───────────────────────────────────────────────
  {f:B4,d:e},{f:A4,d:e},{f:G4,d:e},{f:A4,d:e},
  {f:B4,d:e},{f:D5,d:e},{f:E5,d:dq},{f:0,d:q},

  // ── "I wanna be the very best" ───────────────────────────────
  {f:G4,d:e},{f:G4,d:e},{f:A4,d:e},{f:G4,d:q},{f:0,d:e},
  {f:G4,d:e},{f:Fs4,d:e},{f:E4,d:q},{f:D4,d:dq},{f:0,d:q},

  // ── "Like no one ever was" ───────────────────────────────────
  {f:G4,d:e},{f:G4,d:e},{f:A4,d:e},{f:G4,d:q},{f:0,d:e},
  {f:A4,d:e},{f:C5,d:e},{f:B4,d:q},{f:A4,d:dq},{f:0,d:q},

  // ── "To catch them is my real test" ─────────────────────────
  {f:G4,d:e},{f:G4,d:e},{f:A4,d:e},{f:G4,d:q},{f:0,d:e},
  {f:G4,d:e},{f:Fs4,d:e},{f:E4,d:q},{f:D4,d:dq},{f:0,d:q},

  // ── "To train them is my cause" ─────────────────────────────
  {f:G4,d:e},{f:A4,d:e},{f:C5,d:e},{f:B4,d:q},{f:A4,d:h},{f:0,d:q},

  // ── "I will travel across the land" ─────────────────────────
  {f:G4,d:e},{f:G4,d:e},{f:A4,d:e},{f:G4,d:q},{f:0,d:e},
  {f:G4,d:e},{f:Fs4,d:e},{f:E4,d:q},{f:D4,d:dq},{f:0,d:q},

  // ── "Searching far and wide" ─────────────────────────────────
  {f:G4,d:e},{f:G4,d:e},{f:A4,d:e},{f:G4,d:q},{f:0,d:e},
  {f:A4,d:e},{f:C5,d:e},{f:B4,d:q},{f:A4,d:dq},{f:0,d:q},

  // ── "Each Pokémon to understand" ────────────────────────────
  {f:G4,d:e},{f:G4,d:e},{f:A4,d:e},{f:G4,d:q},{f:0,d:e},
  {f:G4,d:e},{f:Fs4,d:e},{f:E4,d:q},{f:D4,d:dq},{f:0,d:q},

  // ── "The power that's inside" ────────────────────────────────
  {f:G4,d:e},{f:A4,d:e},{f:B4,d:e},{f:C5,d:e},{f:D5,d:h},{f:0,d:q},

  // ══ CHORUS: "Pokémon!" ═══════════════════════════════════════
  {f:E5,d:q},{f:D5,d:q},{f:C5,d:q},{f:D5,d:q},
  {f:E5,d:q},{f:G5,d:q},{f:A5,d:h},{f:0,d:q},

  // ── "Gotta catch 'em all!" ───────────────────────────────────
  {f:B4,d:e},{f:C5,d:e},{f:D5,d:e},{f:E5,d:q},
  {f:D5,d:e},{f:C5,d:e},{f:B4,d:q},{f:A4,d:dq},{f:0,d:q},

  // ── "It's you and me" ────────────────────────────────────────
  {f:C5,d:e},{f:D5,d:q},{f:E5,d:q},{f:A4,d:h},{f:0,d:q},

  // ── "I know it's my destiny" ─────────────────────────────────
  {f:C5,d:e},{f:D5,d:q},{f:E5,d:q},{f:G5,d:q},{f:A5,d:dq},{f:0,d:q},

  // ── "Pokémon!" (reprise) ─────────────────────────────────────
  {f:E5,d:q},{f:D5,d:q},{f:C5,d:q},{f:D5,d:q},
  {f:E5,d:q},{f:G5,d:q},{f:A5,d:h},{f:0,d:dq},

  // ── "A heart so true" ────────────────────────────────────────
  {f:B4,d:e},{f:C5,d:e},{f:D5,d:dq},

  // ── "Our courage will pull us through" ───────────────────────
  {f:A4,d:e},{f:C5,d:e},{f:D5,d:e},{f:E5,d:q},{f:G5,d:q},{f:A5,d:h},{f:0,d:h},
];

// Simple bass line (root notes per phrase)
const BASS = [
  // Intro
  {f:G4/2,d:h},{f:D4/2,d:h},
  // Verse x4
  ...[0,1,2,3].flatMap(() => [
    {f:G4/2,d:h},{f:D4/2,d:h},
    {f:A4/2,d:h},{f:E4/2,d:h},
    {f:G4/2,d:h},{f:D4/2,d:h},
    {f:G4/2,d:h*1.5},
  ]),
  // Chorus x2
  ...[0,1].flatMap(() => [
    {f:E4/2,d:h},{f:C5/2,d:h},
    {f:A4/2,d:h},{f:G4/2,d:h},
    {f:C5/2,d:h},{f:C5/2,d:h},
    {f:E4/2,d:h},{f:G4/2,d:h},
    {f:A4/2,d:h*1.5},
  ]),
];

export default function AudioPlayer() {
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef(false);

  const playMelody = (ctx: AudioContext) => {
    stopRef.current = false;
    let t = ctx.currentTime + 0.05;

    const loop = () => {
      if (stopRef.current) return;

      // ── Lead melody (square wave) ──
      for (const note of MELODY) {
        if (note.f > 0) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(note.f, t);
          gain.gain.setValueAtTime(0.07, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + note.d * 0.88);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(t); osc.stop(t + note.d);

          // Harmony — triangle, one octave down, softer
          const h2 = ctx.createOscillator();
          const g2 = ctx.createGain();
          h2.type = 'triangle';
          h2.frequency.setValueAtTime(note.f / 2, t);
          g2.gain.setValueAtTime(0.035, t);
          g2.gain.exponentialRampToValueAtTime(0.001, t + note.d * 0.8);
          h2.connect(g2); g2.connect(ctx.destination);
          h2.start(t); h2.stop(t + note.d);
        }
        t += note.d;
      }

      const totalDur = MELODY.reduce((s, n) => s + n.d, 0);
      setTimeout(() => { if (!stopRef.current) loop(); }, totalDur * 1000 - 100);
    };

    loop();

    // ── Bass line (sine wave) ──
    let bt = ctx.currentTime + 0.05;
    const bassLoop = () => {
      if (stopRef.current) return;
      for (const note of BASS) {
        if (note.f > 0) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(note.f, bt);
          gain.gain.setValueAtTime(0.12, bt);
          gain.gain.exponentialRampToValueAtTime(0.001, bt + note.d * 0.9);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(bt); osc.stop(bt + note.d);
        }
        bt += note.d;
      }
      const totalDur = BASS.reduce((s, n) => s + n.d, 0);
      setTimeout(() => { if (!stopRef.current) bassLoop(); }, totalDur * 1000 - 100);
    };
    bassLoop();
  };

  const toggle = async () => {
    if (!started) {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      setStarted(true); setPlaying(true);
      playMelody(ctx);
    } else if (playing) {
      stopRef.current = true;
      setPlaying(false);
    } else {
      setPlaying(true);
      if (ctxRef.current) playMelody(ctxRef.current);
    }
  };

  useEffect(() => () => { stopRef.current = true; }, []);

  return (
    <button onClick={toggle} title={playing ? 'Müziği durdur' : 'Müziği çal'}
      className="fixed top-4 right-4 z-50 w-11 h-11 rounded-full glass flex items-center justify-center text-xl
        hover:scale-110 transition-transform duration-200 cursor-pointer"
      style={{ border: '1px solid rgba(255,215,0,0.3)' }}>
      {playing ? '🔊' : '🔇'}
    </button>
  );
}
