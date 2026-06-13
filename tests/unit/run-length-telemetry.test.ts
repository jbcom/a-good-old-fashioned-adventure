import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { incremental } from "../../src/lib/config";
import { runRail } from "../../src/sim/battleHarness";

/**
 * S21.1 run-length telemetry (absorbs S15.3): a rail run must RESOLVE in a sane
 * span — neither instant nor a grind that never ends. We measure each spine
 * map's run-length in sim-seconds (ticks / 60) with a viable roster across
 * seeds, assert it sits inside a sane band, and write a baseline to evidence so
 * a future regression (a run that suddenly drags or collapses instantly) shows
 * up as a band violation. Sim-clock, not wall-time: deterministic and
 * machine-independent (wall-time telemetry lives in the browser journeys).
 */
const SIM_HZ = 60;
const SEEDS = [3, 7, 11, 19];
// the sane band: a run that resolves in under ~6s never started a real fight;
// one that runs the full 120s cap never resolved (a grind/soft-stall).
const MIN_SECONDS = 6;
const MAX_SECONDS = 115;

const roster = {
  unlockedClassIds: ["knight", "ranger", "wizard"],
  purchasedUpgradeIds: [
    "upgrade:first-vow",
    "upgrade:ranger-trail",
    "upgrade:wizard-focus",
    "upgrade:warband-of-one",
    "upgrade:dragon-wake",
    "upgrade:unlock-forest-orc",
  ],
  upgradeRanks: { "upgrade:warband-of-one": 4 },
};

describe("S21.1 run-length telemetry", () => {
  it("every spine map resolves inside a sane run-length band", () => {
    const baseline: Record<
      string,
      { meanSeconds: number; minSeconds: number; maxSeconds: number }
    > = {};
    for (const mapId of incremental.mapDag.order) {
      const seconds = SEEDS.map((seed) => {
        const r = runRail({ ...roster, mapId, seed, maxTicks: SIM_HZ * 120 });
        return r.ticks / SIM_HZ;
      });
      const mean = seconds.reduce((a, b) => a + b, 0) / seconds.length;
      const min = Math.min(...seconds);
      const max = Math.max(...seconds);
      baseline[mapId] = {
        meanSeconds: Number(mean.toFixed(2)),
        minSeconds: Number(min.toFixed(2)),
        maxSeconds: Number(max.toFixed(2)),
      };
      expect(min, `${mapId} resolves too fast (${min}s) — no real fight`).toBeGreaterThan(
        MIN_SECONDS,
      );
      expect(max, `${mapId} never resolves (${max}s) — a grind or soft-stall`).toBeLessThan(
        MAX_SECONDS,
      );
    }
    // note the baseline to evidence (gitignored, re-derivable) for drift watching
    const dir = resolve(process.cwd(), "docs/evidence");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      resolve(dir, "run-length-baseline.json"),
      `${JSON.stringify(baseline, null, 2)}\n`,
    );
    // every map produced a baseline row
    expect(Object.keys(baseline).length).toBe(incremental.mapDag.order.length);
  }, 120_000);
});
