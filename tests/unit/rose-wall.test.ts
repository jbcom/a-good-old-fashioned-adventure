import { describe, expect, it } from "vitest";
import { incremental } from "../../src/lib/config";

/**
 * No rose walls (user mandate 2026-06-12): "be very careful not to block a
 * sub-tree on roses … otherwise you could create a situation where they get
 * stuck or feel like they have to grind." Later refined into the
 * three-currency flywheel: "what if dragons could be unlocked by either an
 * increasing number of roses OR a big painfully increasing number of gems …
 * that makes roses a shortcut but not a hardblock."
 *
 * The enforceable invariant: every rose node must have an always-farmable
 * escape so it is never a hard deadlock. Three ways a rose node qualifies:
 *   1. OR-cost — it also carries a GEM price (the dragon-track dual cost).
 *      Gems are always farmable off any felled kin, so a gem alternative is
 *      by itself a complete anti-block guarantee (docs/RAIL-COMMAND.md
 *      §dual-cost / §anti-block guarantee).
 *   2. A direct COIN child to farm toward.
 *   3. A coin sink via its nearest map/route ancestor.
 */
const { nodes } = incremental.upgradeGraph;
const byId = new Map(nodes.map((n) => [n.id, n]));
const isRose = (n: (typeof nodes)[number]) => (n.cost?.roses ?? 0) > 0;
const isCoin = (n: (typeof nodes)[number]) => (n.cost?.coins ?? 0) > 0;
/** OR-cost: a rose node that also lists a gem price is never a hard wall. */
const hasGemAlternative = (n: (typeof nodes)[number]) => (n.cost?.gems ?? 0) > 0;

function coinChildren(node: (typeof nodes)[number]): boolean {
  return (node.unlocks ?? [])
    .map((id) => byId.get(id))
    .filter((k): k is (typeof nodes)[number] => Boolean(k))
    .some((k) => isCoin(k) && !isRose(k));
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
      // OR-cost dragon-track nodes carry a gem fallback — never a hard wall.
      if (hasGemAlternative(node)) continue;
      const kids = (node.unlocks ?? []).filter((id) => byId.has(id));
      if (kids.length === 0) continue; // leaf rose node — terminal, fine
      const directCoin = coinChildren(node);
      // sub-tree rose nodes are wall-free if a map ancestor is farmable
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
