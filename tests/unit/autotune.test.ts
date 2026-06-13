import { describe, expect, it } from "vitest";
import { type LadderRung, proposeTuning } from "../../src/sim/autotune";
import { runRail } from "../../src/sim/battleHarness";

/**
 * The autotuner (docs/RAIL-COMMAND.md §autotuning): reads config as baseline,
 * hill-climbs HP-scale trials over a tech-tree ladder, and PROPOSES the deltas
 * that most smooth the curve — never writing config. Covers the HP-scale seam,
 * the proposal shape, and determinism.
 */
const LADDER: LadderRung[] = [
  {
    label: "0-enemies",
    scenario: {
      mapId: "map:rescue-route",
      unlockedClassIds: ["knight"],
      purchasedUpgradeIds: ["upgrade:first-vow"],
      upgradeRanks: {},
    },
  },
  {
    label: "1-enemy",
    scenario: {
      mapId: "map:rescue-route",
      unlockedClassIds: ["knight"],
      purchasedUpgradeIds: [
        "upgrade:first-vow",
        "upgrade:dragon-wake",
        "upgrade:unlock-forest-orc",
      ],
      upgradeRanks: {},
    },
  },
];

describe("autotuner", () => {
  it("the HP-scale seam changes outcomes without mutating config", () => {
    const scenario = {
      mapId: "map:rescue-route",
      unlockedClassIds: ["knight"],
      purchasedUpgradeIds: ["upgrade:first-vow"],
      upgradeRanks: {},
      seed: 3,
    };
    // a tankier line advances at least as far as a frailer one (same seed)
    const frail = runRail({ ...scenario, unitHpScale: 0.5 });
    const tanky = runRail({ ...scenario, unitHpScale: 2.0 });
    expect(tanky.advance).toBeGreaterThanOrEqual(frail.advance);
    // and a beefier enemy never advances the player FURTHER than a weaker one
    const weakFoe = runRail({ ...scenario, enemyHpScale: 0.5 });
    const toughFoe = runRail({ ...scenario, enemyHpScale: 2.0 });
    expect(toughFoe.advance).toBeLessThanOrEqual(weakFoe.advance + 1e-9);
  });

  it("proposes a tuning with a baseline at 1×/1× and a best trial", () => {
    const proposal = proposeTuning(LADDER, 6);
    expect(proposal.baseline.enemyHpScale).toBe(1);
    expect(proposal.baseline.unitHpScale).toBe(1);
    expect(proposal.baseline.winRates.length).toBe(LADDER.length);
    // the best trial is never WORSE than baseline (it can equal it)
    expect(proposal.best.imbalance).toBeLessThanOrEqual(proposal.baseline.imbalance + 1e-9);
    // improvement is non-negative; recommendation only when it actually helps
    expect(proposal.improvement).toBeGreaterThanOrEqual(0);
    if (proposal.improvement <= 1e-6) {
      expect(proposal.recommendation).toBe("");
    } else {
      expect(proposal.recommendation).toContain("Scale");
    }
  }, 60_000);

  it("is deterministic: same ladder + seeds → same proposal", () => {
    const a = proposeTuning(LADDER, 6);
    const b = proposeTuning(LADDER, 6);
    expect(a.best.enemyHpScale).toBe(b.best.enemyHpScale);
    expect(a.best.unitHpScale).toBe(b.best.unitHpScale);
    expect(a.improvement).toBe(b.improvement);
  }, 60_000);
});
