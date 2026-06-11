import { describe, expect, it } from "vitest";
import { getMap } from "../../src/lib/content/registry";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { step } from "../../src/sim/tick";
import { IsNpc, NpcPatrol, Transform } from "../../src/sim/traits";

function findNpc(world: ReturnType<typeof createGameWorld>, charId: string) {
  return [...world.query(IsNpc)].find((entity) => entity.get(IsNpc)?.charId === charId);
}

function seconds(world: ReturnType<typeof createGameWorld>, amount: number) {
  for (let i = 0; i < Math.round(amount * 60); i++) step(world);
}

describe("content-authored NPC walking loops", () => {
  it("documents Tobin Bell's market patrol in map content", () => {
    const tobin = getMap("map:village").entities.find((entity) => entity.ref === "char:tobin-bell");
    expect(tobin?.patrol?.points).toEqual([
      { x: 520, y: 324 },
      { x: 560, y: 324 },
      { x: 560, y: 292 },
      { x: 520, y: 292 },
    ]);
    expect(tobin?.patrol?.speed).toBe(28);
  });

  it("attaches a patrol trait when a character spawn has patrol content", () => {
    const world = createGameWorld(41);
    instantiateMap(world, "map:village", { classId: "ranger" });
    const tobin = findNpc(world, "char:tobin-bell");

    expect(tobin?.get(NpcPatrol)?.points).toHaveLength(4);
    expect(tobin?.get(NpcPatrol)?.targetIndex).toBe(1);
  });

  it("uses Yuka steering to move patrol NPCs around their route deterministically", () => {
    const world = createGameWorld(41);
    instantiateMap(world, "map:village", { classId: "ranger" });
    const tobin = findNpc(world, "char:tobin-bell");
    const start = tobin?.get(Transform);

    seconds(world, 1);

    const after = tobin?.get(Transform);
    expect((after?.x ?? 0) - (start?.x ?? 0)).toBeGreaterThan(12);
    expect(Math.abs((after?.y ?? 0) - (start?.y ?? 0))).toBeLessThan(2);
    expect(tobin?.get(NpcPatrol)?.targetIndex).toBe(1);
  });
});
