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
import { type ClassTemperament, classes, combat, enemies } from "../../lib/config";
import { chooseGoal, type FieldView } from "../ai";
import { spawnProjectile } from "../factories";
import { getRail, nextRailPoint } from "../rail";
import {
  CombatTimers,
  Facing,
  Health,
  IsEnemy,
  IsUnit,
  MapRuntime,
  MoveIntent,
  Outbox,
  Speed,
  Threat,
  Transform,
  Withered,
} from "../traits";
import { damageEnemy, meleeDamage } from "./combat";
import { railAxis } from "./waves";

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
    // storm-volley looses a bolt at EVERY enemy in the whirl radius;
    // everyone else fires a single aimed shot
    const targets =
      temperament.verb === "storm-volley"
        ? [...world.query(IsEnemy, Health, Transform)]
            .map((enemy) => {
              const t = enemy.get(Transform);
              return t
                ? { x: t.x, y: t.y, d: Math.hypot(t.x - transform.x, t.y - transform.y) }
                : null;
            })
            .filter(
              (t): t is { x: number; y: number; d: number } =>
                !!t && t.d <= (temperament.blastRadius ?? 100),
            )
        : [{ x: target.x, y: target.y, d: target.dist }];
    for (const aim of targets) {
      const len = Math.max(1e-6, aim.d);
      spawnProjectile(world, {
        type: attack.projectile ?? "arrow",
        x: transform.x + ((aim.x - transform.x) / len) * 10,
        y: transform.y + ((aim.y - transform.y) / len) * 10 - 6,
        vx: ((aim.x - transform.x) / len) * (attack.speed ?? 160),
        vy: ((aim.y - transform.y) / len) * (attack.speed ?? 160),
        life: attack.life ?? 2,
        fromPlayer: true,
      });
    }
    return;
  }

  world.get(Outbox)?.sfx.push("slash");
  // melee: strike the target, and an AoE temperament splashes the cluster
  damageEnemy(world, target.enemy, meleeDamage(1), dir);
  if (temperament.withersOnHit) applyWither(world, target.enemy);
  const blast = temperament.blastRadius ?? 0;
  if (blast > 0) {
    for (const enemy of [...world.query(IsEnemy, Health, Transform)]) {
      if (enemy === target.enemy) continue;
      const t = enemy.get(Transform);
      if (!t) continue;
      if (Math.hypot(t.x - target.x, t.y - target.y) <= blast) {
        damageEnemy(world, enemy, meleeDamage(1), dir);
        if (temperament.withersOnHit) applyWither(world, enemy);
      }
    }
  }
}

function applyWither(world: World, enemy: Entity): void {
  void world;
  if (enemy.has(Withered)) enemy.set(Withered, { left: combat.wither.duration });
  else enemy.add(Withered({ left: combat.wither.duration }));
}

function buildFieldView(world: World, self: { x: number; y: number }): FieldView {
  const enemyList: FieldView["enemies"] = [];
  for (const enemy of world.query(IsEnemy, Health, Transform)) {
    const t = enemy.get(Transform);
    const health = enemy.get(Health);
    const info = enemy.get(IsEnemy);
    if (!t || !health || !info) continue;
    const behavior = enemies.archetypes[info.archetypeId]?.behavior;
    enemyList.push({
      id: enemy.id(),
      x: t.x,
      y: t.y,
      hp: health.hp,
      backline: behavior === "caster" || behavior === "turret" || behavior === "boss",
    });
  }
  const allyList: FieldView["allies"] = [];
  for (const ally of world.query(IsUnit, Health, Transform)) {
    const t = ally.get(Transform);
    const health = ally.get(Health);
    if (!t || !health) continue;
    allyList.push({ id: ally.id(), x: t.x, y: t.y, hp: health.hp, maxHp: health.maxHp });
  }
  return { self, enemies: enemyList, allies: allyList };
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

    // the class's own mind picks the destination (directive S18.3 GOAP)
    const view = buildFieldView(world, transform);
    const goal = chooseGoal(info.classId, view);
    const found = nearestEnemy(world, transform);
    // beyond perception the field is quiet: advance the rail instead
    const perception = temperament.perception ?? 200;
    let target = found && found.dist <= perception ? found : null;
    if (
      target &&
      (goal.kind === "engage" || goal.kind === "hunt-backline" || goal.kind === "dive-cluster")
    ) {
      // chase the goal's chosen prey, not merely the closest body
      for (const enemy of world.query(IsEnemy, Health, Transform)) {
        if (enemy.id() !== goal.enemyId) continue;
        const t = enemy.get(Transform);
        if (!t) break;
        const goalDist = Math.hypot(t.x - transform.x, t.y - transform.y);
        if (goalDist <= perception * 1.4) {
          target = { enemy, x: t.x, y: t.y, dist: goalDist };
        }
        break;
      }
    }
    if (
      target &&
      (goal.kind === "mend" || goal.kind === "escort" || goal.kind === "cover-enemies")
    ) {
      // supports steer by their goal point, not the nearest enemy
      target = null;
    }
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
        case "aoe":
        case "debuff-aura":
        case "storm-volley": {
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
        case "aura":
        case "heal-beam": {
          // supports never engage: the goal layer steers them
          break;
        }
      }
      if (
        target.dist <= temperament.engage &&
        temperament.verb !== "aura" &&
        temperament.verb !== "heal-beam"
      ) {
        unitStrike(world, unit, info.classId, temperament, target);
      }
    }

    if (!target) {
      if (goal.kind === "mend" || goal.kind === "escort" || goal.kind === "cover-enemies") {
        const away = Math.hypot(goal.x - transform.x, goal.y - transform.y);
        if (away > 12) {
          brain.seek.active = true;
          brain.seek.target.set(goal.x, goal.y, 0);
        }
      } else {
        // no threat in sight: march the designed route (docs/RAIL-COMMAND.md)
        const runtime = world.get(MapRuntime);
        const mapId = runtime?.mapId ?? "";
        const axis = railAxis(world);
        const ahead = mapId ? nextRailPoint(getRail(mapId, axis), transform, axis) : null;
        if (ahead) {
          brain.seek.active = true;
          brain.seek.target.set(ahead.x, ahead.y, 0);
        } else if (runtime) {
          // no authored waypoints: march straight toward the axis goal edge
          // (east edge or north edge) holding the current cross-axis lane
          brain.seek.active = true;
          const goalX = axis === "east" ? runtime.cols * 16 - 24 : transform.x;
          const goalY = axis === "east" ? transform.y : 24;
          brain.seek.target.set(goalX, goalY, 0);
        }
      }
    }

    // the withering field: every enemy inside the radius carries the debuff
    if (temperament.verb === "debuff-aura") {
      const radius = temperament.auraRadius ?? 0;
      for (const enemy of world.query(IsEnemy, Health, Transform)) {
        const t = enemy.get(Transform);
        if (!t) continue;
        if (Math.hypot(t.x - transform.x, t.y - transform.y) <= radius) {
          applyWither(world, enemy);
        }
      }
    }

    // heal-beam: channel into the most wounded ally within reach
    if (temperament.verb === "heal-beam") {
      brain.pulseLeft -= dt;
      if (brain.pulseLeft <= 0) {
        brain.pulseLeft += temperament.pulsePeriod ?? 0.6;
        let patient: Entity | null = null;
        let worst = 1;
        for (const ally of world.query(IsUnit, Health, Transform)) {
          if (ally === unit) continue;
          const t = ally.get(Transform);
          const health = ally.get(Health);
          if (!t || !health || health.maxHp <= 0) continue;
          const away = Math.hypot(t.x - transform.x, t.y - transform.y);
          if (away > temperament.engage) continue;
          const ratio = health.hp / health.maxHp;
          if (ratio < worst) {
            worst = ratio;
            patient = ally;
          }
        }
        const health = patient?.get(Health);
        if (patient && health && worst < 1) {
          patient.set(Health, {
            hp: Math.min(health.maxHp, health.hp + (temperament.healPerPulse ?? 0)),
            maxHp: health.maxHp,
          });
        }
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
