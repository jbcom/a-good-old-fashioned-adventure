import { describe, expect, it } from "vitest";
import { incremental } from "../../src/lib/config";
import { initialIncrementalProgress, roseLoopHint } from "../../src/sim/incrementalProgress";

/**
 * Rose-loop discoverability nudge (docs/BALANCE-PLAYTESTS.md §N1): the hint
 * fires only when a dragon-kin node is REACHED but unowned, so a gems-first
 * player discovers the dragon track instead of never finding it.
 */
describe("rose-loop hint", () => {
  it("is silent before any dragon-kin node is reachable", () => {
    const fresh = initialIncrementalProgress();
    expect(roseLoopHint(fresh)).toBe("");
  });

  // the EARLIEST kin node — its prerequisites contain no other dragon-kin node
  const nodes = incremental.upgradeGraph.nodes;
  const kinIds = new Set(nodes.filter((n) => n.dragonKin).map((n) => n.id));
  const firstKin = nodes.find((n) => n.dragonKin && !n.prerequisites.some((p) => kinIds.has(p)));

  it("fires when the first dragon-kin node is reached but unowned", () => {
    if (!firstKin) throw new Error("no first kin node");
    const reached = {
      ...initialIncrementalProgress(),
      // its direct prerequisites met (dragon-wake → first-vow), kin unbought
      purchasedUpgradeIds: [
        ...initialIncrementalProgress().purchasedUpgradeIds,
        ...firstKin.prerequisites,
      ],
    };
    expect(roseLoopHint(reached)).toContain("rose flywheel");
  });

  it("goes silent once a kin is owned", () => {
    if (!firstKin) throw new Error("no first kin node");
    const owned = {
      ...initialIncrementalProgress(),
      purchasedUpgradeIds: [
        ...initialIncrementalProgress().purchasedUpgradeIds,
        ...firstKin.prerequisites,
        firstKin.id,
      ],
    };
    expect(roseLoopHint(owned)).toBe("");
  });
});
