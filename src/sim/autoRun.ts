/**
 * AUTO — headless auto-advance (docs/RAIL-COMMAND.md §AUTO). A shipped feature
 * (distinct from fast-forward, which speeds the live run): AUTO plays the
 * player's unlocked maps through the headless rail sim and banks the results
 * into the live progress immediately — no manual play.
 *
 * A run can WIN (the line reaches the princess → rescue pays roses) or LOSE
 * (the line falls → the partial run's farmed coins/gems still bank — a good
 * farm). AUTO chains across the unlocked spine toward the frontier and stops at
 * the first loss; either way it ends on the results screen. Deterministic: a
 * given progress + seed auto-plays reproducibly, the same pure-sim the balance
 * suite uses.
 */
import type { World } from "koota";
import { incremental } from "../lib/config";
import { runRail } from "./battleHarness";
import {
  bankCoins,
  bankGems,
  currentProgress,
  grantRunReward,
  recordDeathPayout,
} from "./incrementalProgress";
import { currentMap } from "./mapProgression";
import type { IncrementalProgressState } from "./traits";

export interface AutoRunResult {
  /** the map this run played */
  mapId: string;
  /** did the simulated line reach the princess */
  won: boolean;
  coinsEarned: number;
  gemsEarned: number;
  rosesEarned: number;
  enemiesFelled: number;
}

export interface AutoChainResult {
  /** every run AUTO played this press, in order */
  runs: AutoRunResult[];
  /** the deepest map AUTO reached (the last one it played) */
  reachedMap: string;
  /** did AUTO win every map up to the frontier (no loss stopped it) */
  clearedFrontier: boolean;
}

/** Play one map headlessly and bank its outcome into the live world. */
function autoRunMap(world: World, mapId: string, seed: number): AutoRunResult {
  const progress = currentProgress(world);
  const result = runRail({
    mapId,
    unlockedClassIds: progress.unlockedClassIds,
    purchasedUpgradeIds: progress.purchasedUpgradeIds,
    upgradeRanks: progress.upgradeRanks,
    seed,
  });

  // transfer the simulated farm to the live wallet (harness world began at 0)
  if (result.coins > 0) bankCoins(world, result.coins);
  if (result.gems > 0) bankGems(world, result.gems);

  if (result.reachedEnd) {
    // the line reached the princess: the rescue pays its roses (+ kin yield)
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

/** The unlocked spine prefix the player can auto toward (start → frontier). */
function unlockedSpine(progress: IncrementalProgressState): string[] {
  const frontier = currentMap(progress);
  const order = incremental.mapDag.order;
  const end = order.indexOf(frontier);
  return end < 0 ? [order[0]] : order.slice(0, end + 1);
}

/**
 * AUTO a single map (the current frontier) — the minimal press. Kept for
 * callers/tests that want one run; the HUD uses autoChain.
 */
export function autoRun(world: World, seed: number): AutoRunResult {
  return autoRunMap(world, currentMap(currentProgress(world)), seed);
}

/**
 * AUTO across the unlocked spine toward the frontier (docs/RAIL-COMMAND.md
 * §AUTO — "if you last got to 5-4 you could run auto and might automatically
 * get to there"). Plays each unlocked map in order, banking every run, and
 * STOPS at the first loss (a loss is still a farm). Each map gets a distinct
 * seed derived from the base so the chain stays deterministic.
 */
export function autoChain(world: World, seed: number): AutoChainResult {
  const spine = unlockedSpine(currentProgress(world));
  const runs: AutoRunResult[] = [];
  for (let i = 0; i < spine.length; i++) {
    const run = autoRunMap(world, spine[i], seed + i);
    runs.push(run);
    if (!run.won) {
      // a loss stops the chain here — the partial farm already banked
      return { runs, reachedMap: spine[i], clearedFrontier: false };
    }
  }
  return {
    runs,
    reachedMap: spine[spine.length - 1] ?? currentMap(currentProgress(world)),
    clearedFrontier: true,
  };
}
