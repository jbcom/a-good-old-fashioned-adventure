import { describe, expect, it } from "vitest";
import { incremental } from "../../src/lib/config";

/**
 * No rose walls (user mandate 2026-06-12): "be very careful not to block a
 * sub-tree on roses — once you unlock a new node all of its children should
 * be coins. New maps, enemies, classes have increasing rose costs, but the
 * upgrades for each node should be coins, otherwise you could create a
 * situation where they get stuck or feel like they have to grind."
 *
 * The enforceable invariant: every rose node (a branching point — new map/
 * enemy/class) must offer at least one COIN child, so the player always has
 * a coin sink to farm toward and never dead-ends into a rose-only chain.
 */
const { nodes } = incremental.upgradeGraph;
const byId = new Map(nodes.map((n) => [n.id, n]));
const isRose = (n: (typeof nodes)[number]) => (n.cost?.roses ?? 0) > 0;
const isCoin = (n: (typeof nodes)[number]) => (n.cost?.coins ?? 0) > 0;

describe("no rose walls", () => {
  it("every rose node with children offers at least one coin child", () => {
    for (const node of nodes) {
      if (!isRose(node)) continue;
      const kids = (node.unlocks ?? []).map((id) => byId.get(id)).filter(Boolean) as typeof nodes;
      if (kids.length === 0) continue; // leaf rose node — terminal, fine
      const hasCoinChild = kids.some((k) => isCoin(k) && !isRose(k));
      expect(
        hasCoinChild,
        `${node.id} dead-ends into rose-only children (${kids.map((k) => k.id).join(", ")}) — add a coin sink`,
      ).toBe(true);
    }
  });
});
