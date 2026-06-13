import { describe, expect, it } from "vitest";
import { checkpointBonus, sanitizeIncrementalProgress } from "../../src/sim/incrementalProgress";

/**
 * Economy upgrade payoff (S19.1a finding, no-rose-wall fix): checkpoint-
 * bonus ranks richen the per-segment roadTravelled coin payout, giving the
 * map-unlock rose nodes their mandated coin sink.
 */
describe("checkpoint bonus", () => {
  it("is zero with no economy ranks", () => {
    expect(checkpointBonus(sanitizeIncrementalProgress({}, 0))).toBe(0);
  });

  it("sums owned economy ranks (thornwood tithe +2/rank)", () => {
    const progress = sanitizeIncrementalProgress(
      {
        purchasedUpgradeIds: ["upgrade:first-vow", "upgrade:thornwood-tithe"],
        upgradeRanks: { "upgrade:thornwood-tithe": 3 },
      },
      0,
    );
    expect(checkpointBonus(progress)).toBe(6);
  });
});
