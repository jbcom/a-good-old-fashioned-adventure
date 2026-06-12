/**
 * Pose selection: maps live sim state onto a sprite's authored pose frames
 * (docs/DESIGN-SYSTEM.md §pose frames). Pure reads — both the renderer and
 * the HUD snapshot use this, so tests can assert poses through the public
 * dataset.
 */
import type { Entity, World } from "koota";
import { classes, combat } from "../lib/config";
import { getSprite } from "../lib/content/registry";
import { Clock, CombatTimers, IsPlayer, MoveIntent } from "../sim/traits";

function hasFrame(spriteId: string, pose: string): boolean {
  return !!getSprite(spriteId).frames?.[pose];
}

/** Walk cycle index from the deterministic sim clock. */
function walkPose(world: World): string {
  const t = world.get(Clock)?.t ?? 0;
  const frame = Math.floor(t * combat.feedback.walkFrameFps) % 2;
  return `walk-${frame}`;
}

export function spritePose(world: World, entity: Entity, spriteId: string): string {
  const timers = entity.get(CombatTimers);
  const playerInfo = entity.get(IsPlayer);

  if (playerInfo && timers) {
    const cooldown = classes.classes[playerInfo.classId]?.attack.cooldown ?? 0;
    const attackWindow = Math.max(0, cooldown - combat.feedback.attackPoseDuration);
    if (timers.attack > attackWindow && hasFrame(spriteId, "attack")) return "attack";
    if (timers.iframes > 0 && hasFrame(spriteId, "hurt")) return "hurt";
  }

  const intent = entity.get(MoveIntent);
  const moving = !!intent && (intent.x !== 0 || intent.y !== 0);
  if (moving) {
    const pose = walkPose(world);
    if (hasFrame(spriteId, pose)) return pose;
  }
  return "idle";
}

/** Alpha for the iframe blink: visible damage immunity without a new frame. */
export function iframeAlpha(world: World, entity: Entity): number {
  const iframes = entity.get(CombatTimers)?.iframes ?? 0;
  if (iframes <= 0) return 1;
  const t = world.get(Clock)?.t ?? 0;
  return Math.floor(t * combat.feedback.iframeBlinkHz) % 2 === 0 ? 1 : 0.45;
}
