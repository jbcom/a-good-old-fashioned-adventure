/**
 * Deterministic RNG facade (mulberry32). The sim NEVER calls Math.random —
 * every roll goes through a stream created from the world's RngState so
 * playthroughs replay exactly.
 */
/** Deterministic random generator with next(), int(), and chance() methods. */
export interface Rng {
  /** [0, 1) */
  next(): number;
  /** integer in [min, max] inclusive */
  int(min: number, max: number): number;
  /** true with probability p */
  chance(p: number): boolean;
}

/** Create a deterministic RNG from a seed. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
  };
}
