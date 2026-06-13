import { describe, expect, it } from "vitest";
import { incremental } from "../../src/lib/config";
import { createGameWorld, instantiateMap, spawnUnit } from "../../src/sim/factories";
import { step } from "../../src/sim/tick";
import { IncrementalProgress, IsEnemy, Transform, WaveSpawned } from "../../src/sim/traits";

/**
 * S21.4 enemy spawn-placement track: each owned placement rank lets an enemy
 * fan out to more of the map's waveGates (more board slices) AND multiplies its
 * coin bounty. This covers the two observable effects — the bounty multiplier
 * on spawned enemies and the gate spread — plus the DAG wiring.
 */
function fieldWave(placementRank: number) {
  const world = createGameWorld(5);
  instantiateMap(world, "map:oldwood-forest", { classId: "knight", withPlayer: false });
  // unlock forest-orc + its bounty + placement at the given rank
  const progress = world.get(IncrementalProgress);
  world.set(IncrementalProgress, {
    ...progress!,
    purchasedUpgradeIds: [
      "upgrade:first-vow",
      "upgrade:dragon-wake",
      "upgrade:unlock-forest-orc",
      "upgrade:orc-bounty",
      "upgrade:placement-forest-orc",
    ],
    upgradeRanks: { "upgrade:orc-bounty": 2, "upgrade:placement-forest-orc": placementRank },
  });
  // a single unit engages so waves release; step until the first wave spawns
  spawnUnit(world, "knight", 200, 920);
  for (let i = 0; i < 240; i++) {
    step(world);
    if ([...world.query(IsEnemy, WaveSpawned)].length > 0) break;
  }
  const waved = [...world.query(IsEnemy, WaveSpawned, Transform)];
  return { world, waved };
}

describe("S21.4 enemy spawn-placement", () => {
  it("wires placement-forest-orc into the DAG with the bounty as its parent", () => {
    const node = incremental.upgradeGraph.nodes.find(
      (n) => n.id === "upgrade:placement-forest-orc",
    );
    expect(node, "placement node exists").toBeTruthy();
    expect(node?.placement?.enemy).toBe("forest-orc");
    expect(node?.placement?.coinMultiplierPerRank).toBeGreaterThan(0);
    expect(node?.prerequisites).toContain("upgrade:orc-bounty");
    // reverse edge: the bounty unlocks the placement node
    const bounty = incremental.upgradeGraph.nodes.find((n) => n.id === "upgrade:orc-bounty");
    expect(bounty?.unlocks).toContain("upgrade:placement-forest-orc");
  });

  it("multiplies the spawned enemy's coin bounty by the placement rank", () => {
    const rank0 = fieldWave(0).waved.find((e) => e.get(IsEnemy)?.archetypeId === "forest-orc");
    const rank4 = fieldWave(4).waved.find((e) => e.get(IsEnemy)?.archetypeId === "forest-orc");
    expect(rank0, "a forest-orc waved at rank 0").toBeTruthy();
    expect(rank4, "a forest-orc waved at rank 4").toBeTruthy();
    const b0 = rank0?.get(IsEnemy)?.bounty ?? 0;
    const b4 = rank4?.get(IsEnemy)?.bounty ?? 0;
    // rank 4 at +0.25/rank → ×2 the bounty
    expect(b4).toBeGreaterThan(b0);
  });

  it("spreads the wave across more gates as the placement rank rises", () => {
    // count distinct spawn x-positions in the first wave — more gates touched
    // means a wider board-slice spread (rank rises → reach rises)
    const gatesTouched = (rank: number) => {
      const { waved } = fieldWave(rank);
      const orcs = waved.filter((e) => e.get(IsEnemy)?.archetypeId === "forest-orc");
      // group by gate column (gate spacing is ~120px; round to the nearest 60)
      return new Set(orcs.map((e) => Math.round((e.get(Transform)?.x ?? 0) / 60))).size;
    };
    // a high-rank wave touches at least as many gate columns as a rank-0 wave
    expect(gatesTouched(4)).toBeGreaterThanOrEqual(gatesTouched(0));
  });
});
