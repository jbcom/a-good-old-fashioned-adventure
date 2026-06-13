/**
 * Statistical balance over the headless harness (docs/RAIL-COMMAND.md
 * §DAG alignment): run N seeded samples of a scenario, summarize the
 * distribution, and detect jagged spikes across adjacent tech-tree states.
 * The balance assertion the user mandated — not "wins" but "no outliers,
 * smooth steps, every reachable state solvable."
 */
import { type RunResult, type RunScenario, runRail } from "./battleHarness";

export interface ScenarioStats {
  label: string;
  samples: number;
  /** fraction of samples whose front reached the rail's end */
  winRate: number;
  /** mean front advance [0,1] across samples */
  meanAdvance: number;
  stdevAdvance: number;
  /** mean enemies felled — the "you always farm something" floor */
  meanFelled: number;
  meanCoins: number;
  /** min advance across samples — the worst run; a solvability floor */
  minAdvance: number;
}

/** Run `seeds` seeded samples of a scenario and summarize the distribution. */
export function sampleScenario(
  label: string,
  scenario: Omit<RunScenario, "seed">,
  seeds = 12,
): ScenarioStats {
  const results: RunResult[] = [];
  for (let seed = 1; seed <= seeds; seed++) {
    results.push(runRail({ ...scenario, seed }));
  }
  const advances = results.map((r) => r.advance);
  const meanAdvance = mean(advances);
  return {
    label,
    samples: seeds,
    winRate: results.filter((r) => r.reachedEnd).length / seeds,
    meanAdvance,
    stdevAdvance: stdev(advances, meanAdvance),
    meanFelled: mean(results.map((r) => r.enemiesFelled)),
    meanCoins: mean(results.map((r) => r.coins)),
    minAdvance: Math.min(...advances),
  };
}

export interface SpikeReport {
  spikes: { from: string; to: string; deltaWinRate: number; deltaAdvance: number }[];
  outliers: string[];
}

/**
 * Walk an ORDERED ladder of scenario stats (each a small DAG step past the
 * last) and flag where the curve is jagged: a win-rate or advance swing
 * past the threshold between adjacent states, or any state whose worst run
 * is unsolvable (minAdvance below the floor).
 */
export function detectSpikes(
  ladder: ScenarioStats[],
  opts: { maxWinRateSwing?: number; maxAdvanceSwing?: number; solvableFloor?: number } = {},
): SpikeReport {
  const maxWinRateSwing = opts.maxWinRateSwing ?? 0.55;
  const maxAdvanceSwing = opts.maxAdvanceSwing ?? 0.45;
  const solvableFloor = opts.solvableFloor ?? 0.2;
  const spikes: SpikeReport["spikes"] = [];
  const outliers: string[] = [];

  for (let i = 1; i < ladder.length; i++) {
    const prev = ladder[i - 1];
    const cur = ladder[i];
    const deltaWinRate = Math.abs(cur.winRate - prev.winRate);
    const deltaAdvance = Math.abs(cur.meanAdvance - prev.meanAdvance);
    if (deltaWinRate > maxWinRateSwing || deltaAdvance > maxAdvanceSwing) {
      spikes.push({ from: prev.label, to: cur.label, deltaWinRate, deltaAdvance });
    }
  }
  for (const state of ladder) {
    // every reachable state must at least farm a foothold — a state whose
    // BEST-effort floor is below solvable is an unwinnable cliff
    if (state.minAdvance < solvableFloor) outliers.push(state.label);
  }
  return { spikes, outliers };
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function stdev(xs: number[], m: number): number {
  if (xs.length < 2) return 0;
  const variance = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}
