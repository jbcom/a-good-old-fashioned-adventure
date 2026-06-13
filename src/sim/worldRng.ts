/** Per-world deterministic RNG stream, seeded from RngState. */
import type { World } from "koota";
import { createRng, type Rng } from "./rng";
import { RngState } from "./traits";

const streams = new WeakMap<World, Rng>();

/** Get (or lazily create) the deterministic RNG stream for a world. */
export function rngFor(world: World): Rng {
  let rng = streams.get(world);
  if (!rng) {
    rng = createRng(world.get(RngState)?.seed ?? 1);
    streams.set(world, rng);
  }
  return rng;
}
