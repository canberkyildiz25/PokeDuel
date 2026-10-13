/* What an attack looks like. Each kind of Pokémon has its own: lightning that
   forks and flickers, a ball of fire and the flames it leaves, a jet of
   water, leaves on the wind, and so on. All of it is drawn here, on a canvas
   laid over the mat, out of lines and circles: there is no picture file and
   nothing borrowed. An effect leaves the attacker at once and lands on its
   target about a third of a second later, which is when the page shows the
   damage. */

import type { Kind } from './duel/types.ts';

interface Point {
  x: number;
  y: number;
}
interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** When it appears and how long it lasts, in milliseconds from the start of the effect. */
  born: number;
  life: number;
  size: number;
  spin: number;
  tone: number;
}
/** One effect in flight: called every frame with the time since it began; false when it is over. */
type Show = (ctx: CanvasRenderingContext2D, t: number) => boolean;

/** When the effect reaches its target. The page times the damage it shows to this. */
export const IMPACT = 320;

const TAU = Math.PI * 2;
const rand = (from: number, to: number) => from + Math.random() * (to - from);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const along = (a: Point, b: Point, t: number): Point => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t) });
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/* The colours of each kind, as the names of the stylesheet's own tokens: a
   bright core, the kind's colour, and something darker for its edges. */
const TONES: Record<Kind, [string, string, string]> = {
  Fire: ['--yellow', '--k-fire', '--red'],
  Water: ['--paper', '--k-water', '--k-darkness'],
  Grass: ['--k-lightning', '--k-grass', '--k-darkness'],
  Lightning: ['--paper', '--k-lightning', '--yellow-deep'],
  Psychic: ['--paper', '--k-psychic', '--k-darkness'],
  Fighting: ['--yellow', '--k-fighting', '--red-deep'],
  Darkness: ['--k-psychic', '--k-darkness', '--shade'],
  Metal: ['--paper', '--k-metal', '--k-water'],
  Dragon: ['--yellow', '--k-dragon', '--k-psychic'],
  Colorless: ['--paper', '--k-colorless', '--k-metal'],
};

function burst(at: Point, count: number, speed: [number, number], born: number, life: [number, number], size: [number, number], cone?: { angle: number; spread: number }): Bit[] {
  return Array.from({ length: count }, () => {
    const angle = cone ? cone.angle + rand(-cone.spread, cone.spread) : rand(0, TAU);
    const pace = rand(speed[0], speed[1]);
    return { x: at.x, y: at.y, vx: Math.cos(angle) * pace, vy: Math.sin(angle) * pace, born: born + rand(0, 60), life: rand(life[0], life[1]), size: rand(size[0], size[1]), spin: rand(-6, 6), tone: Math.random() };
  });
}
/** Where a bit is and how much of its life is left, at a time; null before it appears and after it is gone. */
function state(bit: Bit, t: number, gravity = 0) {
  const age = t - bit.born;
  if (age < 0 || age > bit.life) return null;
  const s = age / 1000;
  return { x: bit.x + bit.vx * s, y: bit.y + bit.vy * s + 0.5 * gravity * s * s, left: 1 - age / bit.life, age };
}
function dot(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, colour: string, alpha: number) {
  if (radius <= 0 || alpha <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
}
function ring(ctx: CanvasRenderingContext2D, at: Point, radius: number, colour: string, alpha: number, width: number) {
  if (radius <= 0 || alpha <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(at.x, at.y, radius, 0, TAU);
  ctx.stroke();
}
/** A forked line between two points, different every time it is asked for. */
function bolt(from: Point, to: Point, rough: number): Point[] {
  let points = [from, to];
  for (let pass = 0; pass < 4; pass += 1) {
    const next: Point[] = [];
    for (let at = 0; at < points.length - 1; at += 1) {
      const a = points[at];
      const b = points[at + 1];
      const span = Math.hypot(b.x - a.x, b.y - a.y);
      next.push(a, { x: (a.x + b.x) / 2 + rand(-1, 1) * span * rough, y: (a.y + b.y) / 2 + rand(-1, 1) * span * rough });
    }
    next.push(points[points.length - 1]);
    points = next;
  }
  return points;
}
function path(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.beginPath();
  points.forEach((point, at) => (at ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)));
}

/** Builds the effect for one attack. `u` is the size of a card's width in pixels, so that everything scales with the table. */
function make(kind: Kind, from: Point, to: Point, u: number, hard: boolean, tones: [string, string, string]): Show {
  const [core, body, edge] = tones;
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const side: Point = { x: -Math.sin(angle), y: Math.cos(angle) };
  const reach = Math.hypot(to.x - from.x, to.y - from.y);
  const big = hard ? 1.35 : 1;
  const travel = (t: number) => clamp01(t / IMPACT);

  switch (kind) {
    case 'Lightning': {
      let forks: Point[][] = [];
      let drawnAt = -100;
      const sparks = burst(to, 18 * big, [u * 1.5, u * 5], IMPACT, [240, 480], [u * 0.02, u * 0.05]);
      return (ctx, t) => {
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineJoin = 'round';
        if (t < IMPACT + 180) {
          // the bolt is drawn again every few frames, which is what makes it flicker
          if (t - drawnAt > 55) {
            drawnAt = t;
            const tip = t < 90 ? along(from, to, t / 90) : to;
            forks = [bolt(from, tip, 0.16), bolt(from, tip, 0.22), bolt(along(from, tip, 0.45), { x: tip.x + side.x * u * 0.9, y: tip.y + side.y * u * 0.9 }, 0.2)];
          }
          const fade = t < IMPACT ? 1 : 1 - (t - IMPACT) / 180;
          forks.forEach((points, index) => {
            path(ctx, points);
            ctx.globalAlpha = fade * (index === 2 ? 0.55 : 0.9);
            ctx.strokeStyle = body;
            ctx.shadowColor = body;
            ctx.shadowBlur = u * 0.22;
            ctx.lineWidth = u * (index === 0 ? 0.075 : 0.045) * big;
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = core;
            ctx.lineWidth = u * 0.022;
            ctx.stroke();
          });
        }
        for (const spark of sparks) {
          const now = state(spark, t);
          if (!now) continue;
          ctx.globalAlpha = now.left;
          ctx.strokeStyle = spark.tone > 0.5 ? core : body;
          ctx.lineWidth = spark.size;
          ctx.beginPath();
          ctx.moveTo(now.x, now.y);
          ctx.lineTo(now.x - spark.vx * 0.035, now.y - spark.vy * 0.035);
          ctx.stroke();
        }
        return t < IMPACT + 520;
      };
    }

    case 'Fire': {
      const trail: Bit[] = [];
      const flames = burst(to, 46 * big, [u * 0.4, u * 2.2], IMPACT, [380, 760], [u * 0.1, u * 0.3], { angle: -Math.PI / 2, spread: 1.25 });
      const embers = burst(to, 16, [u * 1, u * 3.5], IMPACT, [400, 800], [u * 0.015, u * 0.03]);
      return (ctx, t) => {
        ctx.globalCompositeOperation = 'lighter';
        if (t < IMPACT) {
          const head = along(from, to, easeOut(travel(t)) * 0.999);
          for (let n = 0; n < 3; n += 1) trail.push({ x: head.x + rand(-1, 1) * u * 0.08, y: head.y + rand(-1, 1) * u * 0.08, vx: rand(-1, 1) * u * 0.3, vy: -rand(0, u * 0.9), born: t, life: rand(180, 320), size: rand(u * 0.1, u * 0.22) * big, spin: 0, tone: Math.random() });
          dot(ctx, head.x, head.y, u * 0.2 * big, core, 0.9);
          dot(ctx, head.x, head.y, u * 0.32 * big, body, 0.5);
        }
        for (const bit of [...trail, ...flames]) {
          const now = state(bit, t, -u * 2.5);
          if (!now) continue;
          const colour = now.left > 0.66 ? core : now.left > 0.3 ? body : edge;
          dot(ctx, now.x + Math.sin(now.age / 60 + bit.tone * 9) * u * 0.05, now.y, bit.size * (0.35 + now.left * 0.65), colour, now.left * 0.55);
        }
        for (const ember of embers) {
          const now = state(ember, t, u * 3);
          if (now) dot(ctx, now.x, now.y, ember.size, core, now.left);
        }
        return t < IMPACT + 820;
      };
    }

    case 'Water': {
      const bend = { x: (from.x + to.x) / 2 + side.x * reach * 0.18, y: (from.y + to.y) / 2 + side.y * reach * 0.18 };
      const curve = (p: number): Point => ({ x: (1 - p) ** 2 * from.x + 2 * (1 - p) * p * bend.x + p * p * to.x, y: (1 - p) ** 2 * from.y + 2 * (1 - p) * p * bend.y + p * p * to.y });
      const jet = Array.from({ length: 34 * big }, (_, index) => ({ delay: index * 7, wobble: rand(-1, 1), size: rand(u * 0.035, u * 0.085) }));
      const splash = burst(to, 26 * big, [u * 1, u * 3.6], IMPACT, [380, 700], [u * 0.025, u * 0.07], { angle: -Math.PI / 2, spread: 1.9 });
      return (ctx, t) => {
        ctx.globalCompositeOperation = 'source-over';
        for (const drop of jet) {
          const p = (t - drop.delay) / (IMPACT - 40);
          if (p < 0 || p > 1) continue;
          const at = curve(p);
          const x = at.x + side.x * drop.wobble * u * 0.1;
          const y = at.y + side.y * drop.wobble * u * 0.1;
          dot(ctx, x, y, drop.size * 1.5, body, 0.85);
          dot(ctx, x - drop.size * 0.4, y - drop.size * 0.4, drop.size * 0.55, core, 0.9);
        }
        if (t > IMPACT) {
          const p = clamp01((t - IMPACT) / 520);
          ring(ctx, to, u * (0.15 + easeOut(p) * 0.75) * big, body, (1 - p) * 0.9, u * 0.05);
          ring(ctx, to, u * (0.05 + easeOut(p) * 0.45) * big, core, (1 - p) * 0.8, u * 0.025);
        }
        for (const drop of splash) {
          const now = state(drop, t, u * 9);
          if (!now) continue;
          dot(ctx, now.x, now.y, drop.size, body, now.left);
          dot(ctx, now.x - drop.size * 0.3, now.y - drop.size * 0.3, drop.size * 0.4, core, now.left);
        }
        return t < IMPACT + 720;
      };
    }

    case 'Grass': {
      const leaves = Array.from({ length: 14 * big }, (_, index) => ({ delay: index * 16, swing: rand(0.6, 1.3) * (index % 2 ? 1 : -1), size: rand(u * 0.1, u * 0.17), spin: rand(4, 9), tone: Math.random() }));
      const fall = burst(to, 12, [u * 0.5, u * 1.8], IMPACT, [520, 900], [u * 0.08, u * 0.13]);
      const leaf = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, turn: number, alpha: number, light: boolean) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(turn);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = light ? core : body;
        ctx.beginPath();
        ctx.moveTo(-size, 0);
        ctx.quadraticCurveTo(0, -size * 0.7, size, 0);
        ctx.quadraticCurveTo(0, size * 0.7, -size, 0);
        ctx.fill();
        ctx.strokeStyle = edge;
        ctx.lineWidth = Math.max(1, size * 0.08);
        ctx.beginPath();
        ctx.moveTo(-size, 0);
        ctx.lineTo(size, 0);
        ctx.stroke();
        ctx.restore();
      };
      return (ctx, t) => {
        ctx.globalCompositeOperation = 'source-over';
        for (const one of leaves) {
          const p = (t - one.delay) / (IMPACT - 30);
          if (p < 0 || p > 1) continue;
          const at = along(from, to, easeOut(p));
          const off = Math.sin(p * Math.PI) * one.swing * reach * 0.16;
          leaf(ctx, at.x + side.x * off, at.y + side.y * off, one.size, p * one.spin, 1, one.tone > 0.7);
        }
        if (t > IMPACT) {
          const p = clamp01((t - IMPACT) / 360);
          ring(ctx, to, u * easeOut(p) * 0.7 * big, body, (1 - p) * 0.7, u * 0.04);
        }
        for (const one of fall) {
          const now = state(one, t, u * 2.2);
          if (now) leaf(ctx, now.x + Math.sin(now.age / 110 + one.tone * 6) * u * 0.12, now.y, one.size, now.age / 160 + one.tone * 6, now.left, one.tone > 0.7);
        }
        return t < IMPACT + 920;
      };
    }

    case 'Psychic': {
      return (ctx, t) => {
        ctx.globalCompositeOperation = 'lighter';
        // rings that leave one after another and grow as they go
        for (let n = 0; n < 5; n += 1) {
          const p = (t - n * 55) / (IMPACT + 40);
          if (p < 0 || p > 1) continue;
          const at = along(from, to, p);
          ctx.save();
          ctx.translate(at.x, at.y);
          ctx.rotate(angle);
          ctx.globalAlpha = Math.sin(p * Math.PI) * 0.9;
          ctx.strokeStyle = n % 2 ? core : body;
          ctx.lineWidth = u * 0.035;
          ctx.beginPath();
          ctx.ellipse(0, 0, u * (0.06 + p * 0.14), u * (0.2 + p * 0.5) * big, 0, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }
        if (t > IMPACT - 40) {
          const p = clamp01((t - IMPACT + 40) / 620);
          for (let arm = 0; arm < 3; arm += 1) {
            const start = (t / 130) * (arm % 2 ? -1 : 1) + (arm * TAU) / 3;
            ctx.globalAlpha = (1 - p) * 0.9;
            ctx.strokeStyle = arm === 1 ? core : body;
            ctx.lineWidth = u * 0.04;
            ctx.beginPath();
            ctx.arc(to.x, to.y, u * (0.25 + arm * 0.14 + p * 0.2) * big, start, start + 1.9);
            ctx.stroke();
          }
          dot(ctx, to.x, to.y, u * 0.3 * (1 - p) * big, body, (1 - p) * 0.5);
        }
        return t < IMPACT + 600;
      };
    }

    case 'Fighting': {
      const chunks = burst(to, 14 * big, [u * 1.4, u * 4.4], IMPACT, [360, 640], [u * 0.04, u * 0.1]);
      return (ctx, t) => {
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineCap = 'round';
        // three fast strokes, one after another
        for (let n = 0; n < 3; n += 1) {
          const p = (t - 120 - n * 45) / 150;
          if (p < 0 || p > 1) continue;
          const off = (n - 1) * u * 0.22;
          const a = along(from, to, clamp01(p - 0.35));
          const b = along(from, to, p);
          ctx.globalAlpha = 0.9;
          ctx.strokeStyle = n === 1 ? core : body;
          ctx.lineWidth = u * 0.07 * big;
          ctx.beginPath();
          ctx.moveTo(a.x + side.x * off, a.y + side.y * off);
          ctx.lineTo(b.x + side.x * off, b.y + side.y * off);
          ctx.stroke();
        }
        if (t > IMPACT) {
          const p = clamp01((t - IMPACT) / 300);
          const spikes = 9;
          ctx.globalAlpha = 1 - p;
          ctx.fillStyle = core;
          ctx.strokeStyle = edge;
          ctx.lineWidth = u * 0.03;
          ctx.beginPath();
          for (let n = 0; n < spikes * 2; n += 1) {
            const radius = u * (n % 2 ? 0.2 : 0.62) * (0.4 + easeOut(p) * 0.8) * big;
            const turn = (n / (spikes * 2)) * TAU + 0.2;
            ctx.lineTo(to.x + Math.cos(turn) * radius, to.y + Math.sin(turn) * radius);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        for (const chunk of chunks) {
          const now = state(chunk, t, u * 10);
          if (!now) continue;
          ctx.save();
          ctx.translate(now.x, now.y);
          ctx.rotate((now.age / 100) * chunk.spin * 0.3);
          ctx.globalAlpha = now.left;
          ctx.fillStyle = chunk.tone > 0.5 ? body : edge;
          ctx.fillRect(-chunk.size / 2, -chunk.size / 2, chunk.size, chunk.size * 0.8);
          ctx.restore();
        }
        return t < IMPACT + 660;
      };
    }

    case 'Darkness': {
      const smoke = burst(to, 16, [u * 0.2, u * 0.9], IMPACT - 40, [500, 900], [u * 0.16, u * 0.34]);
      return (ctx, t) => {
        ctx.globalCompositeOperation = 'source-over';
        for (const puff of smoke) {
          const now = state(puff, t, -u * 0.6);
          if (now) dot(ctx, now.x, now.y, puff.size * (1.3 - now.left * 0.5), edge, now.left * 0.42);
        }
        // three claw marks drawn across the target, then left to fade
        ctx.lineCap = 'round';
        for (let n = 0; n < 3; n += 1) {
          const p = clamp01((t - (IMPACT - 110) - n * 35) / 150);
          if (p <= 0) continue;
          const fade = t > IMPACT + 140 ? clamp01(1 - (t - IMPACT - 140) / 380) : 1;
          const off = (n - 1) * u * 0.26;
          const a = { x: to.x - u * 0.55 * big + off, y: to.y - u * 0.7 * big };
          const b = { x: to.x + u * 0.35 * big + off, y: to.y + u * 0.7 * big };
          const tip = along(a, b, easeOut(p));
          for (const [colour, width] of [[edge, u * 0.12], [body, u * 0.07], [core, u * 0.02]] as [string, number][]) {
            ctx.globalAlpha = fade;
            ctx.strokeStyle = colour;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.quadraticCurveTo((a.x + tip.x) / 2 + u * 0.12, (a.y + tip.y) / 2, tip.x, tip.y);
            ctx.stroke();
          }
        }
        return t < IMPACT + 640;
      };
    }

    case 'Metal': {
      const sparks = burst(to, 30 * big, [u * 2, u * 6], IMPACT, [260, 560], [u * 0.018, u * 0.04], { angle: angle + Math.PI, spread: 1.5 });
      return (ctx, t) => {
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        const p = travel(t - 120) * 1.5;
        if (t > 120 && p < 1.3) {
          const a = along(from, to, clamp01(p - 0.4));
          const b = along(from, to, clamp01(p));
          ctx.globalAlpha = 0.95;
          ctx.strokeStyle = body;
          ctx.lineWidth = u * 0.12 * big;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.strokeStyle = core;
          ctx.lineWidth = u * 0.04;
          ctx.stroke();
        }
        if (t > IMPACT) {
          // a four-pointed glint where it lands
          const q = clamp01((t - IMPACT) / 340);
          const size = u * (0.3 + easeOut(q) * 0.7) * big;
          ctx.globalAlpha = 1 - q;
          ctx.fillStyle = core;
          ctx.beginPath();
          for (let n = 0; n < 8; n += 1) {
            const radius = n % 2 ? size * 0.12 : size;
            const turn = (n / 8) * TAU;
            ctx.lineTo(to.x + Math.cos(turn) * radius, to.y + Math.sin(turn) * radius);
          }
          ctx.closePath();
          ctx.fill();
        }
        for (const spark of sparks) {
          const now = state(spark, t, u * 8);
          if (!now) continue;
          ctx.globalAlpha = now.left;
          ctx.strokeStyle = spark.tone > 0.4 ? core : edge;
          ctx.lineWidth = spark.size;
          ctx.beginPath();
          ctx.moveTo(now.x, now.y);
          ctx.lineTo(now.x - spark.vx * 0.03, now.y - spark.vy * 0.03);
          ctx.stroke();
        }
        return t < IMPACT + 580;
      };
    }

    case 'Dragon': {
      const rings = [0, 90, 180];
      return (ctx, t) => {
        ctx.globalCompositeOperation = 'lighter';
        // two streams wound round each other on their way across
        for (const [strand, colour] of [[0, body], [Math.PI, edge]] as [number, string][]) {
          for (let n = 0; n < 26; n += 1) {
            const p = travel(t) - n * 0.018;
            if (p <= 0 || travel(t) >= 1.25) continue;
            const at = along(from, to, clamp01(p));
            const wind = Math.sin(p * 11 + strand) * u * 0.3 * (1 - p * 0.6);
            dot(ctx, at.x + side.x * wind, at.y + side.y * wind, u * 0.09 * (1 - n / 30) * big, n < 3 ? core : colour, (1 - n / 26) * 0.8);
          }
        }
        for (const delay of rings) {
          const p = clamp01((t - IMPACT - delay) / 420);
          if (p > 0) ring(ctx, to, u * easeOut(p) * (0.9 + delay / 300) * big, delay === 90 ? edge : body, (1 - p) * 0.9, u * 0.05);
        }
        return t < IMPACT + 620;
      };
    }

    default: {
      const dust = burst(to, 14, [u * 0.6, u * 2], IMPACT, [360, 640], [u * 0.08, u * 0.18]);
      return (ctx, t) => {
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineCap = 'round';
        const p = travel(t - 100) * 1.4;
        if (t > 100 && p < 1.2) {
          const a = along(from, to, clamp01(p - 0.3));
          const b = along(from, to, clamp01(p));
          ctx.globalAlpha = 0.8;
          ctx.strokeStyle = core;
          ctx.lineWidth = u * 0.1 * big;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        if (t > IMPACT) {
          const q = clamp01((t - IMPACT) / 400);
          ring(ctx, to, u * easeOut(q) * 0.85 * big, core, (1 - q) * 0.9, u * 0.07 * (1 - q) + 1);
          ring(ctx, to, u * easeOut(q) * 0.5 * big, body, (1 - q) * 0.7, u * 0.03);
        }
        for (const puff of dust) {
          const now = state(puff, t);
          if (now) dot(ctx, now.x, now.y, puff.size * (1.4 - now.left * 0.6), body, now.left * 0.5);
        }
        return t < IMPACT + 660;
      };
    }
  }
}

/* One loop for each canvas, running only while something is in flight. */
const RUNNING = new WeakMap<HTMLCanvasElement, { shows: { show: Show; began: number }[]; frame: number }>();

function fit(canvas: HTMLCanvasElement) {
  const box = canvas.getBoundingClientRect();
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.round(box.width * ratio);
  const height = Math.round(box.height * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { box, ratio };
}

/** Plays the effect of an attack of one kind, from the middle of one element to the middle of another. Both are given as they lie on the page. */
export function playFx(canvas: HTMLCanvasElement, kind: Kind, attacker: DOMRect, target: DOMRect, hard = false) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { box } = fit(canvas);
  const style = getComputedStyle(canvas);
  const tones = TONES[kind].map((name) => style.getPropertyValue(name).trim() || 'white') as [string, string, string];
  const middle = (rect: DOMRect): Point => ({ x: rect.left + rect.width / 2 - box.left, y: rect.top + rect.height / 2 - box.top });
  const show = make(kind, middle(attacker), middle(target), Math.max(40, target.width), hard, tones);

  let running = RUNNING.get(canvas);
  if (!running) {
    running = { shows: [], frame: 0 };
    RUNNING.set(canvas, running);
  }
  running.shows.push({ show, began: performance.now() });
  const state_ = running;
  const tick = (now: number) => {
    const { ratio } = fit(canvas);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    state_.shows = state_.shows.filter(({ show: one, began }) => {
      ctx.save();
      const alive = one(ctx, now - began);
      ctx.restore();
      return alive;
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (state_.shows.length) state_.frame = requestAnimationFrame(tick);
    else {
      state_.frame = 0;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
  if (!state_.frame) state_.frame = requestAnimationFrame(tick);
}
