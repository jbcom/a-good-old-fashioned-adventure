/**
 * Combat: player actions (attack A / ability B), projectile flight,
 * touch damage, pickups, chests, drops, XP/level-up. All numbers from
 * src/config; all randomness from the world RNG stream; every kill and
 * pickup goes through the event bus so quests stay in sync.
 */
import type { Entity, World } from "koota";
import { classes, combat, drops, progression } from "../../lib/config";
import { getItem } from "../../lib/content/registry";
import { collides } from "../collision";
import { pushEvent } from "../events";
import { spawnFx, spawnPickup, spawnProjectile } from "../factories";
import { recordDeathPayout } from "../incrementalProgress";
import {
  AimDirection,
  CameraState,
  CombatTimers,
  Facing,
  FlagState,
  FxBurst,
  Health,
  Hitbox,
  HitFlash,
  IsEnemy,
  IsPickup,
  IsPlayer,
  Level,
  LootContainer,
  Outbox,
  PlayerGold,
  Projectile,
  PropRef,
  ShieldState,
  SpriteRef,
  Transform,
} from "../traits";
import { rngFor } from "../worldRng";

const PICKUP_RADIUS = drops.pickupRadius;

function sfx(world: World, name: string): void {
  world.get(Outbox)?.sfx.push(name);
}

function shake(world: World, amount: number): void {
  const cam = world.get(CameraState);
  if (cam && amount > cam.shake) world.set(CameraState, { ...cam, shake: amount });
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function rectOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function entityBox(entity: Entity): Box | undefined {
  const t = entity.get(Transform);
  const h = entity.get(Hitbox);
  if (!t || !h) return undefined;
  return { x: t.x - h.w / 2, y: t.y - h.h, w: h.w, h: h.h };
}

function normalizedAim(player: Entity): { x: number; y: number } {
  const facing = player.get(Facing)?.dir ?? 1;
  const aim = player.get(AimDirection) ?? { x: facing, y: 0 };
  const len = Math.hypot(aim.x, aim.y);
  if (len < 1e-6) return { x: facing, y: 0 };
  return { x: aim.x / len, y: aim.y / len };
}

export function meleeDamage(level: number): number {
  return combat.damage.melee.base + level * combat.damage.melee.perLevel;
}

export function arrowDamage(level: number): number {
  return combat.damage.arrow.base + level * combat.damage.arrow.perLevel;
}

export function damageEnemy(world: World, enemy: Entity, dmg: number, knockDir: number): void {
  const health = enemy.get(Health);
  const transform = enemy.get(Transform);
  if (!health || !transform) return;

  const hp = health.hp - dmg;
  enemy.set(Transform, { ...transform, x: transform.x + knockDir * combat.knockback.enemyOnHit });
  if (enemy.has(HitFlash)) enemy.set(HitFlash, { left: combat.feedback.enemyHitFlashDuration });
  else enemy.add(HitFlash({ left: combat.feedback.enemyHitFlashDuration }));
  shake(world, combat.screenShake.onEnemyHit);

  if (hp <= 0) {
    const archetypeId = enemy.get(IsEnemy)?.archetypeId ?? "";
    const maxHp = health.maxHp;
    const { x, y } = transform;
    const ghost = enemy.get(SpriteRef);
    if (ghost) {
      spawnFx(world, {
        kind: "dissolve",
        spriteId: ghost.spriteId,
        paletteId: ghost.paletteId,
        dir: knockDir,
        left: combat.feedback.dissolveFxDuration,
        x,
        y,
      });
    }
    enemy.destroy();
    sfx(world, "pickup");

    const rng = rngFor(world);
    const xpValue = Math.floor(
      progression.xpDrop.base + maxHp * progression.xpDrop.enemyMaxHpFactor,
    );
    spawnPickup(world, "item:xp-orb", x, y, xpValue);
    for (const roll of drops.onEnemyDeath.rolls) {
      if (rng.chance(roll.chance)) {
        spawnPickup(world, roll.item, x + (roll.offsetX ?? 0), y, 0);
      }
    }
    pushEvent(world, { type: "enemy:defeated", archetypeId, x, y });
  } else {
    enemy.set(Health, { hp, maxHp: health.maxHp });
    sfx(world, "hurt");
  }
}

export function damagePlayer(world: World, amount: number, iframes: number): void {
  const player = world.queryFirst(IsPlayer);
  if (!player) return;
  const timers = player.get(CombatTimers);
  const health = player.get(Health);
  if (!timers || !health || timers.iframes > 0) return;

  player.set(CombatTimers, { ...timers, iframes });
  player.set(Health, { hp: health.hp - amount, maxHp: health.maxHp });
  shake(world, combat.screenShake.onPlayerTouchHit);
  sfx(world, "hurt");
  if (health.hp - amount <= 0) {
    recordDeathPayout(world);
    const outbox = world.get(Outbox);
    if (outbox) outbox.endGame = "gameover";
  }
}

/** Action A: melee swing or projectile shot, per class config. */
export function playerAttack(world: World): void {
  const player = world.queryFirst(IsPlayer);
  if (!player) return;
  const classId = player.get(IsPlayer)?.classId ?? "";
  const attack = classes.classes[classId]?.attack;
  const timers = player.get(CombatTimers);
  const transform = player.get(Transform);
  const facing = player.get(Facing);
  const level = player.get(Level);
  if (!attack || !timers || !transform || !facing || !level) return;
  if (timers.attack > 0) return;

  player.set(CombatTimers, { ...timers, attack: attack.cooldown });
  const aim = normalizedAim(player);

  if (attack.kind === "projectile") {
    sfx(world, "magic");
    spawnProjectile(world, {
      type: attack.projectile ?? "arrow",
      x: transform.x + aim.x * (attack.muzzleOffset?.x ?? 10),
      y: transform.y + aim.y * (attack.muzzleOffset?.x ?? 10) + (attack.muzzleOffset?.y ?? -6),
      vx: aim.x * (attack.speed ?? 160),
      vy: aim.y * (attack.speed ?? 160),
      life: attack.life ?? 2,
      fromPlayer: true,
    });
    return;
  }

  sfx(world, "slash");
  const reach = attack.reach ?? 28;
  spawnFx(world, {
    kind: "swing",
    spriteId: "sprite:fx-swing",
    paletteId: "palette:base",
    dir: facing.dir,
    left: combat.feedback.swingFxDuration,
    x: transform.x + aim.x * (reach / 2),
    y: transform.y + aim.y * (reach / 2) - 8,
  });
  const swing: Box = {
    x: transform.x + aim.x * (reach / 2) - reach / 2,
    y: transform.y + aim.y * (reach / 2) + combat.hitboxes.swingVerticalOffset,
    w: reach,
    h: combat.hitboxes.swingHeight,
  };

  for (const enemy of [...world.query(IsEnemy, Health, Transform)]) {
    const box = entityBox(enemy);
    if (box && rectOverlap(swing, box)) {
      damageEnemy(world, enemy, meleeDamage(level.level), facing.dir);
    }
  }
  for (const chest of [...world.query(LootContainer, Transform)]) {
    const t = chest.get(Transform);
    const loot = chest.get(LootContainer);
    if (!t || !loot || loot.opened) continue;
    const box: Box = { x: t.x - 6, y: t.y - 12, w: 12, h: 12 };
    if (rectOverlap(swing, box)) openChest(world, chest);
  }
}

export function openChest(world: World, chest: Entity): void {
  const loot = chest.get(LootContainer);
  if (!loot || loot.opened) return;
  chest.set(LootContainer, { ...loot, opened: true });
  const propRef = chest.get(PropRef);
  if (propRef) chest.set(PropRef, { ...propRef, state: "open" });
  sfx(world, "chest");
  shake(world, combat.screenShake.onChestOpen);
  const contents = drops.chestContents[loot.contents as keyof typeof drops.chestContents];
  if (contents) applyItemPickup(world, contents.item, contents.amount);
}

/** Apply an item's onPickup ops to the player and emit item:acquired. */
export function applyItemPickup(world: World, itemId: string, value: number): void {
  const player = world.queryFirst(IsPlayer);
  if (!player) return;
  const item = getItem(itemId);

  for (const op of item.onPickup) {
    if ("grantXp" in op) grantXp(world, player, value);
    if ("heal" in op) {
      const health = player.get(Health);
      if (health) {
        player.set(Health, {
          hp: Math.min(health.maxHp, health.hp + (op.heal as number)),
          maxHp: health.maxHp,
        });
      }
    }
    if ("setFlag" in op) {
      const flags = world.get(FlagState);
      if (flags) flags.values[op.setFlag as string] = true;
    }
    if ("grantGold" in op) {
      const gold = player.get(PlayerGold);
      if (gold) player.set(PlayerGold, { value: gold.value + value });
    }
    if ("maxHpUp" in op) {
      const health = player.get(Health);
      if (health) {
        player.set(Health, {
          hp: health.maxHp + (op.maxHpUp as number),
          maxHp: health.maxHp + (op.maxHpUp as number),
        });
      }
    }
    if ("levelUp" in op) {
      const level = player.get(Level);
      if (level) player.set(Level, { ...level, level: level.level + (op.levelUp as number) });
    }
    if ("fullHeal" in op) {
      const health = player.get(Health);
      if (health) player.set(Health, { hp: health.maxHp, maxHp: health.maxHp });
    }
  }
  pushEvent(world, { type: "item:acquired", itemId });
}

function grantXp(world: World, player: Entity, amount: number): void {
  const level = player.get(Level);
  if (!level) return;
  let { level: lvl, xp, nextXp } = level;
  xp += amount;
  while (xp >= nextXp) {
    xp -= nextXp;
    lvl += 1;
    nextXp = Math.floor(nextXp * progression.xpCurve.growthFactor);
    const health = player.get(Health);
    if (health) {
      const maxHp = health.maxHp + progression.onLevelUp.maxHpBonus;
      player.set(Health, { hp: progression.onLevelUp.fullHeal ? maxHp : health.hp, maxHp });
    }
    sfx(world, progression.onLevelUp.sfx);
  }
  player.set(Level, { level: lvl, xp, nextXp });
}

/** Per-step combat pass: projectiles, touch damage, pickups. */
export function combatStep(world: World, dt: number): void {
  const player = world.queryFirst(IsPlayer);
  const playerTransform = player?.get(Transform);

  for (const fx of [...world.query(FxBurst)]) {
    const state = fx.get(FxBurst);
    if (!state) continue;
    const left = state.left - dt;
    if (left <= 0) fx.destroy();
    else fx.set(FxBurst, { ...state, left });
  }

  for (const projectile of [...world.query(Projectile, Transform)]) {
    const p = projectile.get(Projectile);
    const t = projectile.get(Transform);
    if (!p || !t) continue;
    const life = p.life - dt;
    if (life <= 0) {
      projectile.destroy();
      continue;
    }
    const x = t.x + p.vx * dt;
    const y = t.y + p.vy * dt;
    projectile.set(Transform, { x, y });
    projectile.set(Projectile, { ...p, life });

    if (p.fromPlayer) {
      const level = player?.get(Level);
      for (const enemy of [...world.query(IsEnemy, Health, Transform)]) {
        const et = enemy.get(Transform);
        if (!et) continue;
        if (Math.hypot(et.x - x, et.y - y) < combat.hitboxes.projectileHitRadius) {
          projectile.destroy();
          damageEnemy(world, enemy, arrowDamage(level?.level ?? 1), p.vx >= 0 ? 1 : -1);
          break;
        }
      }
    } else if (player && playerTransform) {
      if (
        Math.hypot(playerTransform.x - x, playerTransform.y - y) <
        combat.hitboxes.playerProjectileHitRadius
      ) {
        projectile.destroy();
        if (player.get(ShieldState)?.active) {
          sfx(world, "interact");
        } else {
          damagePlayer(world, combat.damage.enemyProjectile, 0.4);
        }
      }
    }
  }

  if (!player || !playerTransform) return;

  for (const enemy of [...world.query(IsEnemy, Transform, Health)]) {
    const et = enemy.get(Transform);
    if (!et) continue;
    const dist = Math.hypot(playerTransform.x - et.x, playerTransform.y - et.y);
    if (dist < combat.hitboxes.touchRadius) {
      if (player.get(ShieldState)?.active) {
        const facing = player.get(Facing);
        enemy.set(Transform, {
          ...et,
          x: et.x - (facing?.dir ?? 1) * combat.knockback.enemyOffShield,
        });
        sfx(world, "shield");
      } else {
        damagePlayer(world, combat.damage.enemyTouch, 0.5);
      }
    }
  }

  for (const pickup of [...world.query(IsPickup, Transform)]) {
    const t = pickup.get(Transform);
    const info = pickup.get(IsPickup);
    if (!t || !info) continue;
    if (Math.hypot(playerTransform.x - t.x, playerTransform.y - t.y) < PICKUP_RADIUS) {
      pickup.destroy();
      sfx(world, "pickup");
      applyItemPickup(world, info.itemId, info.value);
    }
  }
}

/** Action B: class ability — shield hold, ranger leap, wizard/rogue blink. */
export function playerAbility(world: World, pressed: boolean): void {
  const player = world.queryFirst(IsPlayer);
  if (!player) return;
  const classId = player.get(IsPlayer)?.classId ?? "";
  const ability = classes.classes[classId]?.ability;
  const timers = player.get(CombatTimers);
  const transform = player.get(Transform);
  const facing = player.get(Facing);
  if (!ability || !timers || !transform || !facing) return;

  if (ability.kind === "shield") {
    player.set(ShieldState, { active: pressed });
    if (pressed) sfx(world, ability.sfx);
    return;
  }
  if (!pressed || timers.dashCooldown > 0) return;

  sfx(world, ability.sfx);
  player.set(CombatTimers, {
    ...timers,
    dash: ability.dashDuration ?? 0.2,
    dashCooldown: ability.cooldown ?? 1,
    iframes: Math.max(timers.iframes, ability.iframes ?? 0),
  });

  if (ability.kind === "leap") {
    const targetX = transform.x - facing.dir * (ability.backwardDistance ?? 45);
    const hitbox = player.get(Hitbox);
    if (hitbox && !collides(world, targetX, transform.y, hitbox.w, hitbox.h)) {
      player.set(Transform, { ...transform, x: targetX });
    }
    for (const angle of ability.spreadAngles ?? []) {
      spawnProjectile(world, {
        type: "arrow",
        x: transform.x,
        y: transform.y - 6,
        vx: Math.cos(angle) * facing.dir * (ability.spreadSpeed ?? 140),
        vy: Math.sin(angle) * (ability.spreadSpeed ?? 140),
        life: ability.spreadLife ?? 1.5,
        fromPlayer: true,
      });
    }
    return;
  }

  if (ability.kind === "blink") {
    const targetX = transform.x + facing.dir * (ability.forwardDistance ?? 48);
    const hitbox = player.get(Hitbox);
    if (hitbox && !collides(world, targetX, transform.y, hitbox.w, hitbox.h)) {
      player.set(Transform, { ...transform, x: targetX });
    }
  }
}
