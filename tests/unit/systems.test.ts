import { describe, expect, it } from "vitest";
import { player as playerConfig } from "../../src/lib/config";
import { collides, isSolidTileAt } from "../../src/sim/collision";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { createRng } from "../../src/sim/rng";
import { SIM_DT, step } from "../../src/sim/tick";
import {
  CameraState,
  CombatTimers,
  FlagState,
  IsPlayer,
  MoveIntent,
  Transform,
} from "../../src/sim/traits";

function worldWithPlayer(classId = "knight") {
  const world = createGameWorld(7);
  instantiateMap(world, "map:overworld", { classId });
  const player = world.queryFirst(IsPlayer);
  if (!player) throw new Error("no player");
  return { world, player };
}

describe("collision", () => {
  const { world } = worldWithPlayer();

  it("open grass is walkable, mountains/water are solid", () => {
    expect(isSolidTileAt(world, 80, 190)).toBe(false);
    expect(isSolidTileAt(world, 8, 8)).toBe(true); // border mountain
    expect(isSolidTileAt(world, 32 * 16 + 8, 24 * 16 + 8)).toBe(true); // river
  });

  it("the castle gate is conditionally solid on the dungeon key flag", () => {
    const gateX = 64 * 16 + 8;
    const gateY = 24 * 16 + 8;
    expect(isSolidTileAt(world, gateX, gateY)).toBe(true);
    const flags = world.get(FlagState);
    world.set(FlagState, {
      values: { ...flags?.values, "flag:has-dungeon-key": true },
    });
    expect(isSolidTileAt(world, gateX, gateY)).toBe(false);
  });

  it("4-point probe collides when any corner is solid", () => {
    expect(collides(world, 32 * 16 - 6, 24 * 16, 12, 12)).toBe(true);
    expect(collides(world, 80, 190, 10, 10)).toBe(false);
  });
});

describe("movement", () => {
  it("moves the player by speed*dt and updates facing", () => {
    const { world, player } = worldWithPlayer();
    player.set(MoveIntent, { x: -1, y: 0 });
    step(world);
    const t = player.get(Transform);
    expect(t?.x).toBeCloseTo(80 - playerConfig.movement.speed * SIM_DT, 5);
    expect(t?.y).toBe(190);
  });

  it("normalizes diagonal intent", () => {
    const { world, player } = worldWithPlayer();
    player.set(MoveIntent, { x: 1, y: 1 });
    step(world);
    const t = player.get(Transform);
    const per = (playerConfig.movement.speed * SIM_DT) / Math.SQRT2;
    expect(t?.x).toBeCloseTo(80 + per, 5);
    expect(t?.y).toBeCloseTo(190 + per, 5);
  });

  it("blocks at the river", () => {
    const { world, player } = worldWithPlayer();
    player.set(Transform, { x: 32 * 16 - 10, y: 24 * 16 + 8 });
    player.set(MoveIntent, { x: 1, y: 0 });
    for (let i = 0; i < 120; i++) step(world);
    const t = player.get(Transform);
    expect(t?.x).toBeLessThan(32 * 16 - 5); // never crossed into the water column
  });

  it("clamps to world bounds", () => {
    const { world, player } = worldWithPlayer();
    player.set(Transform, { x: 20, y: 20 });
    player.set(MoveIntent, { x: -1, y: -1 });
    for (let i = 0; i < 300; i++) step(world);
    const t = player.get(Transform);
    expect(t?.x).toBeGreaterThanOrEqual(8);
    expect(t?.y).toBeGreaterThanOrEqual(16);
  });
});

describe("camera", () => {
  it("lerps toward the player and decays shake deterministically", () => {
    const { world, player } = worldWithPlayer();
    player.set(Transform, { x: 200, y: 300 });
    world.set(CameraState, { x: 80, y: 190, shake: 0 });
    step(world);
    const cam = world.get(CameraState);
    expect(cam?.x).toBeCloseTo(80 + (200 - 80) * 0.12, 5);
    expect(cam?.y).toBeCloseTo(190 + (300 - 190) * 0.12, 5);

    world.set(CameraState, { x: 200, y: 300, shake: 6 });
    step(world);
    expect(world.get(CameraState)?.shake).toBeCloseTo(6 * 0.9, 5);
  });
});

describe("timers", () => {
  it("decrement toward zero and never go negative", () => {
    const { world, player } = worldWithPlayer();
    player.set(CombatTimers, { attack: 0.02, dash: 0, dashCooldown: 1, iframes: 0.01 });
    step(world);
    step(world);
    const t = player.get(CombatTimers);
    expect(t?.attack).toBe(0);
    expect(t?.iframes).toBe(0);
    expect(t?.dashCooldown).toBeCloseTo(1 - 2 * SIM_DT, 5);
  });
});

describe("rng determinism", () => {
  it("same seed, same stream", () => {
    const a = createRng(123);
    const b = createRng(123);
    const seqA = [a.next(), a.next(), a.int(0, 100), a.chance(0.5)];
    const seqB = [b.next(), b.next(), b.int(0, 100), b.chance(0.5)];
    expect(seqA).toEqual(seqB);
  });
});
