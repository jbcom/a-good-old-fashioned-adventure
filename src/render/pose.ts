/**
 * Pose selection: maps live sim state onto a sprite's authored pose frames
 * (docs/DESIGN-SYSTEM.md §pose frames). Pure reads — both the renderer and
 * the HUD snapshot use this, so tests can assert poses through the public
 * dataset.
 */
import type { Entity, World } from "koota";
import { classes, combat, enemies } from "../lib/config";
import { getSprite } from "../lib/content/registry";
import { isSheetSprite } from "../lib/content/sheetSprite";
import { Choreo, Clock, CombatTimers, IsPlayer, MoveIntent, Threat } from "../sim/traits";

function hasFrame(spriteId: string, pose: string): boolean {
  if (!spriteId) return false;
  const def = getSprite(spriteId);
  if (isSheetSprite(def)) {
    // sheet sprites answer for the whole pose family (walk-0, walk-up-1 →
    // walk); the resolver picks direction and frame from sim state
    const key = pose.replace(/-up-\d+$/, "").replace(/-\d+$/, "");
    return def.poseMap[key] !== undefined;
  }
  return !!def.frames?.[pose];
}

/** Walk cycle index from the deterministic sim clock. */
function walkFrame(world: World): number {
  const t = world.get(Clock)?.t ?? 0;
  return Math.floor(t * combat.feedback.walkFrameFps) % 2;
}

/** Resolve the current pose frame (idle, walk-0, walk-up-1, attack, hurt) from sim state. */
export function spritePose(world: World, entity: Entity, spriteId: string | undefined): string {
  if (!spriteId) return "idle";
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
  if (moving && intent) {
    const frame = walkFrame(world);
    // movers TURN as they move: show the back view while heading north
    const headingUp = intent.y < 0 && Math.abs(intent.y) >= Math.abs(intent.x);
    if (headingUp && hasFrame(spriteId, `walk-up-${frame}`)) return `walk-up-${frame}`;
    if (hasFrame(spriteId, `walk-${frame}`)) return `walk-${frame}`;
  }
  return "idle";
}

/**
 * Telegraph pulse: a winding-up melee enemy swells with a building throb and
 * a ranged enemy flickers larger through its pre-shot beat — danger is
 * always readable before damage lands.
 */
export function threatScale(world: World, entity: Entity): number {
  const threat = entity.get(Threat);
  if (!threat) return 1;
  const windup = enemies.aiDefaults.windup;
  const t = world.get(Clock)?.t ?? 0;
  const feedback = combat.feedback;
  // boss choreography reads above the per-frame telegraphs: a roaring boss
  // swells with a heavy throb, a guarding one crouches behind its shield
  const choreo = entity.get(Choreo);
  if (choreo?.phase === "roar") {
    const throb = (1 + Math.sin(t * feedback.telegraphThrobHz)) / 2;
    return 1 + feedback.roarThrobScale * throb;
  }
  if (choreo?.phase === "guard") return feedback.guardCrouchScale;
  if (
    !threat.armed &&
    windup.duration > 0 &&
    threat.windupLeft > 0 &&
    threat.windupLeft < windup.duration
  ) {
    const progress = 1 - threat.windupLeft / windup.duration;
    const throb = (1 + Math.sin(t * feedback.telegraphThrobHz)) / 2;
    return 1 + feedback.telegraphThrobScale * progress * throb;
  }
  if (threat.casting) {
    return Math.floor(t * feedback.castFlickerHz) % 2 === 0 ? feedback.castFlickerScale : 1;
  }
  return 1;
}

/** Alpha for the iframe blink: visible damage immunity without a new frame. */
export function iframeAlpha(world: World, entity: Entity): number {
  const iframes = entity.get(CombatTimers)?.iframes ?? 0;
  if (iframes <= 0) return 1;
  const t = world.get(Clock)?.t ?? 0;
  return Math.floor(t * combat.feedback.iframeBlinkHz) % 2 === 0 ? 1 : 0.45;
}
