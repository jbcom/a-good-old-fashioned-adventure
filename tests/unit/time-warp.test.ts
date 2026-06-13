import { describe, expect, it } from "vitest";
import { initialIncrementalProgress } from "../../src/sim/incrementalProgress";
import { clampScale, nextTier, unlockedTiers } from "../../src/sim/timeWarp";
import type { IncrementalProgressState } from "../../src/sim/traits";

/**
 * Battle fast-forward tiers (user mandate 2026-06-12): 1x always; 5x with
 * the Battle Tempo major; 10x/50x/100x with Tempo Mastery connector ranks
 * 1/2/3. The resolver is pure config; tests force any state.
 */

function progressWith(ids: string[], ranks: Record<string, number> = {}): IncrementalProgressState {
  return { ...initialIncrementalProgress(0), purchasedUpgradeIds: ids, upgradeRanks: ranks };
}

describe("time warp tiers", () => {
  it("a fresh run has only 1x", () => {
    const tiers = unlockedTiers(initialIncrementalProgress(0));
    expect(tiers.map((t) => t.scale)).toEqual([1]);
  });

  it("the Battle Tempo major opens 5x", () => {
    const tiers = unlockedTiers(progressWith(["upgrade:first-vow", "upgrade:battle-tempo"]));
    expect(tiers.map((t) => t.scale)).toEqual([1, 5]);
  });

  it("Tempo Mastery ranks open 10x / 50x / 100x in order", () => {
    const owned = ["upgrade:first-vow", "upgrade:battle-tempo", "upgrade:tempo-mastery"];
    expect(
      unlockedTiers(progressWith(owned, { "upgrade:tempo-mastery": 1 })).map((t) => t.scale),
    ).toEqual([1, 5, 10]);
    expect(
      unlockedTiers(progressWith(owned, { "upgrade:tempo-mastery": 2 })).map((t) => t.scale),
    ).toEqual([1, 5, 10, 50]);
    expect(
      unlockedTiers(progressWith(owned, { "upgrade:tempo-mastery": 3 })).map((t) => t.scale),
    ).toEqual([1, 5, 10, 50, 100]);
  });

  it("cycling wraps through the unlocked tiers", () => {
    const p = progressWith(["upgrade:first-vow", "upgrade:battle-tempo"]);
    expect(nextTier(p, 1).scale).toBe(5);
    expect(nextTier(p, 5).scale).toBe(1);
  });

  it("clampScale falls back to 1x when a tier is no longer unlocked", () => {
    expect(clampScale(initialIncrementalProgress(0), 50)).toBe(1);
    expect(clampScale(progressWith(["upgrade:first-vow", "upgrade:battle-tempo"]), 5)).toBe(5);
  });
});
