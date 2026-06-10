import { describe, expect, it } from "vitest";
import {
  createGameWorld,
  instantiateMap,
  spawnChest,
  spawnEnemy,
  spawnPickup,
} from "../../src/sim/factories";
import { applyItemPickup, playerAbility, playerAttack } from "../../src/sim/systems/combat";
import { step } from "../../src/sim/tick";
import {
  CombatTimers,
  FlagState,
  Health,
  IsEnemy,
  IsPickup,
  IsPlayer,
  Level,
  LootContainer,
  Outbox,
  PlayerGold,
  Projectile,
  ShieldState,
  Transform,
} from "../../src/sim/traits";

function arena(classId = "knight") {
  // castle-dungeon spawn area is open floor — a clean arena
  const world = createGameWorld(5);
  instantiateMap(world, "map:castle-dungeon", { classId });
  const player = world.queryFirst(IsPlayer);
  if (!player) throw new Error("no player");
  // clear the stock cast for controlled scenarios
  for (const e of [...world.query(IsEnemy)]) e.destroy();
  return { world, player };
}

describe("melee", () => {
  it("kills an orc in range, drops xp, emits enemy:defeated, respects cooldown", () => {
    const { world, player } = arena("knight");
    player.set(Transform, { x: 100, y: 100 });
    const orc = spawnEnemy(world, "orc-scout", 115, 100); // hp 15 < melee 14? 10+1*4=14 -> 2 hits
    playerAttack(world);
    expect(orc.get(Health)?.hp).toBe(1);

    playerAttack(world); // cooldown blocks
    expect(orc.get(Health)?.hp).toBe(1);

    player.set(CombatTimers, { attack: 0, dash: 0, dashCooldown: 0, iframes: 0 });
    playerAttack(world);
    expect([...world.query(IsEnemy)]).toHaveLength(0);
    const drops = [...world.query(IsPickup)].map((e) => e.get(IsPickup)?.itemId);
    expect(drops).toContain("item:xp-orb");
  });

  it("opens a chest with the swing", () => {
    const { world, player } = arena("knight");
    player.set(Transform, { x: 100, y: 100 });
    const chest = spawnChest(world, 118, 100, "Gold");
    playerAttack(world);
    expect(chest.get(LootContainer)?.opened).toBe(true);
    expect(player.get(PlayerGold)?.value).toBe(50);
  });
});

describe("projectile classes", () => {
  it("wizard bolt flies and damages on contact", () => {
    const { world, player } = arena("wizard");
    player.set(Transform, { x: 100, y: 100 });
    const skeleton = spawnEnemy(world, "crypt-skeleton", 180, 94);
    skeleton.set(Transform, { x: 180, y: 94 });
    playerAttack(world);
    expect([...world.query(Projectile)]).toHaveLength(1);
    for (let i = 0; i < 60; i++) step(world);
    expect(skeleton.get(Health)?.hp).toBe(35 - (8 + 3)); // arrow formula at level 1
    expect([...world.query(Projectile)]).toHaveLength(0);
  });

  it("ranger leap fires a 3-arrow spread and starts iframes", () => {
    const { world, player } = arena("ranger");
    player.set(Transform, { x: 200, y: 200 });
    playerAbility(world, true);
    expect([...world.query(Projectile)]).toHaveLength(3);
    expect(player.get(CombatTimers)?.iframes).toBeCloseTo(0.25, 5);
    expect(player.get(Transform)?.x).toBe(200 - 45);
  });
});

describe("shield", () => {
  it("deflects enemy projectiles while held", () => {
    const { world, player } = arena("knight");
    player.set(Transform, { x: 100, y: 100 });
    playerAbility(world, true);
    expect(player.get(ShieldState)?.active).toBe(true);

    // enemy bolt heading at the player
    const before = player.get(Health)?.hp;
    const outboxBefore = world.get(Outbox)?.sfx.length ?? 0;
    spawnProjectileAt(world, 108, 100, -60);
    step(world);
    expect(player.get(Health)?.hp).toBe(before);
    expect(world.get(Outbox)?.sfx.length ?? 0).toBeGreaterThan(outboxBefore);

    playerAbility(world, false);
    spawnProjectileAt(world, 108, 100, -60);
    step(world);
    expect(player.get(Health)?.hp).toBe((before ?? 0) - 15);
  });
});

import { spawnProjectile } from "../../src/sim/factories";

function spawnProjectileAt(
  world: ReturnType<typeof createGameWorld>,
  x: number,
  y: number,
  vx: number,
) {
  spawnProjectile(world, { type: "magmaball", x, y, vx, vy: 0, life: 1, fromPlayer: false });
}

describe("touch damage and iframes", () => {
  it("ticks 10 damage with 0.5s iframes, not per-frame", () => {
    const { world, player } = arena("knight");
    player.set(Transform, { x: 100, y: 100 });
    const skeleton = spawnEnemy(world, "crypt-skeleton", 104, 100);
    // pin both in place: no AI yet, just overlap
    step(world);
    expect(player.get(Health)?.hp).toBe(90);
    for (let i = 0; i < 10; i++) step(world);
    expect(player.get(Health)?.hp).toBe(90); // still inside iframes
    for (let i = 0; i < 25; i++) step(world); // past 0.5s
    expect(player.get(Health)?.hp).toBe(80);
    skeleton.destroy();
  });

  it("death sets gameover in the outbox", () => {
    const { world, player } = arena("knight");
    player.set(Transform, { x: 100, y: 100 });
    player.set(Health, { hp: 5, maxHp: 100 });
    spawnEnemy(world, "crypt-skeleton", 104, 100);
    step(world);
    expect(world.get(Outbox)?.endGame).toBe("gameover");
  });
});

describe("items and progression", () => {
  it("xp pickup levels up: maxHp +10, full heal, nextXp *1.5", () => {
    const { world, player } = arena("knight");
    player.set(Health, { hp: 40, maxHp: 100 });
    applyItemPickup(world, "item:xp-orb", 50);
    expect(player.get(Level)).toMatchObject({ level: 2, xp: 0, nextXp: 75 });
    expect(player.get(Health)).toMatchObject({ hp: 110, maxHp: 110 });
    expect(world.get(Outbox)?.sfx).toContain("levelUp");
  });

  it("dungeon key sets the gate flag and emits item:acquired", () => {
    const { world, player } = arena("knight");
    player.set(Transform, { x: 100, y: 100 });
    spawnPickup(world, "item:dungeon-key", 102, 100);
    step(world);
    expect(world.get(FlagState)?.values["flag:has-dungeon-key"]).toBe(true);
    expect([...world.query(IsPickup)]).toHaveLength(0);
  });
});
