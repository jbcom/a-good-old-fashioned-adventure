import { describe, expect, it } from "vitest";
import { enemies, incremental } from "../../src/lib/config";
import { getMap } from "../../src/lib/content/registry";
import { nodeRanks, rankCost } from "../../src/sim/incrementalProgress";
import { familyArchetypeIds } from "../harness/families";

const { nodes, root } = incremental.upgradeGraph;

/**
 * Topological depth from the root vow. Affordability follows the DEEPEST
 * prerequisite: a composite gated on two parents cannot be reached before
 * its later parent, so depth = 1 + max(prerequisite depths).
 */
function nodeDepths(): Map<string, number> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const depths = new Map<string, number>();
  const visiting = new Set<string>();
  const resolve = (id: string): number => {
    const known = depths.get(id);
    if (known !== undefined) return known;
    if (visiting.has(id)) throw new Error(`cycle through ${id}`);
    visiting.add(id);
    const node = byId.get(id);
    const prereqs = node?.prerequisites ?? [];
    const depth =
      id === root || prereqs.length === 0
        ? 0
        : 1 + Math.max(...prereqs.map((prereq) => resolve(prereq)));
    visiting.delete(id);
    depths.set(id, depth);
    return depth;
  };
  for (const node of nodes) resolve(node.id);
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

describe("S13.2 adversarial warband trade", () => {
  const familyNodes = nodes.filter((node) => node.enemyFamily);
  const warbands = familyNodes.filter((node) => (node.spawnBounty ?? 0) > 0);

  it("wires every bounty rank to spawned, tagged archetypes", () => {
    // an unconsumed family node is a dead purchase — exactly the bug S13.1
    // fixed. Every bounty family must tag at least one archetype, and the
    // start map must field one so the rank visibly changes a run. Families
    // without a bounty are taxonomy on rose majors and must still tag
    // something, but only count ranks (spawnBounty) reinforce — a major like
    // dragon-wake must never clone its boss.
    expect(warbands.length).toBeGreaterThan(0);
    const startMap = getMap(incremental.loop.startMap);
    for (const node of familyNodes) {
      const tagged = familyArchetypeIds(node.enemyFamily ?? "");
      expect(tagged.length, `${node.id} family ${node.enemyFamily} tags nothing`).toBeGreaterThan(
        0,
      );
      if (!(node.spawnBounty ?? 0)) continue;
      const fielded = startMap.entities.some(
        (entity) => entity.enemy && tagged.includes(entity.enemy),
      );
      expect(fielded, `${node.enemyFamily} has no spawn on ${incremental.loop.startMap}`).toBe(
        true,
      );
      expect(nodeRanks(node), `${node.id} bounty nodes are count ranks`).toBeGreaterThan(1);
    }
  });

  it("keeps every rank's payback gradual: bounded runs, no sharp edges", () => {
    const killReward = incremental.runRewards.enemyDefeated.base ?? 0;
    for (const node of warbands) {
      // one reinforcement dies once per run: marginal income per rank per run
      const marginal = killReward + (node.spawnBounty ?? 0);
      let previousPayback = 0;
      for (let owned = 0; owned < nodeRanks(node); owned++) {
        const payback = rankCost(node, owned).coins / marginal;
        expect(
          payback,
          `${node.id} rank ${owned + 1} takes ${payback.toFixed(1)} runs to pay back`,
        ).toBeLessThanOrEqual(12);
        if (previousPayback > 0) {
          expect(
            payback,
            `${node.id} rank ${owned + 1} payback spikes vs rank ${owned}`,
          ).toBeLessThanOrEqual(previousPayback * 2);
        }
        previousPayback = payback;
      }
    }
  });
});
