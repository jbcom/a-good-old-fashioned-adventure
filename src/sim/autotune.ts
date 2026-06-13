/**
 * Autotuner (docs/RAIL-COMMAND.md §autotuning, user mandate 2026-06-12: "wire
 * the config into the testing harness so we have best-guess baseline tuning
 * assumptions and then auto-adjustments over multiple runs to automatically
 * try pluses and minuses to different attack and defense stats").
 *
 * Reads the live config as the BASELINE hypothesis, measures the curve's
 * imbalance (win-rate variance + spike magnitude across a tech-tree ladder),
 * then hill-climbs over enemy/unit HP scale deltas to find the trial that most
 * smooths the curve. Outputs a PROPOSAL report — it never writes config. Same
 * seed set → same proposal (deterministic).
 */
import { type RunScenario, runRail } from "./battleHarness";

/**
 * A single rung in the tech-tree ladder for tuning sweeps. Omits seed and HP scales so
 * the same scenario can be tested across a grid of HP multipliers.
 */
export interface LadderRung {
  label: string;
  scenario: Omit<RunScenario, "seed" | "unitHpScale" | "enemyHpScale">;
}

/** Per-trial autotuner result — the HP scales tried and their imbalance. */
export interface TrialMetrics {
  /** enemy HP multiplier tried */
  enemyHpScale: number;
  /** unit HP multiplier tried */
  unitHpScale: number;
  /** the imbalance score (lower is smoother) */
  imbalance: number;
  /** per-rung win rates at this trial */
  winRates: number[];
}

/** Autotuner's recommendation — baseline vs best trial and the gain. */
export interface TuneProposal {
  baseline: TrialMetrics;
  best: TrialMetrics;
  /** the imbalance reduction the best trial achieves vs baseline */
  improvement: number;
  /** human-readable recommendation, or "" when baseline is already best */
  recommendation: string;
}

/** Win rate of a rung at the given HP scales, averaged over seeds. */
function rungWinRate(
  rung: LadderRung,
  enemyHpScale: number,
  unitHpScale: number,
  seeds: number,
): number {
  let wins = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const r = runRail({ ...rung.scenario, seed, enemyHpScale, unitHpScale });
    if (r.reachedEnd) wins += 1;
  }
  return wins / seeds;
}

/**
 * The imbalance score for a trial: the curve should fall SMOOTHLY across the
 * ladder (each rung a bit harder), so we penalize (1) large win-rate JUMPS
 * between adjacent rungs (jaggedness) and (2) rungs pinned at the extremes
 * (0% or 100% win — a trivial or impossible step teaches nothing). Lower is a
 * smoother, more continuous curve.
 */
function imbalanceScore(winRates: number[]): number {
  let jaggedness = 0;
  for (let i = 1; i < winRates.length; i++) {
    jaggedness += Math.abs(winRates[i] - winRates[i - 1]);
  }
  let extremity = 0;
  for (const wr of winRates) {
    // distance from the "interesting" band [0.15, 0.85] — flat 0/1 is dull
    if (wr < 0.15) extremity += 0.15 - wr;
    else if (wr > 0.85) extremity += wr - 0.85;
  }
  return jaggedness + extremity;
}

function trial(
  ladder: LadderRung[],
  enemyHpScale: number,
  unitHpScale: number,
  seeds: number,
): TrialMetrics {
  const winRates = ladder.map((rung) => rungWinRate(rung, enemyHpScale, unitHpScale, seeds));
  return { enemyHpScale, unitHpScale, imbalance: imbalanceScore(winRates), winRates };
}

/**
 * Hill-climb over a small grid of enemy/unit HP scales and propose the trial
 * that most smooths the ladder. Conservative grid (±20% in 10% steps) so a
 * proposal stays a gentle nudge, not a rebalance. Returns the baseline (1×,1×)
 * metrics, the best trial, and a recommendation the author reviews before
 * touching config.
 */
export function proposeTuning(ladder: LadderRung[], seeds = 12): TuneProposal {
  const scales = [0.8, 0.9, 1.0, 1.1, 1.2];
  const baseline = trial(ladder, 1, 1, seeds);
  let best = baseline;
  for (const enemyHpScale of scales) {
    for (const unitHpScale of scales) {
      if (enemyHpScale === 1 && unitHpScale === 1) continue;
      const m = trial(ladder, enemyHpScale, unitHpScale, seeds);
      if (m.imbalance < best.imbalance) best = m;
    }
  }
  const improvement = baseline.imbalance - best.imbalance;
  const recommendation =
    best === baseline || improvement <= 1e-6
      ? ""
      : `Scale enemy HP ×${best.enemyHpScale}, unit HP ×${best.unitHpScale} ` +
        `to cut curve imbalance ${baseline.imbalance.toFixed(2)} → ${best.imbalance.toFixed(2)} ` +
        `(−${improvement.toFixed(2)}).`;
  return { baseline, best, improvement, recommendation };
}
