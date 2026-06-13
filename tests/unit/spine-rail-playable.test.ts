import { describe, expect, it } from "vitest";
import { incremental } from "../../src/lib/config";
import { runRail } from "../../src/sim/battleHarness";

/**
 * Every map on the DAG spine must play as a rail run (docs/RAIL-COMMAND.md
 * §Map DAG): a viable roster fielded on each map advances off the start line
 * AND farms something — no map strands the line cold. This is the structural
 * floor the statistical balance suite (S19.1b) builds on.
 *
 * PLAYABILITY ≠ winnability. The design is explicit that "a win is not always
 * guaranteed … if you fail you at least farmed SOMETHING" (the canon's
 * always-advance floor). A minimal 3-class roster may STALEMATE against a
 * map's kin boss without breaking through — that is a legitimate run, not a
 * strand. So the floor we assert is: the line advanced meaningfully (off the
 * start line) and the run banked progress (felled an enemy or coins). The
 * statistical suite, not this floor test, judges win-rate balance.
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
      // advanced off the start line (the rail isn't stalled at deploy)
      expect(r.advance, `${mapId} stranded the line at the start`).toBeGreaterThan(0.4);
      expect(r.unitsFielded, `${mapId} fielded no units`).toBeGreaterThan(0);
      // banked progress — the always-advance floor: either the run WON
      // (reached the princess) or it farmed something (a kill or coins) on the
      // way. A run that neither wins nor farms is a dead strand.
      expect(
        r.reachedEnd || r.enemiesFelled > 0 || r.coins > 0,
        `${mapId} neither won nor farmed — the run banked no progress`,
      ).toBe(true);
    });
  }
}, 240_000);
