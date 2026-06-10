/**
 * Fixed-timestep sim orchestration. The app loop accumulates real time
 * and calls step(world) at SIM_DT — determinism for the playthrough test
 * comes from fixed steps + seeded RNG, never wall-clock.
 */
import type { World } from "koota";
import { createRng, type Rng } from "./rng";
import { updateCamera } from "./systems/camera";
import { moveEntities } from "./systems/movement";
import { Clock, CombatTimers, HitFlash, RngState } from "./traits";

export const SIM_DT = 1 / 60;

const rngStreams = new WeakMap<World, Rng>();

export function rngFor(world: World): Rng {
  let rng = rngStreams.get(world);
  if (!rng) {
    rng = createRng(world.get(RngState)?.seed ?? 1);
    rngStreams.set(world, rng);
  }
  return rng;
}

function tickTimers(world: World, dt: number): void {
  for (const entity of world.query(CombatTimers)) {
    const t = entity.get(CombatTimers);
    if (!t) continue;
    entity.set(CombatTimers, {
      attack: Math.max(0, t.attack - dt),
      dash: Math.max(0, t.dash - dt),
      dashCooldown: Math.max(0, t.dashCooldown - dt),
      iframes: Math.max(0, t.iframes - dt),
    });
  }
  for (const entity of world.query(HitFlash)) {
    const f = entity.get(HitFlash);
    if (f && f.left > 0) entity.set(HitFlash, { left: Math.max(0, f.left - dt) });
  }
}

export function step(world: World, dt: number = SIM_DT): void {
  const clock = world.get(Clock);
  if (clock) world.set(Clock, { t: clock.t + dt, dt });
  tickTimers(world, dt);
  moveEntities(world, dt);
  updateCamera(world, rngFor(world));
}
