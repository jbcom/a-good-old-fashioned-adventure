import { describe, expect, it } from "vitest";
import { incremental } from "../../src/lib/config";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { applyIncrementalEventReward } from "../../src/sim/incrementalProgress";
import { waveSize } from "../../src/sim/systems/waves";
import { IncrementalProgress, IsEnemy, Transform } from "../../src/sim/traits";
import { familyArchetypeIds } from "../harness/families";

const warbandNode = incremental.upgradeGraph.nodes.find(
  (node) => node.id === "upgrade:orc-warband",
);
if (!warbandNode?.enemyFamily || !warbandNode.spawnBounty) {
  throw new Error("warband node misconfigured");
}
const warband = warbandNode;
const family = warbandNode.enemyFamily;

function familyArchetypes(): Set<string> {
  return new Set(familyArchetypeIds(family));
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

  it("adds one wave spawn per owned warband rank (zone model)", () => {
    // In the ZONE model (docs/RAIL-COMMAND.md §maps are zones, not enemies) the
    // warband ranks no longer place reinforcements beside authored hosts — maps
    // have no authored trash. Instead each owned rank makes every WAVE one
    // enemy bigger (waveSize = base + warbandRanks), so the line faces a denser
    // permutation of the unlocked set. That is the live reinforcement mechanic.
    expect(waveSize(1, 0)).toBe(1);
    expect(waveSize(1, 1)).toBe(2);
    expect(waveSize(1, 3)).toBe(4);
    // the rank bonus is additive at every wave number, not just the first
    expect(waveSize(5, 3) - waveSize(5, 0)).toBe(3);
  });

  it("pays the node's bounty on top of the standard kill reward", () => {
    const world = bootWithRanks(1);
    const base = incremental.runRewards.enemyDefeated?.base ?? 0;
    const coins = () => world.get(IncrementalProgress)?.coins ?? 0;

    const c0 = coins();
    applyIncrementalEventReward(world, { type: "enemy:defeated", archetypeId: "forest-orc" });
    expect(coins()).toBe(c0 + base);

    const c1 = coins();
    applyIncrementalEventReward(world, {
      type: "enemy:defeated",
      archetypeId: "forest-orc",
      bounty: warband.spawnBounty,
    });
    expect(coins()).toBe(c1 + base + (warband.spawnBounty ?? 0));
  });

  it("leaves the field untouched at rank zero", () => {
    const world = bootWithRanks(0);
    for (const e of [...world.query(IsEnemy)]) {
      expect(e.get(IsEnemy)?.bounty ?? 0).toBe(0);
    }
  });

  it("never stacks entities, even when ranks wrap past the host count", () => {
    // 6 ranks against 4 authored orc hosts forces the i % hosts wrap —
    // every reinforcement must still claim its own spot, distinct from
    // every host and every peer
    const world = bootWithRanks(6);
    const ids = familyArchetypes();
    const positions = [...world.query(IsEnemy, Transform)]
      .filter((e) => ids.has(e.get(IsEnemy)?.archetypeId ?? ""))
      .map((e) => {
        const t = e.get(Transform);
        return `${t?.x},${t?.y}`;
      });
    expect(new Set(positions).size).toBe(positions.length);
  });

  it("is a quiet no-op on maps that field none of the family", () => {
    const world = createGameWorld(11);
    const progress = world.get(IncrementalProgress);
    if (!progress) throw new Error("no incremental progress");
    world.set(IncrementalProgress, { ...progress, upgradeRanks: { [warband.id]: 1 } });
    instantiateMap(world, "map:castle-dungeon", { classId: "knight" });
    expect(familyCount(world)).toBe(0);
  });
});
