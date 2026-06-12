import { describe, expect, it } from "vitest";
import { enemies, incremental } from "../../src/lib/config";
import { collides } from "../../src/sim/collision";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { applyIncrementalEventReward } from "../../src/sim/incrementalProgress";
import { IncrementalProgress, IsEnemy, Transform } from "../../src/sim/traits";

const warbandNode = incremental.upgradeGraph.nodes.find(
  (node) => node.id === "upgrade:orc-warband",
);
if (!warbandNode?.enemyFamily || !warbandNode.spawnBounty) {
  throw new Error("warband node misconfigured");
}
const warband = warbandNode;
const family = warband.enemyFamily;

function familyArchetypes(): Set<string> {
  return new Set(
    Object.entries(enemies.archetypes)
      .filter(([, archetype]) => archetype.family === family)
      .map(([id]) => id),
  );
}

function bootWithRanks(ranks: number, seed = 7) {
  const world = createGameWorld(seed);
  const progress = world.get(IncrementalProgress);
  if (!progress) throw new Error("no incremental progress");
  world.set(IncrementalProgress, {
    ...progress,
    upgradeRanks: ranks > 0 ? { [warband.id]: ranks } : {},
  });
  instantiateMap(world, "map:rescue-route", { classId: "knight" });
  return world;
}

function familyCount(world: ReturnType<typeof createGameWorld>): number {
  const ids = familyArchetypes();
  return [...world.query(IsEnemy)].filter((e) => ids.has(e.get(IsEnemy)?.archetypeId ?? "")).length;
}

describe("S13.1 warband ranks reinforce the field", () => {
  it("tags the route orcs with the warband family", () => {
    expect(familyArchetypes().size).toBeGreaterThan(0);
  });

  it("adds one family spawn per owned rank", () => {
    const baseline = familyCount(bootWithRanks(0));
    expect(baseline).toBeGreaterThan(0);
    expect(familyCount(bootWithRanks(1))).toBe(baseline + 1);
    expect(familyCount(bootWithRanks(3))).toBe(baseline + 3);
  });

  it("places reinforcements deterministically on walkable ground near their hosts", () => {
    const read = () =>
      [...bootWithRanks(3).query(IsEnemy, Transform)]
        .filter((e) => (e.get(IsEnemy)?.bounty ?? 0) > 0)
        .map((e) => {
          const t = e.get(Transform);
          return `${t?.x},${t?.y}`;
        })
        .sort();
    const first = read();
    expect(first).toHaveLength(3);
    expect(read()).toEqual(first);

    const world = bootWithRanks(3);
    for (const e of [...world.query(IsEnemy, Transform)]) {
      const info = e.get(IsEnemy);
      if ((info?.bounty ?? 0) <= 0) continue;
      const t = e.get(Transform);
      const hitbox = enemies.archetypes[info?.archetypeId ?? ""].hitbox;
      expect(collides(world, t?.x ?? 0, t?.y ?? 0, hitbox.w, hitbox.h)).toBe(false);
    }
  });

  it("pays the node's bounty on top of the standard kill reward", () => {
    const world = bootWithRanks(1);
    const base = incremental.runRewards.enemyDefeated?.base ?? 0;
    const coins = () => world.get(IncrementalProgress)?.coins ?? 0;

    const c0 = coins();
    applyIncrementalEventReward(world, "enemy:defeated", "forest-orc");
    expect(coins()).toBe(c0 + base);

    const c1 = coins();
    applyIncrementalEventReward(world, "enemy:defeated", "forest-orc", warband.spawnBounty);
    expect(coins()).toBe(c1 + base + (warband.spawnBounty ?? 0));
  });

  it("leaves the field untouched at rank zero", () => {
    const world = bootWithRanks(0);
    for (const e of [...world.query(IsEnemy)]) {
      expect(e.get(IsEnemy)?.bounty ?? 0).toBe(0);
    }
  });
});
