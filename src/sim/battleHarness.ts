/**
 * Headless rail-run harness (docs/RAIL-COMMAND.md §Testing shape, §DAG
 * alignment): a pure-sim entry point that plays the REAL loop — an
 * advancing line replenished from a finite toolbox against waves drawn
 * from the map's region — with no UI, so the statistical balance suite can
 * run thousands of seeded samples fast.
 *
 * This models the game as it plays: the front pushes the rail, waves answer
 * from gates, and a replenishment policy deploys from the toolbox budget
 * when the line thins — until the front reaches the end or the toolbox
 * empties and the line falls. The "win" question is not guaranteed; what we
 * measure is how far the line gets and what it farms, across permutations.
 *
 * This is a TEST/ANALYSIS seam, not shipped gameplay.
 */
import type { World } from "koota";
import { deployUnit, remainingFor } from "./deploy";
import { createGameWorld, instantiateMap } from "./factories";
import {
  restoreIncrementalProgress,
  rosterFor,
  sanitizeIncrementalProgress,
} from "./incrementalProgress";
import { frontline, railAxis } from "./systems/waves";
import { step } from "./tick";
import { Health, IncrementalProgress, IsEnemy, IsUnit, MapRuntime } from "./traits";

export interface RunScenario {
  /** map to fight on (any map id — bypasses the route DAG for isolation) */
  mapId: string;
  /** unlocked class ids — the toolbox the player commands */
  unlockedClassIds: string[];
  /** unlocked upgrade ids shaping roster size + unit stats */
  purchasedUpgradeIds?: string[];
  /** rank counts for multi-rank upgrade nodes (unitCount, hp, etc.) */
  upgradeRanks?: Record<string, number>;
  /** deterministic seed — same seed + scenario → same outcome */
  seed: number;
  /** safety cap so a stalemate resolves (default 120s of sim) */
  maxTicks?: number;
  /**
   * Autotuner trial knobs (docs/RAIL-COMMAND.md §autotuning): multiply unit or
   * enemy HP at spawn for this run WITHOUT mutating config — so the tuner can
   * A/B test stat deltas headlessly. Default 1 (no change). 1.1 = +10% HP.
   */
  unitHpScale?: number;
  enemyHpScale?: number;
}

export interface RunResult {
  /** did the front reach the rail's end (the princess) */
  reachedEnd: boolean;
  /** how far north the front pushed, as a fraction of the rail [0,1] */
  advance: number;
  /** sim ticks until the run resolved (line fell, reached end, or cap) */
  ticks: number;
  /** units fielded over the whole run (the toolbox spend) */
  unitsFielded: number;
  /** enemies felled (what the run farmed) */
  enemiesFelled: number;
  /** coins banked (the always-farm-something floor) */
  coins: number;
  /** gems banked (dragon-hoard farm — felled bosses/minibosses) */
  gems: number;
  /** roses banked (objective/rescue farm) */
  roses: number;
  outcome: "reached-end" | "line-fell" | "stalemate";
}

const SIM_HZ = 60;

/**
 * Play a rail run headlessly with a greedy replenishment policy: keep the
 * line at its roster cap by deploying whenever the toolbox has budget and a
 * unit slot is free. The line advances on its own AI; waves answer from the
 * map's gates. Returns how far the front got and what it farmed.
 */
export function runRail(scenario: RunScenario): RunResult {
  const maxTicks = scenario.maxTicks ?? SIM_HZ * 120;
  const world = createGameWorld(scenario.seed);
  restoreIncrementalProgress(world, {
    coins: 0,
    roses: 0,
    unlockedClassIds: scenario.unlockedClassIds,
    purchasedUpgradeIds: scenario.purchasedUpgradeIds ?? ["upgrade:first-vow"],
    upgradeRanks: scenario.upgradeRanks ?? {},
  });
  instantiateMap(world, scenario.mapId, { classId: scenario.unlockedClassIds[0] ?? "knight" });

  // autotuner HP scaling (no config mutation): rescale each frame for newly
  // spawned entities (waves, replenished units) we haven't touched yet
  const unitHpScale = scenario.unitHpScale ?? 1;
  const enemyHpScale = scenario.enemyHpScale ?? 1;
  const scaled = new Set<number>();
  const applyHpScales = () => {
    if (unitHpScale === 1 && enemyHpScale === 1) return;
    for (const e of world.query(IsUnit, Health)) {
      const id = e as unknown as number;
      if (scaled.has(id)) continue;
      scaled.add(id);
      const h = e.get(Health);
      if (h) e.set(Health, { hp: h.hp * unitHpScale, maxHp: h.maxHp * unitHpScale });
    }
    for (const e of world.query(IsEnemy, Health)) {
      const id = e as unknown as number;
      if (scaled.has(id)) continue;
      scaled.add(id);
      const h = e.get(Health);
      if (h) e.set(Health, { hp: h.hp * enemyHpScale, maxHp: h.maxHp * enemyHpScale });
    }
  };
  applyHpScales();

  const { cols, rows } = mapSize(world);
  const axis = railAxis(world);
  // advance is measured along the rail axis: north climbs y→0, east runs x→width
  const railLength = axis === "east" ? cols * 16 : rows * 16;
  let unitsFielded = 0;
  let enemiesFelledTotal = 0;
  let seenEnemyIds = new Set<number>();
  let bestAdvance = 0;
  let ticks = 0;

  const advanceOf = (front: { x: number; y: number }) =>
    axis === "east" ? front.x / railLength : (railLength - front.y) / railLength;

  for (; ticks < maxTicks; ticks++) {
    unitsFielded += replenish(world, scenario.unlockedClassIds);
    applyHpScales();
    step(world);

    // count felled enemies by tracking which ids disappear
    const liveEnemies = new Set<number>();
    for (const e of world.query(IsEnemy)) liveEnemies.add(e as unknown as number);
    for (const id of seenEnemyIds) if (!liveEnemies.has(id)) enemiesFelledTotal += 1;
    seenEnemyIds = liveEnemies;

    const front = frontline(world);
    if (front) bestAdvance = Math.max(bestAdvance, advanceOf(front));

    // the line fell with no toolbox left → the run is over
    if (world.query(IsUnit).length === 0 && !canReplenish(world, scenario.unlockedClassIds)) {
      return finish(world, "line-fell", bestAdvance, ticks, unitsFielded, enemiesFelledTotal);
    }
    // the front reached the far end (the princess) → reached the end
    if (front && advanceOf(front) >= 0.92) {
      return finish(world, "reached-end", 1, ticks, unitsFielded, enemiesFelledTotal);
    }
  }
  return finish(world, "stalemate", bestAdvance, ticks, unitsFielded, enemiesFelledTotal);
}

/** Deploy toward the roster cap; returns how many units were fielded. */
function replenish(world: World, classIds: string[]): number {
  let fielded = 0;
  for (const classId of classIds) {
    while (remainingFor(world, classId) > 0) {
      if (!deployUnit(world, classId)) break;
      fielded += 1;
    }
  }
  return fielded;
}

function canReplenish(world: World, classIds: string[]): boolean {
  return classIds.some((classId) => remainingFor(world, classId) > 0);
}

function finish(
  world: World,
  outcome: RunResult["outcome"],
  advance: number,
  ticks: number,
  unitsFielded: number,
  enemiesFelled: number,
): RunResult {
  const progress = world.get(IncrementalProgress);
  const result: RunResult = {
    reachedEnd: outcome === "reached-end",
    advance: Math.max(0, Math.min(1, advance)),
    ticks,
    unitsFielded,
    enemiesFelled,
    coins: progress?.coins ?? 0,
    gems: progress?.gems ?? 0,
    roses: progress?.roses ?? 0,
    outcome,
  };
  // koota caps live worlds at 16; the harness world is throwaway, so destroy it
  // once its tallies are read (AUTO chains many runs per press — they'd pile up)
  world.destroy();
  return result;
}

function mapSize(world: World): { cols: number; rows: number } {
  const runtime = world.get(MapRuntime);
  return { cols: runtime?.cols ?? 26, rows: runtime?.rows ?? 64 };
}

/** Total toolbox budget the scenario's unlocks grant (for spend reporting). */
export function rosterBudget(scenario: RunScenario): number {
  const progress = sanitizeIncrementalProgress(
    {
      unlockedClassIds: scenario.unlockedClassIds,
      purchasedUpgradeIds: scenario.purchasedUpgradeIds ?? ["upgrade:first-vow"],
      upgradeRanks: scenario.upgradeRanks ?? {},
    },
    0,
  );
  return rosterFor(progress).reduce((sum, slot) => sum + slot.count, 0);
}
