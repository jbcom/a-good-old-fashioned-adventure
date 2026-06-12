import { describe, expect, it } from "vitest";
import { deployUnit, remainingFor, resetDeployments } from "../../src/sim/deploy";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { getRail } from "../../src/sim/rail";
import { IncrementalProgress, IsPlayer, IsUnit, Transform } from "../../src/sim/traits";

function field(seed = 71) {
  const world = createGameWorld(seed);
  instantiateMap(world, "map:rescue-route", { classId: "knight" });
  world.queryFirst(IsPlayer)?.destroy();
  return world;
}

describe("S17.5 toolbox deployment", () => {
  it("the starting roster fields exactly one knight", () => {
    const world = field(71);
    expect(remainingFor(world, "knight")).toBe(1);
    expect(remainingFor(world, "ranger")).toBe(0); // locked class: no slots

    const knight = deployUnit(world, "knight");
    expect(knight).not.toBeNull();
    expect([...world.query(IsUnit)]).toHaveLength(1);
    expect(remainingFor(world, "knight")).toBe(0);
    expect(deployUnit(world, "knight")).toBeNull(); // roster spent
  });

  it("drops land on the rail band south of the line", () => {
    const world = field(72);
    const rail = getRail("map:rescue-route");
    const knight = deployUnit(world, "knight");
    const t = knight?.get(Transform);
    expect(t?.y ?? 0).toBeGreaterThan(rail[0].y); // south of the first checkpoint
    expect(Math.abs((t?.x ?? 0) - rail[0].x)).toBeLessThan(48);
  });

  it("unlocked classes add slots and a new run restores them", () => {
    const world = field(73);
    const progress = world.get(IncrementalProgress);
    if (!progress) throw new Error("no progress");
    world.set(IncrementalProgress, {
      ...progress,
      unlockedClassIds: ["knight", "ranger"],
    });
    expect(remainingFor(world, "ranger")).toBe(1);
    deployUnit(world, "ranger");
    expect(remainingFor(world, "ranger")).toBe(0);

    resetDeployments(world);
    expect(remainingFor(world, "ranger")).toBe(1);
  });
});
