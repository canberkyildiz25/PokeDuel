'use client';

/* The sounds of the table, made in the browser as they are needed: a card
   sliding, a bead set down, a coin, a hit. Nothing is downloaded and nothing
   plays until the visitor has pressed something, which is also when a browser
   first allows sound at all. */

import { useStore } from './store';

let audio: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === 'undefined' || !useStore.getState().sound) return null;
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
    return audio;
  } catch {
    return null;
  }
}

/** A note that starts at one pitch, may slide to another, and dies away. */
function note(from: number, to: number, seconds: number, loud: number, shape: OscillatorType = 'sine', wait = 0) {
  const ctx = context();
  if (!ctx) return;
  const at = ctx.currentTime + wait;
  const voice = ctx.createOscillator();
  const level = ctx.createGain();
  voice.type = shape;
  voice.frequency.setValueAtTime(from, at);
  if (to !== from) voice.frequency.exponentialRampToValueAtTime(to, at + seconds);
  level.gain.setValueAtTime(0.0001, at);
  level.gain.exponentialRampToValueAtTime(loud, at + 0.008);
  level.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  voice.connect(level).connect(ctx.destination);
  voice.start(at);
  voice.stop(at + seconds + 0.02);
}

/** A breath of noise through a filter: paper, cloth, a thump. */
function hiss(seconds: number, loud: number, pitch: number, kind: BiquadFilterType = 'bandpass', wait = 0) {
  const ctx = context();
  if (!ctx) return;
  const at = ctx.currentTime + wait;
  const frames = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const level = ctx.createGain();
  source.buffer = buffer;
  filter.type = kind;
  filter.frequency.value = pitch;
  level.gain.value = loud;
  source.connect(filter).connect(level).connect(ctx.destination);
  source.start(at);
}

export const sound = {
  /** A card slid across the cloth. */
  card: () => hiss(0.16, 0.16, 2600),
  /** A glass bead set down on a card. */
  token: () => {
    note(2100, 1700, 0.07, 0.05, 'triangle');
    note(2600, 2200, 0.05, 0.03, 'triangle', 0.045);
  },
  /** The coin, struck and ringing. */
  coin: () => {
    note(3100, 3050, 0.5, 0.045, 'sine');
    note(4650, 4600, 0.32, 0.02, 'sine');
  },
  hit: () => {
    note(150, 48, 0.2, 0.2, 'sine');
    hiss(0.09, 0.12, 900, 'lowpass');
  },
  /** A hit that found the weak side. */
  hard: () => {
    note(190, 40, 0.28, 0.26, 'sine');
    hiss(0.14, 0.18, 1400, 'lowpass');
  },
  heal: () => {
    note(520, 780, 0.22, 0.05, 'sine');
    note(780, 1040, 0.22, 0.04, 'sine', 0.09);
  },
  /** A burn, a poison, a spell of sleep. */
  ail: () => note(330, 240, 0.3, 0.05, 'sawtooth'),
  /** A card taken off the table. */
  out: () => {
    note(260, 110, 0.36, 0.09, 'triangle');
    hiss(0.2, 0.1, 1800, 'bandpass', 0.05);
  },
  prize: () => {
    note(660, 660, 0.12, 0.06, 'triangle');
    note(990, 990, 0.2, 0.06, 'triangle', 0.11);
  },
  win: () => [523, 659, 784, 1047].forEach((pitch, index) => note(pitch, pitch, 0.28, 0.07, 'triangle', index * 0.12)),
  lose: () => [392, 330, 262].forEach((pitch, index) => note(pitch, pitch, 0.34, 0.06, 'triangle', index * 0.16)),
  /** An attack leaving its Pokémon: each kind has its own sound, as it has its own look. The thud of it landing comes with the damage. */
  strike: (kind: string) => {
    if (kind === 'Lightning') {
      note(2400, 260, 0.16, 0.05, 'square');
      note(1700, 180, 0.2, 0.04, 'sawtooth', 0.07);
      hiss(0.3, 0.1, 5200, 'highpass');
    } else if (kind === 'Fire') {
      hiss(0.5, 0.2, 700, 'lowpass');
      note(180, 90, 0.4, 0.06, 'sawtooth', 0.05);
    } else if (kind === 'Water') {
      hiss(0.32, 0.16, 1500, 'bandpass');
      hiss(0.3, 0.14, 2600, 'bandpass', 0.3);
    } else if (kind === 'Grass') {
      hiss(0.34, 0.1, 4200, 'highpass');
      note(880, 1320, 0.16, 0.03, 'sine', 0.1);
    } else if (kind === 'Psychic') {
      note(420, 840, 0.34, 0.05, 'sine');
      note(630, 1260, 0.34, 0.035, 'sine', 0.06);
    } else if (kind === 'Darkness') {
      note(110, 70, 0.4, 0.09, 'sawtooth');
      hiss(0.16, 0.12, 2200, 'bandpass', 0.24);
    } else if (kind === 'Metal') {
      note(1480, 1460, 0.4, 0.05, 'triangle', 0.3);
      note(2220, 2200, 0.3, 0.03, 'triangle', 0.3);
      hiss(0.12, 0.1, 3600, 'highpass', 0.3);
    } else if (kind === 'Dragon') {
      note(160, 320, 0.36, 0.08, 'sawtooth');
      note(240, 480, 0.36, 0.05, 'sawtooth', 0.04);
    } else {
      hiss(0.2, 0.14, 1200, 'lowpass');
    }
  },
  /** A control pressed. */
  press: () => hiss(0.04, 0.08, 3200, 'highpass'),
  /** The rubber stamp on a finished slip. */
  stamp: () => {
    note(120, 60, 0.12, 0.2, 'sine');
    hiss(0.06, 0.14, 500, 'lowpass');
  },
};
