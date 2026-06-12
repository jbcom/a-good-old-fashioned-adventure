/**
 * Rail-command unit brains (docs/RAIL-COMMAND.md §sim model): each placed
 * unit perceives the field, picks a target by class temperament, pursues
 * it on Yuka steering, and engages through the same combat paths the
 * player used — the player-governor's plan-and-pursue loop, living in-sim.
 * Verbs: charge (close and strike), hold-range (kite to a firing band),
 * aoe (kite, blast clusters), flank (fast lateral approach), aura
 * (follow the line, pulse support). Deterministic: positions only.
 */
import type { Entity, World } from "koota";
import { SeekBehavior, Vector3, Vehicle } from "yuka";
import { type ClassTemperament, classes, combat } from "../../lib/config";
import { spawnProjectile } from "../factories";
import {
  CombatTimers,
  Facing,
  Health,
  IsEnemy,
  IsUnit,
  MoveIntent,
  Outbox,
  Speed,
  Threat,
  Transform,
} from "../traits";
import { damageEnemy, meleeDamage } from "./combat";

interface UnitBrain {
  vehicle: Vehicle;
  seek: SeekBehavior;
  pulseLeft: number;
}

const brains = new WeakMap<World, Map<Entity, UnitBrain>>();

function brainFor(world: World, unit: Entity, x: number, y: number): UnitBrain {
  let perWorld = brains.get(world);
  if (!perWorld) {
    perWorld = new Map();
    brains.set(world, perWorld);
  }
  let brain = perWorld.get(unit);
  if (!brain) {
    const vehicle = new Vehicle();
    vehicle.position.set(x, y, 0);
    const seek = new SeekBehavior(new Vector3());
    seek.active = false;
    vehicle.steering.add(seek);
    brain = { vehicle, seek, pulseLeft: 0 };
    perWorld.set(unit, brain);
  }
  return brain;
}

function pruneDead(world: World): void {
  const perWorld = brains.get(world);
  if (!perWorld) return;
  for (const entity of [...perWorld.keys()]) {
    if (!world.has(entity)) perWorld.delete(entity);
  }
}

function nearestEnemy(
  world: World,
  from: { x: number; y: number },
): { enemy: Entity; x: number; y: number; dist: number } | null {
  let best: { enemy: Entity; x: number; y: number; dist: number } | null = null;
  for (const enemy of world.query(IsEnemy, Health, Transform)) {
    const t = enemy.get(Transform);
    if (!t) continue;
    const dist = Math.hypot(t.x - from.x, t.y - from.y);
    if (!best || dist < best.dist) best = { enemy, x: t.x, y: t.y, dist };
  }
  return best;
}

function unitStrike(
  world: World,
  unit: Entity,
  classId: string,
  temperament: ClassTemperament,
  target: { enemy: Entity; x: number; y: number; dist: number },
): void {
  const timers = unit.get(CombatTimers);
  const transform = unit.get(Transform);
  const attack = classes.classes[classId]?.attack;
  if (!timers || !transform || !attack || timers.attack > 0) return;
  unit.set(CombatTimers, { ...timers, attack: attack.cooldown });
  const dir = target.x >= transform.x ? 1 : -1;

  if (attack.kind === "projectile") {
    world.get(Outbox)?.sfx.push("magic");
    const len = Math.max(1e-6, target.dist);
    spawnProjectile(world, {
      type: attack.projectile ?? "arrow",
      x: transform.x + ((target.x - transform.x) / len) * 10,
      y: transform.y + ((target.y - transform.y) / len) * 10 - 6,
      vx: ((target.x - transform.x) / len) * (attack.speed ?? 160),
      vy: ((target.y - transform.y) / len) * (attack.speed ?? 160),
      life: attack.life ?? 2,
      fromPlayer: true,
    });
    return;
  }

  world.get(Outbox)?.sfx.push("slash");
  // melee: strike the target, and an AoE temperament splashes the cluster
  damageEnemy(world, target.enemy, meleeDamage(1), dir);
  const blast = temperament.blastRadius ?? 0;
  if (blast > 0) {
    for (const enemy of [...world.query(IsEnemy, Health, Transform)]) {
      if (enemy === target.enemy) continue;
      const t = enemy.get(Transform);
      if (!t) continue;
      if (Math.hypot(t.x - target.x, t.y - target.y) <= blast) {
        damageEnemy(world, enemy, meleeDamage(1), dir);
      }
    }
  }
}

export function unitAIStep(world: World, dt: number): void {
  pruneDead(world);
  for (const unit of [...world.query(IsUnit, Transform, Speed, MoveIntent)]) {
    const info = unit.get(IsUnit);
    const transform = unit.get(Transform);
    const speed = unit.get(Speed);
    if (!info || !transform || !speed) continue;
    const temperament = classes.classes[info.classId]?.temperament;
    if (!temperament) continue;

    const timers = unit.get(CombatTimers);
    if (timers && timers.attack > 0) {
      unit.set(CombatTimers, { ...timers, attack: Math.max(0, timers.attack - dt) });
    }

    const brain = brainFor(world, unit, transform.x, transform.y);
    brain.vehicle.position.set(transform.x, transform.y, 0);
    brain.vehicle.maxSpeed = speed.value;
    brain.seek.active = false;

    const target = nearestEnemy(world, transform);
    let intentX = 0;
    let intentY = 0;
    let speedScale = 1;

    if (target) {
      switch (temperament.verb) {
        case "charge": {
          if (target.dist > temperament.engage) {
            brain.seek.active = true;
            brain.seek.target.set(target.x, target.y, 0);
            speedScale = temperament.chargeSpeedMultiplier ?? 1;
          }
          break;
        }
        case "flank": {
          // approach offset to the target's side, collapsing in close
          const lateral =
            target.dist > temperament.engage * 2 ? (temperament.lateralOffset ?? 0) : 0;
          if (target.dist > temperament.engage) {
            brain.seek.active = true;
            brain.seek.target.set(target.x, target.y + lateral, 0);
            speedScale = temperament.chargeSpeedMultiplier ?? 1;
          }
          break;
        }
        case "hold-range":
        case "aoe": {
          const keep = temperament.keepDistance ?? temperament.engage / 2;
          if (target.dist > temperament.engage) {
            brain.seek.active = true;
            brain.seek.target.set(target.x, target.y, 0);
          } else if (target.dist < keep) {
            // back off along the threat line to the firing band
            brain.seek.active = true;
            brain.seek.target.set(
              transform.x + (transform.x - target.x),
              transform.y + (transform.y - target.y),
              0,
            );
          }
          break;
        }
        case "aura": {
          // march with the line: stay near the foremost ally, never engage
          break;
        }
      }
      if (target.dist <= temperament.engage && temperament.verb !== "aura") {
        unitStrike(world, unit, info.classId, temperament, target);
      }
    }

    // aura pulses heal nearby allies on a fixed period
    if (temperament.verb === "aura") {
      brain.pulseLeft -= dt;
      if (brain.pulseLeft <= 0) {
        brain.pulseLeft += temperament.pulsePeriod ?? 2;
        const radius = temperament.auraRadius ?? 0;
        for (const ally of world.query(IsUnit, Health, Transform)) {
          if (ally === unit) continue;
          const t = ally.get(Transform);
          const health = ally.get(Health);
          if (!t || !health) continue;
          if (Math.hypot(t.x - transform.x, t.y - transform.y) <= radius) {
            ally.set(Health, {
              hp: Math.min(health.maxHp, health.hp + (temperament.healPerPulse ?? 0)),
              maxHp: health.maxHp,
            });
          }
        }
      }
    }

    if (brain.seek.active) {
      brain.vehicle.velocity.set(0, 0, 0);
      brain.vehicle.update(dt);
      const v = brain.vehicle.velocity;
      const len = Math.hypot(v.x, v.y);
      if (len > 1e-6) {
        intentX = (v.x / len) * speedScale;
        intentY = (v.y / len) * speedScale;
      }
    }

    unit.set(MoveIntent, { x: intentX, y: intentY });
    if (intentX !== 0) unit.set(Facing, { dir: intentX > 0 ? 1 : -1 });
    else if (target) unit.set(Facing, { dir: target.x >= transform.x ? 1 : -1 });
  }
}

/** Touch damage for units mirrors the player's armed-contact rule. */
export function unitTouchDamage(world: World, dt: number): void {
  for (const unit of [...world.query(IsUnit, Health, Transform, CombatTimers)]) {
    const timers = unit.get(CombatTimers);
    const transform = unit.get(Transform);
    const health = unit.get(Health);
    if (!timers || !transform || !health) continue;
    if (timers.iframes > 0) {
      unit.set(CombatTimers, { ...timers, iframes: Math.max(0, timers.iframes - dt) });
      continue;
    }
    for (const enemy of world.query(IsEnemy, Transform)) {
      const et = enemy.get(Transform);
      if (!et) continue;
      // telegraphed contact, same as the player's rule: unarmed touch is safe
      const threat = enemy.get(Threat);
      if (threat && !threat.armed) continue;
      if (Math.hypot(transform.x - et.x, transform.y - et.y) < combat.hitboxes.touchRadius) {
        const hp = health.hp - combat.damage.enemyTouch;
        if (hp <= 0) {
          unit.destroy();
        } else {
          unit.set(Health, { hp, maxHp: health.maxHp });
          unit.set(CombatTimers, { ...timers, iframes: 0.5 });
        }
        break;
      }
    }
  }
}
