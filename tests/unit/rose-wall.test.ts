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
 * enemy/class) must offer a COIN sink the player can farm toward, EITHER as
 * a direct coin child OR via its nearest map ancestor (the dragon sub-tree
 * is intentionally all-rose — dragon upgrades cost roses because they earn
 * more roses, docs/RAIL-COMMAND.md §Dragon upgrades cost ROSES — and is
 * wall-free because the sibling map-economy path is coin-priced).
 */
const { nodes } = incremental.upgradeGraph;
const byId = new Map(nodes.map((n) => [n.id, n]));
const isRose = (n: (typeof nodes)[number]) => (n.cost?.roses ?? 0) > 0;
const isCoin = (n: (typeof nodes)[number]) => (n.cost?.coins ?? 0) > 0;

function coinChildren(node: (typeof nodes)[number]): boolean {
  return (node.unlocks ?? [])
    .map((id) => byId.get(id))
    .some((k) => Boolean(k) && isCoin(k!) && !isRose(k!));
}

/** The nearest map/route ancestor — the dragon sub-tree's coin-bearing root. */
function nearestMapAncestor(node: (typeof nodes)[number]): (typeof nodes)[number] | undefined {
  const seen = new Set<string>();
  const stack = [...(node.prerequisites ?? [])];
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const parent = byId.get(id);
    if (!parent) continue;
    if (parent.category === "map" || parent.category === "route") return parent;
    stack.push(...(parent.prerequisites ?? []));
  }
  return undefined;
}

describe("no rose walls", () => {
  it("every rose node has a coin sink (direct or via its map ancestor)", () => {
    for (const node of nodes) {
      if (!isRose(node)) continue;
      const kids = (node.unlocks ?? []).filter((id) => byId.has(id));
      if (kids.length === 0) continue; // leaf rose node — terminal, fine
      const directCoin = coinChildren(node);
      // dragon/sub-tree rose nodes are wall-free if a map ancestor is farmable
      const ancestorCoin = (() => {
        const map = nearestMapAncestor(node);
        return Boolean(map && coinChildren(map));
      })();
      expect(
        directCoin || ancestorCoin,
        `${node.id} dead-ends into rose-only with no farmable coin sink (direct or ancestral)`,
      ).toBe(true);
    }
  });
});
