// Seeded randomness (mulberry32). The cursor lives in state so runs are reproducible
// and survive save/load. The UI never calls Math.random.
import type { State } from './types.js';

export function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Next float in [0, 1) from the state's rng cursor. */
export function rand(s: State): number {
  let a = (s.rng + 0x6d2b79f5) | 0;
  s.rng = a;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function chance(s: State, p: number): boolean {
  return rand(s) < p;
}

export function pick<T>(s: State, items: readonly T[]): T {
  return items[Math.floor(rand(s) * items.length) % items.length];
}

export function between(s: State, lo: number, hi: number): number {
  return lo + rand(s) * (hi - lo);
}
