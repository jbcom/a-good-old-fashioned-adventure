import { describe, expect, it } from "vitest";
import { detectSpikes, sampleScenario } from "../../src/sim/battleStats";

/**
 * Statistical combat balance (docs/RAIL-COMMAND.md §DAG alignment, user
 * mandate 2026-06-12): the balance assertion is NOT "wins" but "no jagged
 * spikes." Walk an ordered tech-tree ladder — each rung a small DAG step past
 * the last — and prove the win-rate / advance curve moves smoothly, with no
 * adjacent step swinging sharply and no reachable state left unsolvable.
 *
 * "A win is not always guaranteed — that's the point." So this asserts the
 * SHAPE of the curve (continuity, solvability), not that any rung wins.
 */
const SEEDS = 16;

describe("S19.1b spike-detection ladder", () => {
  it("the enemy-unlock ladder on rescue-route has no jagged steps", () => {
    // each rung adds ONE more unlocked antagonist to the same map + roster:
    // the curve should fall smoothly as the map gets harder, never cliff.
    const base = {
      mapId: "map:rescue-route",
      unlockedClassIds: ["knight", "ranger"],
      upgradeRanks: {},
    };
    const ladder = [
      sampleScenario(
        "0-enemies",
        { ...base, purchasedUpgradeIds: ["upgrade:first-vow", "upgrade:ranger-trail"] },
        SEEDS,
      ),
      sampleScenario(
        "1-enemy",
        {
          ...base,
          purchasedUpgradeIds: [
            "upgrade:first-vow",
            "upgrade:ranger-trail",
            "upgrade:dragon-wake",
            "upgrade:unlock-forest-orc",
          ],
        },
        SEEDS,
      ),
      sampleScenario(
        "2-enemies",
        {
          ...base,
          purchasedUpgradeIds: [
            "upgrade:first-vow",
            "upgrade:ranger-trail",
            "upgrade:dragon-wake",
            "upgrade:unlock-forest-orc",
            "upgrade:unlock-oldwood-raider",
          ],
        },
        SEEDS,
      ),
    ];

    const report = detectSpikes(ladder, {
      maxWinRateSwing: 0.6,
      maxAdvanceSwing: 0.5,
      solvableFloor: 0.15,
    });
    expect(report.spikes, `jagged steps: ${JSON.stringify(report.spikes)}`).toEqual([]);
    expect(report.outliers, `unsolvable states: ${report.outliers.join(", ")}`).toEqual([]);
  }, 60_000);

  it("the class-unlock ladder broadens the line without a spike", () => {
    // adding offensive bodies should only HELP (smoother, higher advance) —
    // never swing the curve sharply (offense-first: every state has a line)
    const base = {
      mapId: "map:oldwood-forest",
      purchasedUpgradeIds: [
        "upgrade:first-vow",
        "upgrade:ranger-trail",
        "upgrade:wizard-focus",
        "upgrade:dragon-wake",
        "upgrade:unlock-forest-orc",
      ],
      upgradeRanks: {},
    };
    const ladder = [
      sampleScenario("knight", { ...base, unlockedClassIds: ["knight"] }, SEEDS),
      sampleScenario("knight+ranger", { ...base, unlockedClassIds: ["knight", "ranger"] }, SEEDS),
      sampleScenario(
        "knight+ranger+wizard",
        { ...base, unlockedClassIds: ["knight", "ranger", "wizard"] },
        SEEDS,
      ),
    ];

    const report = detectSpikes(ladder, {
      maxWinRateSwing: 0.6,
      maxAdvanceSwing: 0.5,
      solvableFloor: 0.15,
    });
    expect(report.spikes, `jagged steps: ${JSON.stringify(report.spikes)}`).toEqual([]);
    expect(report.outliers, `unsolvable states: ${report.outliers.join(", ")}`).toEqual([]);
  }, 60_000);

  it("every spine map is solvable with a viable roster (no unwinnable cliff)", () => {
    // a foothold floor across the spine: a reasonable roster always farms its
    // way somewhere — no map is a hard wall (the always-advance guarantee)
    const roster = {
      unlockedClassIds: ["knight", "ranger", "wizard"],
      purchasedUpgradeIds: [
        "upgrade:first-vow",
        "upgrade:ranger-trail",
        "upgrade:wizard-focus",
        "upgrade:warband-of-one",
      ],
      upgradeRanks: { "upgrade:warband-of-one": 4 },
    };
    for (const mapId of [
      "map:rescue-route",
      "map:oldwood-forest",
      "map:deep-forest",
      "map:sunken-road",
      "map:castle-approach",
      "map:castle-hall",
    ]) {
      const stats = sampleScenario(mapId, { ...roster, mapId }, SEEDS);
      // the worst sample still advances off the start line — never a dead wall
      expect(stats.minAdvance, `${mapId} has an unsolvable worst run`).toBeGreaterThan(0.15);
    }
  }, 60_000);
});
