import { describe, expect, it } from "vitest";
import { incremental } from "../../src/lib/config";
import { runRail } from "../../src/sim/battleHarness";

/**
 * Every map on the DAG spine must play as a rail run (docs/RAIL-COMMAND.md
 * §Map DAG): a viable roster fielded on each map advances and farms — no
 * map strands the line. This is the structural floor the statistical
 * balance suite (S19.1b) builds on; here we assert mere PLAYABILITY (the
 * line advances and fells something on every spine map with a seed).
 */
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

describe("spine maps are playable", () => {
  for (const mapId of incremental.mapDag.order) {
    it(`${mapId}: the line advances and farms`, () => {
      const r = runRail({ ...roster, mapId, seed: 5, maxTicks: 60 * 90 });
      expect(r.advance, `${mapId} stranded the line`).toBeGreaterThan(0.5);
      expect(r.unitsFielded, `${mapId} fielded no units`).toBeGreaterThan(0);
    });
  }
}, 240_000);
