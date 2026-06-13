import { describe, expect, it } from "vitest";
import { incremental } from "../../src/lib/config";
import { createGameWorld, instantiateMap, spawnUnit } from "../../src/sim/factories";
import { getRail, nextRailPoint } from "../../src/sim/rail";
import { step } from "../../src/sim/tick";
import {
  CameraState,
  IncrementalProgress,
  IsEnemy,
  IsPlayer,
  Transform,
  WaveSpawned,
} from "../../src/sim/traits";

function quietField(seed = 61) {
  const world = createGameWorld(seed);
  instantiateMap(world, "map:rescue-route", { classId: "knight" });
  world.queryFirst(IsPlayer)?.destroy();
  for (const e of [...world.query(IsEnemy)]) e.destroy();
  return world;
}

/** Step with the waves muted: pure march mechanics under test. */
function quietStep(world: ReturnType<typeof createGameWorld>, frames: number) {
  for (let i = 0; i < frames; i++) {
    step(world, 1 / 60);
    for (const e of [...world.query(WaveSpawned)]) e.destroy();
  }
}

describe("S17.4 the rail", () => {
  it("orders the designed route south to north", () => {
    const rail = getRail("map:rescue-route");
    expect(rail.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < rail.length; i++) {
      expect(rail[i].y).toBeLessThan(rail[i - 1].y);
    }
    const south = { x: 0, y: 1000 };
    expect(nextRailPoint(rail, south)?.triggerId).toBe(rail[0].triggerId);
    expect(nextRailPoint(rail, { x: 0, y: rail[rail.length - 1].y - 10 })).toBeNull();
  });

  it("a unit with a quiet field marches the route north", () => {
    const world = quietField(61);
    const knight = spawnUnit(world, "knight", 140, 960);
    const y0 = knight.get(Transform)?.y ?? 0;
    quietStep(world, 60 * 3);
    expect(knight.get(Transform)?.y ?? 0).toBeLessThan(y0 - 60);
  });

  it("the front crossing a checkpoint banks roadTravelled with no player pawn", () => {
    const world = quietField(62);
    const perSegment = incremental.runRewards.roadTravelled.perSegment ?? 0;
    const coins = () => world.get(IncrementalProgress)?.coins ?? 0;
    const c0 = coins();
    const rail = getRail("map:rescue-route");

    const knight = spawnUnit(world, "knight", 140, 960);
    let banked = false;
    for (let i = 0; i < 60 * 20 && !banked; i++) {
      step(world, 1 / 60);
      for (const e of [...world.query(WaveSpawned)]) e.destroy();
      const y = knight.get(Transform)?.y ?? 1000;
      if (y <= rail[0].y) banked = coins() >= c0 + perSegment;
    }
    expect(banked).toBe(true);
  });

  it("the camera follows the front line when no player exists", () => {
    const world = quietField(63);
    spawnUnit(world, "knight", 140, 960);
    const cam0 = world.get(CameraState)?.y ?? 0;
    quietStep(world, 60 * 3);
    expect(world.get(CameraState)?.y ?? 0).toBeLessThan(cam0);
  });
});
