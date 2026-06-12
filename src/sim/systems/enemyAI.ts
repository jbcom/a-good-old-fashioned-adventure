/**
 * Enemy AI: yuka steering produces each enemy's MoveIntent; archetype
 * configs (src/config/enemies.json) drive ranges, cooldowns, and
 * projectiles. Behaviors: patrol (oscillate + aggro), chase (yuka Seek,
 * deaggro unless relentless), caster (kite: yuka Flee inside
 * keepDistance + ranged cast), turret (stationary cast), ambush (held
 * until trigger, then Seek), guard (post leash + return), boss (Seek +
 * spread volley). Deterministic: steering depends only on positions.
 */
import type { Entity, World } from "koota";
import { FleeBehavior, SeekBehavior, Vector3, Vehicle } from "yuka";
import { combat as combatConfig, enemies } from "../../lib/config";
import { spawnProjectile } from "../factories";
import {
  Choreo,
  Facing,
  IsEnemy,
  IsPlayer,
  IsUnit,
  MoveIntent,
  Outbox,
  Speed,
  Threat,
  Transform,
  Withered,
} from "../traits";

interface EnemyAi {
  vehicle: Vehicle;
  seek: SeekBehavior;
  flee: FleeBehavior;
  mode: "patrol" | "chase" | "hold" | "return";
  origX: number;
  origY: number;
  patrolDir: 1 | -1;
  castCooldown: number;
}

const aiStates = new WeakMap<World, Map<Entity, EnemyAi>>();

function aiFor(world: World, enemy: Entity, x: number, y: number): EnemyAi {
  let perWorld = aiStates.get(world);
  if (!perWorld) {
    perWorld = new Map();
    aiStates.set(world, perWorld);
  }
  let ai = perWorld.get(enemy);
  if (!ai) {
    const vehicle = new Vehicle();
    vehicle.position.set(x, y, 0);
    const seek = new SeekBehavior(new Vector3());
    const flee = new FleeBehavior(new Vector3());
    seek.active = false;
    flee.active = false;
    vehicle.steering.add(seek);
    vehicle.steering.add(flee);
    ai = {
      vehicle,
      seek,
      flee,
      mode: "patrol",
      origX: x,
      origY: y,
      patrolDir: 1,
      castCooldown: 0,
    };
    perWorld.set(enemy, ai);
  }
  return ai;
}

function pruneDead(world: World): void {
  const perWorld = aiStates.get(world);
  if (!perWorld) return;
  for (const entity of [...perWorld.keys()]) {
    if (!world.has(entity)) perWorld.delete(entity);
  }
}

function castAt(
  world: World,
  from: { x: number; y: number },
  to: { x: number; y: number },
  projectile: { type: string; speed: number; life: number },
  sfxName: string,
  spreadAngles?: number[],
): void {
  world.get(Outbox)?.sfx.push(sfxName);
  const base = Math.atan2(to.y - from.y, to.x - from.x);
  for (const offset of spreadAngles ?? [0]) {
    spawnProjectile(world, {
      type: projectile.type,
      x: from.x,
      y: from.y - 6,
      vx: Math.cos(base + offset) * projectile.speed,
      vy: Math.sin(base + offset) * projectile.speed,
      life: projectile.life,
      fromPlayer: false,
    });
  }
}

function seekTo(ai: EnemyAi, target: { x: number; y: number }): true {
  ai.seek.active = true;
  ai.seek.target.set(target.x, target.y, 0);
  return true;
}

function returnToPost(
  ai: EnemyAi,
  transform: { x: number; y: number },
  settleDistance = 2,
): boolean {
  const homeDist = Math.hypot(transform.x - ai.origX, transform.y - ai.origY);
  if (homeDist <= settleDistance) {
    ai.mode = "hold";
    return false;
  }
  return seekTo(ai, { x: ai.origX, y: ai.origY });
}

/**
 * The threat an enemy reacts to: the player pawn when present, otherwise
 * the nearest rail-command unit (docs/RAIL-COMMAND.md — units are allies
 * in the same targeting sense the player was).
 */
function nearestAllyTo(
  world: World,
  from: { x: number; y: number },
): { x: number; y: number } | null {
  const playerPos = world.queryFirst(IsPlayer)?.get(Transform);
  if (playerPos) return playerPos;
  let best: { x: number; y: number; dist: number } | null = null;
  for (const unit of world.query(IsUnit, Transform)) {
    const t = unit.get(Transform);
    if (!t) continue;
    const dist = Math.hypot(t.x - from.x, t.y - from.y);
    if (!best || dist < best.dist) best = { x: t.x, y: t.y, dist };
  }
  return best;
}

export function enemyAIStep(world: World, dt: number): void {
  pruneDead(world);
  const defaults = enemies.aiDefaults;

  for (const enemy of [...world.query(IsEnemy, Transform, Speed, MoveIntent)]) {
    const info = enemy.get(IsEnemy);
    const transform = enemy.get(Transform);
    const speed = enemy.get(Speed);
    if (!info || !transform || !speed) continue;
    const archetype = enemies.archetypes[info.archetypeId];
    if (!archetype) continue;
    // the wither decays on the enemy's own clock — never gated behind
    // having a target (an unopposed survivor must still shed the debuff)
    const witherNow = enemy.get(Withered);
    if (witherNow && witherNow.left > 0) {
      enemy.set(Withered, { left: Math.max(0, witherNow.left - dt) });
    }
    const playerPos = nearestAllyTo(world, transform);
    if (!playerPos) continue;

    const ai = aiFor(world, enemy, transform.x, transform.y);
    ai.castCooldown = Math.max(0, ai.castCooldown - dt);
    const dx = playerPos.x - transform.x;
    const dy = playerPos.y - transform.y;
    const dist = Math.hypot(dx, dy);

    let intentX = 0;
    let intentY = 0;
    let intentScale = 1;
    let useSteering = false;

    ai.vehicle.position.set(transform.x, transform.y, 0);
    ai.vehicle.maxSpeed = speed.value;
    ai.seek.active = false;
    ai.flee.active = false;

    switch (archetype.behavior) {
      case "patrol": {
        if (dist < defaults.aggroRange) ai.mode = "chase";
        if (ai.mode === "chase" && dist > defaults.deaggroRange && !archetype.relentless) {
          ai.mode = "patrol";
        }
        if (ai.mode === "chase") {
          ai.seek.active = true;
          ai.seek.target.set(playerPos.x, playerPos.y, 0);
          useSteering = true;
        } else {
          if (Math.abs(transform.x - ai.origX) > defaults.patrolRange) {
            ai.patrolDir = transform.x > ai.origX ? -1 : 1;
          }
          intentX = ai.patrolDir;
        }
        break;
      }
      case "chase": {
        ai.seek.active = true;
        ai.seek.target.set(playerPos.x, playerPos.y, 0);
        useSteering = true;
        break;
      }
      case "caster": {
        const spec = archetype.caster;
        if (!spec) break;
        if (dist < spec.attackRange) {
          if (dist < spec.keepDistance) {
            ai.flee.active = true;
            ai.flee.panicDistance = spec.keepDistance;
            ai.flee.target.set(playerPos.x, playerPos.y, 0);
            useSteering = true;
          }
          if (ai.castCooldown <= 0) {
            ai.castCooldown = spec.cooldown;
            castAt(world, transform, playerPos, spec.projectile, spec.sfx);
          }
        }
        break;
      }
      case "turret": {
        const spec = archetype.turret;
        if (!spec) break;
        if (dist < spec.attackRange && ai.castCooldown <= 0) {
          ai.castCooldown = spec.cooldown;
          castAt(world, transform, playerPos, spec.projectile, spec.sfx);
        }
        break;
      }
      case "ambush": {
        const spec = archetype.ambush;
        if (!spec) break;
        if (ai.mode !== "chase" && ai.mode !== "return" && dist < spec.triggerRange) {
          ai.mode = "chase";
        }
        if (ai.mode === "chase" && dist > spec.deaggroRange) {
          ai.mode = "return";
        }
        if (ai.mode === "chase") {
          useSteering = seekTo(ai, playerPos);
        } else if (ai.mode === "return") {
          useSteering = returnToPost(ai, transform);
        }
        break;
      }
      case "guard": {
        const spec = archetype.guard;
        if (!spec) break;
        const postDist = Math.hypot(transform.x - ai.origX, transform.y - ai.origY);
        if (ai.mode !== "chase" && dist < spec.aggroRange && postDist <= spec.leashRange) {
          ai.mode = "chase";
        }
        if (ai.mode === "chase" && (dist > spec.deaggroRange || postDist > spec.leashRange)) {
          ai.mode = "return";
        }
        if (ai.mode === "chase") {
          useSteering = seekTo(ai, playerPos);
        } else if (ai.mode === "return") {
          useSteering = returnToPost(ai, transform);
        }
        // stance fighters alternate a crouched guard (slow, armored) with
        // open windows while engaged; the stance drops outside the fight
        const stance = spec.stance;
        const choreo = stance ? enemy.get(Choreo) : undefined;
        if (stance && choreo) {
          if (ai.mode === "chase") {
            let { phase, left } = choreo;
            if (phase !== "guard" && phase !== "open") {
              phase = "guard";
              left = stance.guard;
            } else {
              left -= dt;
              if (left <= 0) {
                phase = phase === "guard" ? "open" : "guard";
                left += phase === "guard" ? stance.guard : stance.open;
              }
            }
            enemy.set(Choreo, { phase, left });
            if (phase === "guard") intentScale = stance.moveFactor;
          } else if (choreo.phase !== "") {
            enemy.set(Choreo, { phase: "", left: 0 });
          }
        }
        break;
      }
      case "boss": {
        const spec = archetype.boss;
        if (!spec) break;
        if (dist >= spec.aggroRange) break;
        const phases = spec.phases;
        const choreo = phases ? enemy.get(Choreo) : undefined;
        if (phases && choreo) {
          // deterministic fight pattern: roar (hold, telegraph) -> volley
          // (advance, one spread on entry) -> lull (hold, vulnerable)
          let { phase, left } = choreo;
          left -= dt;
          if (left <= 0) {
            if (phase === "roar") {
              phase = "volley";
              left += phases.volley;
              castAt(world, transform, playerPos, spec.projectile, spec.sfx, spec.spreadAngles);
            } else if (phase === "volley") {
              phase = "lull";
              left += phases.lull;
            } else {
              phase = "roar";
              left += phases.roar;
            }
          }
          enemy.set(Choreo, { phase, left });
          if (phase === "volley") useSteering = seekTo(ai, playerPos);
        } else {
          useSteering = seekTo(ai, playerPos);
          if (ai.castCooldown <= 0) {
            ai.castCooldown = spec.cooldown;
            castAt(world, transform, playerPos, spec.projectile, spec.sfx, spec.spreadAngles);
          }
        }
        break;
      }
    }

    if (useSteering) {
      ai.vehicle.velocity.set(0, 0, 0);
      ai.vehicle.update(dt);
      const v = ai.vehicle.velocity;
      const len = Math.hypot(v.x, v.y);
      if (len > 1e-6) {
        intentX = v.x / len;
        intentY = v.y / len;
      }
    }

    // the wither slows: drag the stride while the debuff holds
    if ((enemy.get(Withered)?.left ?? 0) > 0) {
      intentScale *= combatConfig.wither.speedFactor;
    }
    enemy.set(MoveIntent, { x: intentX * intentScale, y: intentY * intentScale });
    if (intentX !== 0) enemy.set(Facing, { dir: intentX > 0 ? 1 : -1 });
    else if (dx !== 0) enemy.set(Facing, { dir: dx > 0 ? 1 : -1 });

    // telegraphs: touch damage arms after a visible wind-up near the player;
    // ranged enemies flash through the last beat before each shot. A
    // touchHarmless enemy (the lectern wraith) never arms — standing inside
    // it is safe; only its attacks threaten.
    const threat = enemy.get(Threat);
    if (threat) {
      const windup = enemies.aiDefaults.windup;
      let { windupLeft, armed } = threat;
      if (archetype.touchHarmless) {
        armed = false;
        windupLeft = windup.duration;
      } else if (dist <= windup.armRange) {
        if (!armed) {
          windupLeft = Math.max(0, windupLeft - dt);
          if (windupLeft === 0) armed = true;
        }
      } else if (dist > windup.disarmRange) {
        armed = false;
        windupLeft = windup.duration;
      }
      const castRange =
        archetype.caster?.attackRange ??
        archetype.turret?.attackRange ??
        archetype.boss?.aggroRange;
      const casting =
        castRange !== undefined &&
        dist < castRange &&
        ai.castCooldown > 0 &&
        ai.castCooldown < windup.castFlash;
      if (
        windupLeft !== threat.windupLeft ||
        armed !== threat.armed ||
        casting !== threat.casting
      ) {
        enemy.set(Threat, { windupLeft, armed, casting });
      }
    }
  }
}
