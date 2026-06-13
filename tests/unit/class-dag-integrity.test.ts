import { describe, expect, it } from "vitest";
import { incremental } from "../../src/lib/config";

/**
 * DAG integrity (docs/RAIL-COMMAND.md §DAG alignment, user mandate
 * 2026-06-12): "each class is a node on a class DAG with branching off
 * into its own upgrades for that class. You wouldn't unlock stuff for the
 * knight before the knight itself." Every class-tagged upgrade node must
 * have a class-GRANTING ancestor for the same class — or be the starting
 * class (granted free at the root).
 */
const { nodes, root } = incremental.upgradeGraph;
const byId = new Map(nodes.map((n) => [n.id, n]));
const starting = incremental.classes.starting;
const grantsClass = (n: (typeof nodes)[number]) => Boolean(n.classId) && n.category === "class";

function hasClassAncestor(node: (typeof nodes)[number]): boolean {
  const seen = new Set<string>();
  const stack = [...(node.prerequisites ?? [])];
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const parent = byId.get(id);
    if (!parent) continue;
    if (grantsClass(parent) && parent.classId === node.classId) return true;
    stack.push(...(parent.prerequisites ?? []));
  }
  return false;
}

describe("class DAG integrity", () => {
  it("no class upgrade is reachable before its class node", () => {
    for (const node of nodes) {
      if (!node.classId || grantsClass(node) || node.classId === starting) continue;
      expect(
        hasClassAncestor(node),
        `${node.id} (${node.classId} upgrade) has no class-granting ancestor`,
      ).toBe(true);
    }
  });

  it("every class node chains back to the root", () => {
    for (const node of nodes) {
      if (!grantsClass(node)) continue;
      const seen = new Set<string>();
      const stack = [node.id];
      let reachesRoot = false;
      while (stack.length) {
        const id = stack.pop();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        if (id === root) {
          reachesRoot = true;
          break;
        }
        stack.push(...(byId.get(id)?.prerequisites ?? []));
      }
      expect(reachesRoot, `${node.id} does not chain to the root`).toBe(true);
    }
  });

  it("every unlockable class has exactly one class-granting node", () => {
    for (const classId of incremental.classes.unlockable) {
      const granters = nodes.filter((n) => grantsClass(n) && n.classId === classId);
      expect(
        granters.length,
        `${classId} needs exactly one class node, has ${granters.length}`,
      ).toBe(1);
    }
  });
});
