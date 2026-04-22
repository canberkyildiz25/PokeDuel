// Svelte spring physics ported to TypeScript

type SpringValues = Record<string, number>;

interface SpringSettings {
  stiffness: number;
  damping: number;
}

export class Spring {
  private val: SpringValues;
  private vel: SpringValues;
  private target: SpringValues;
  stiffness: number;
  damping: number;

  constructor(initial: SpringValues, settings: SpringSettings) {
    this.val = { ...initial };
    this.vel = Object.fromEntries(Object.keys(initial).map(k => [k, 0]));
    this.target = { ...initial };
    this.stiffness = settings.stiffness;
    this.damping = settings.damping;
  }

  tick(): boolean {
    let moving = false;
    for (const k of Object.keys(this.val)) {
      const force = (this.target[k] - this.val[k]) * this.stiffness;
      this.vel[k] = (this.vel[k] + force) * (1 - this.damping);
      this.val[k] += this.vel[k];
      if (Math.abs(this.vel[k]) > 0.001 || Math.abs(this.target[k] - this.val[k]) > 0.001) {
        moving = true;
      }
    }
    return moving;
  }

  set(target: Partial<SpringValues>, cfg?: Partial<SpringSettings>) {
    Object.assign(this.target, target);
    if (cfg?.stiffness !== undefined) this.stiffness = cfg.stiffness;
    if (cfg?.damping !== undefined) this.damping = cfg.damping;
  }

  setHard(target: Partial<SpringValues>) {
    Object.assign(this.target, target);
    Object.assign(this.val, target);
    for (const k of Object.keys(this.vel)) this.vel[k] = 0;
  }

  get(): SpringValues { return this.val; }
}

export const clamp = (v: number, min = 0, max = 100) => Math.min(Math.max(v, min), max);
export const round = (v: number, p = 3) => parseFloat(v.toFixed(p));
export const adjust = (v: number, fMin: number, fMax: number, tMin: number, tMax: number) =>
  tMin + (tMax - tMin) * ((v - fMin) / (fMax - fMin));
