/**
 * AUTO — headless auto-advance (docs/RAIL-COMMAND.md §AUTO). A shipped feature
 * (distinct from fast-forward, which speeds the live run): AUTO plays the
 * player's current frontier map through the headless rail sim and banks the
 * result into the live progress immediately — no manual play.
 *
 * It can WIN (the line reaches the princess → rescue pays roses) or LOSE (the
 * line falls → the partial run's farmed coins/gems still bank — a good farm).
 * Either way it ends on the results screen. Deterministic: a given progress +
 * seed auto-plays reproducibly, the same pure-sim the balance suite uses.
 */
import type { World } from "koota";
import { runRail } from "./battleHarness";
import {
  bankCoins,
  bankGems,
  currentProgress,
  grantRunReward,
  recordDeathPayout,
} from "./incrementalProgress";
import { currentMap } from "./mapProgression";

export interface AutoRunResult {
  /** the frontier map AUTO played */
  mapId: string;
  /** did the simulated line reach the princess */
  won: boolean;
  coinsEarned: number;
  gemsEarned: number;
  rosesEarned: number;
  enemiesFelled: number;
}

/**
 * Play the player's current frontier map headlessly and bank the outcome into
 * the live world. Returns what the run earned. The live progress advances
 * exactly as a real run would: a win grants the rescue (roses + rescueCount);
 * a loss records the death payout. The simulated farm (coins/gems the harness
 * banked as the line felled enemies) is transferred to the live wallet — the
 * harness starts its world at zero currency, so its result IS the earned delta.
 */
export function autoRun(world: World, seed: number): AutoRunResult {
  const mapId = currentMap(currentProgress(world));

  const result = runRail({
    mapId,
    unlockedClassIds: currentProgress(world).unlockedClassIds,
    purchasedUpgradeIds: currentProgress(world).purchasedUpgradeIds,
    upgradeRanks: currentProgress(world).upgradeRanks,
    seed,
  });

  // transfer the simulated farm to the live wallet (harness world began at 0)
  if (result.coins > 0) bankCoins(world, result.coins);
  if (result.gems > 0) bankGems(world, result.gems);

  if (result.reachedEnd) {
    // the line reached the princess: the rescue pays its roses (+ kin yield)
    // and closes the run in victory — grantRunReward mirrors the live path
    grantRunReward(world, "princessRescued");
  } else {
    // the line fell: the partial farm is already banked; close in defeat
    recordDeathPayout(world);
  }

  const lastRun = currentProgress(world).lastRun;
  return {
    mapId,
    won: result.reachedEnd,
    coinsEarned: result.coins,
    gemsEarned: result.gems,
    rosesEarned: lastRun?.rosesEarned ?? 0,
    enemiesFelled: result.enemiesFelled,
  };
}
