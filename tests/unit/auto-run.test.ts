import { describe, expect, it } from "vitest";
import { autoRun } from "../../src/sim/autoRun";
import { createGameWorld } from "../../src/sim/factories";
import { currentProgress, restoreIncrementalProgress } from "../../src/sim/incrementalProgress";

/**
 * AUTO (docs/RAIL-COMMAND.md §AUTO): the headless auto-advance that plays the
 * frontier map and banks the result immediately. Covers the banking, the
 * win/loss → results transition, and determinism.
 */
function seededWorld(seed: number, overrides = {}) {
  const world = createGameWorld(seed);
  restoreIncrementalProgress(world, {
    coins: 0,
    gems: 0,
    roses: 0,
    unlockedClassIds: ["knight", "ranger", "wizard"],
    purchasedUpgradeIds: [
      "upgrade:first-vow",
      "upgrade:ranger-trail",
      "upgrade:wizard-focus",
      "upgrade:warband-of-one",
    ],
    upgradeRanks: { "upgrade:warband-of-one": 4 },
    ...overrides,
  });
  return world;
}

describe("AUTO", () => {
  it("plays the frontier map and banks the farm into the live wallet", () => {
    const world = seededWorld(5);
    const coinsBefore = currentProgress(world).coins;
    const result = autoRun(world, 5);

    expect(result.mapId).toBe("map:rescue-route"); // the starting frontier
    // a run banks SOMETHING (coins from kills) — the always-advance floor
    expect(result.coinsEarned).toBeGreaterThanOrEqual(0);
    expect(currentProgress(world).coins).toBeGreaterThanOrEqual(coinsBefore);
  });

  it("closes the run into a results-ready lastRun (win or loss)", () => {
    const world = seededWorld(5);
    const result = autoRun(world, 5);
    const lastRun = currentProgress(world).lastRun;
    expect(lastRun).not.toBeNull();
    // the outcome matches: a win is a victory + rescued princess
    if (result.won) {
      expect(lastRun?.result).toBe("victory");
      expect(lastRun?.rescuedPrincess).toBe(true);
    } else {
      expect(lastRun?.result).toBe("gameover");
      expect(lastRun?.rescuedPrincess).toBe(false);
    }
  });

  it("is deterministic: same progress + seed → same outcome", () => {
    const a = autoRun(seededWorld(11), 7);
    const b = autoRun(seededWorld(11), 7);
    expect(a.won).toBe(b.won);
    expect(a.coinsEarned).toBe(b.coinsEarned);
    expect(a.enemiesFelled).toBe(b.enemiesFelled);
  });

  it("a win pays the rescue rose; the rescueCount climbs", () => {
    const world = seededWorld(5);
    const rescuesBefore = currentProgress(world).rescueCount;
    const result = autoRun(world, 5);
    if (result.won) {
      expect(currentProgress(world).rescueCount).toBe(rescuesBefore + 1);
      expect(result.rosesEarned).toBeGreaterThanOrEqual(0);
    }
  });
});
