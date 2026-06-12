import { describe, expect, it } from "vitest";
import { enemies, incremental } from "../../src/lib/config";
import { getMap } from "../../src/lib/content/registry";
import { nodeRanks, rankCost } from "../../src/sim/incrementalProgress";

const { nodes, root } = incremental.upgradeGraph;

/** Topological depth of each node from the root vow (prerequisite chain length). */
function nodeDepths(): Map<string, number> {
  const depths = new Map<string, number>([[root, 0]]);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const queue = [root];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    const depth = depths.get(id) ?? 0;
    for (const next of byId.get(id)?.unlocks ?? []) {
      if (!depths.has(next)) {
        depths.set(next, depth + 1);
        queue.push(next);
      }
    }
  }
  return depths;
}

/**
 * Expected coin income for one ordinary run at a given graph depth: the
 * baseline route's trash bounties plus one miniboss purse per depth tier the
 * player has opened. Deliberately conservative — real runs also drop hearts,
 * pay first-clear roses, and bank elite bonuses.
 */
function runIncomeAtDepth(depth: number): number {
  const startMap = getMap(incremental.loop.startMap);
  const guardian = "dragon-guardian";
  const trashCount = startMap.entities.filter(
    (entity) => entity.enemy && entity.enemy !== guardian,
  ).length;
  const trashIncome = trashCount * (incremental.runRewards.enemyDefeated.base ?? 0);
  const purse = incremental.runRewards.minibossDefeated.base ?? 0;
  return trashIncome + Math.max(0, depth) * purse;
}

describe("S9.10 no-sharp-edges balance budget", () => {
  const depths = nodeDepths();

  it("reaches every node from the root", () => {
    for (const node of nodes) {
      expect(depths.has(node.id), `${node.id} unreachable from root`).toBe(true);
    }
  });

  it("keeps every coin rank affordable within three runs at its depth", () => {
    for (const node of nodes) {
      if ((node.cost.coins ?? 0) <= 0) continue;
      const depth = depths.get(node.id) ?? 0;
      const income = runIncomeAtDepth(depth);
      for (let owned = 0; owned < nodeRanks(node); owned++) {
        const price = rankCost(node, owned).coins;
        expect(
          price,
          `${node.id} rank ${owned + 1} costs ${price} vs ~${income}/run at depth ${depth}`,
        ).toBeLessThanOrEqual(income * 3);
      }
    }
  });

  it("keeps the first rank of every coin track within one run of income", () => {
    for (const node of nodes) {
      if ((node.cost.coins ?? 0) <= 0 || nodeRanks(node) <= 1) continue;
      const depth = depths.get(node.id) ?? 0;
      expect(
        rankCost(node, 0).coins,
        `${node.id} first rank must fit one run at depth ${depth}`,
      ).toBeLessThanOrEqual(runIncomeAtDepth(depth));
    }
  });

  it("prices every rose major within its depth's rescue ladder", () => {
    const rescueRoses = incremental.runRewards.princessRescued.base ?? 0;
    for (const node of nodes) {
      const roses = node.cost.roses ?? 0;
      if (roses <= 0) continue;
      const depth = Math.max(1, depths.get(node.id) ?? 1);
      expect(roses, `${node.id} asks ${roses} roses at depth ${depth}`).toBeLessThanOrEqual(
        depth * rescueRoses,
      );
    }
  });

  it("makes depth pay: minibosses outearn trash and threat climbs with tier", () => {
    const trashBounty = incremental.runRewards.enemyDefeated.base ?? 0;
    const purse = incremental.runRewards.minibossDefeated.base ?? 0;
    expect(purse).toBeGreaterThanOrEqual(trashBounty * 3);

    const tiers = [...enemies.difficultyCurve].sort((a, b) => a.tier - b.tier);
    for (let i = 1; i < tiers.length; i++) {
      expect(
        tiers[i].threat,
        `${tiers[i].id} must out-threaten ${tiers[i - 1].id}`,
      ).toBeGreaterThan(tiers[i - 1].threat);
    }
  });
});
