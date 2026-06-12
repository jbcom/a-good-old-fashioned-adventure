/**
 * Fixed-timestep sim orchestration. The app loop accumulates real time
 * and calls step(world) at SIM_DT — determinism for the playthrough test
 * comes from fixed steps + seeded RNG, never wall-clock.
 */
import type { World } from "koota";
import { drainEvents } from "./events";
import { reduceEvent } from "./quests";
import { updateCamera } from "./systems/camera";
import { combatStep } from "./systems/combat";
import { enemyAIStep } from "./systems/enemyAI";
import { moveEntities } from "./systems/movement";
import { npcAIStep } from "./systems/npcAI";
import { unitAIStep, unitTouchDamage } from "./systems/unitAI";
import { Clock, CombatTimers, HitFlash, HitStop } from "./traits";
import { rngFor } from "./worldRng";

export const SIM_DT = 1 / 60;

export { rngFor } from "./worldRng";

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
  // hit-stop: impact freezes the whole sim for a beat — deterministic crunch
  const stop = world.get(HitStop);
  if (stop && stop.left > 0) {
    const consumed = Math.min(dt, stop.left);
    world.set(HitStop, { left: stop.left - consumed });
    dt -= consumed;
    if (dt <= 0) return;
  }
  const clock = world.get(Clock);
  if (clock) world.set(Clock, { t: clock.t + dt, dt });
  tickTimers(world, dt);
  enemyAIStep(world, dt);
  unitAIStep(world, dt);
  npcAIStep(world, dt);
  moveEntities(world, dt);
  combatStep(world, dt);
  unitTouchDamage(world, dt);
  for (const event of drainEvents(world)) reduceEvent(world, event);
  updateCamera(world, rngFor(world));
}
