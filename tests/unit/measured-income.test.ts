import { describe, expect, it } from "vitest";
import { incremental } from "../../src/lib/config";
import { runRail } from "../../src/sim/battleHarness";

/**
 * S21.2 economy re-tune — tier prices vs MEASURED runs-to-afford. The
 * balance-budget gate proves affordability against a conservative income MODEL;
 * this gate proves the model isn't fiction by measuring actual coin income from
 * runRail at representative roster tiers, and asserting the early coin tracks
 * are affordable inside a few MEASURED runs. Sharp edges show up as a node that
 * the model calls affordable but measured income can't reach in its window.
 */
const SIM_HZ = 60;

// roster tiers along the spine: each unlocks more enemies (denser waves = more
// coin income) and fields a broader line, mirroring real progression
const TIERS: Array<{
  label: string;
  mapId: string;
  unlockedClassIds: string[];
  purchasedUpgradeIds: string[];
  upgradeRanks: Record<string, number>;
}> = [
  {
    label: "early (oldwood)",
    mapId: "map:oldwood-forest",
    unlockedClassIds: ["knight", "ranger"],
    purchasedUpgradeIds: [
      "upgrade:first-vow",
      "upgrade:ranger-trail",
      "upgrade:dragon-wake",
      "upgrade:unlock-forest-orc",
    ],
    upgradeRanks: {},
  },
  {
    label: "mid (sunken-road)",
    mapId: "map:sunken-road",
    unlockedClassIds: ["knight", "ranger", "wizard"],
    purchasedUpgradeIds: [
      "upgrade:first-vow",
      "upgrade:ranger-trail",
      "upgrade:wizard-focus",
      "upgrade:warband-of-one",
      "upgrade:dragon-wake",
      "upgrade:unlock-forest-orc",
      "upgrade:unlock-oldwood-raider",
      "upgrade:unlock-dune-adder",
    ],
    upgradeRanks: { "upgrade:warband-of-one": 3 },
  },
];

describe("S21.2 measured rail income", () => {
  it("measures positive coin income, and rising income-per-second, by tier", () => {
    // KEY economy property (measured, not modeled): per-RUN coin income is
    // capped by the enemies in the line's path — a run ends when the front
    // reaches the princess, so a stronger roster fells a similar count but
    // FASTER. Throughput is therefore income-per-SECOND (more runs/hour), not
    // coins-per-run. We assert both: every tier banks coins, and the stronger
    // tier's income-per-second is at least the weaker tier's (no throughput
    // inversion — a later roster is never SLOWER-earning than an earlier one).
    const perSecond: Record<string, number> = {};
    for (const tier of TIERS) {
      const seeds = [3, 7, 11];
      const runs = seeds.map((seed) => runRail({ ...tier, seed, maxTicks: SIM_HZ * 120 }));
      const meanCoins = runs.reduce((a, r) => a + r.coins, 0) / runs.length;
      const meanSeconds = runs.reduce((a, r) => a + r.ticks / SIM_HZ, 0) / runs.length;
      expect(meanCoins, `${tier.label} banked no coins`).toBeGreaterThan(0);
      perSecond[tier.label] = meanCoins / meanSeconds;
    }
    expect(
      perSecond["mid (sunken-road)"],
      "the mid-tier roster should earn at least as fast as the early roster",
    ).toBeGreaterThanOrEqual(perSecond["early (oldwood)"] * 0.95);
  }, 60_000);

  it("keeps the first coin-track rank affordable inside a few measured runs", () => {
    // the cheapest coin-priced first ranks must be reachable in <= 3 measured
    // early runs — the no-grind floor on real income, not modeled income
    const early = TIERS[0];
    const seeds = [3, 7, 11];
    const meanCoins =
      seeds
        .map((seed) => runRail({ ...early, seed, maxTicks: SIM_HZ * 120 }).coins)
        .reduce((a, b) => a + b, 0) / seeds.length;

    const firstCoinRanks = incremental.upgradeGraph.nodes.filter(
      (n) =>
        n.category === "economy" && (n.cost.coins ?? 0) > 0 && (n.prerequisites?.length ?? 0) <= 2,
    );
    expect(firstCoinRanks.length).toBeGreaterThan(0);
    for (const node of firstCoinRanks) {
      const price = node.cost.coins ?? 0;
      expect(
        price,
        `${node.id} (${price}C) needs >3 measured early runs (${meanCoins.toFixed(0)}C/run)`,
      ).toBeLessThanOrEqual(meanCoins * 3);
    }
  }, 60_000);
});
