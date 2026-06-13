import { describe, expect, it } from "vitest";
import { incremental } from "../../src/lib/config";
import { sanitizeIncrementalProgress } from "../../src/sim/incrementalProgress";
import { currentMap, princessMap, spineComplete } from "../../src/sim/mapProgression";

/**
 * Map DAG (docs/RAIL-COMMAND.md §Map DAG — no jumping): runs play the
 * furthest UNLOCKED map (strictly successive — no map-jumping), and the
 * princess sits at the last unlocked map until the castle relocates her.
 */
function withPacks(packIds: string[], upgrades: string[] = ["upgrade:first-vow"]) {
  return sanitizeIncrementalProgress(
    { unlockedRoutePackIds: packIds, purchasedUpgradeIds: upgrades },
    0,
  );
}

describe("map progression", () => {
  it("a fresh player plays only the start map", () => {
    const p = withPacks([]);
    expect(currentMap(p)).toBe(incremental.loop.startMap);
    expect(princessMap(p)).toBe(incremental.loop.startMap);
  });

  it("advances the frontier one map per unlocked pack — no jumping", () => {
    // unlocking deep-forest's pack without oldwood does NOT skip ahead
    expect(currentMap(withPacks(["deep-forest"]))).toBe(incremental.loop.startMap);
    // the successive chain advances the frontier
    expect(currentMap(withPacks(["oldwood"]))).toBe("map:oldwood-forest");
    expect(currentMap(withPacks(["oldwood", "deep-forest"]))).toBe("map:deep-forest");
  });

  it("the princess follows the frontier", () => {
    expect(princessMap(withPacks(["oldwood"]))).toBe("map:oldwood-forest");
  });

  it("the castle node relocates the princess to the castle", () => {
    const p = withPacks(
      ["oldwood", "deep-forest", "sunken-road", "castle-approach", "castle-interior"],
      ["upgrade:first-vow", incremental.mapDag.castleNode],
    );
    expect(princessMap(p)).toBe(incremental.mapDag.castleMap);
    expect(spineComplete(p)).toBe(true);
  });
});
