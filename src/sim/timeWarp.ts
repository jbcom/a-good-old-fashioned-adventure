/**
 * Battle-speed fast-forward (user mandate 2026-06-12): the top bar offers
 * 1x / 5x / 10x / 50x / 100x. Every tier past 1x is gated behind a tempo
 * upgrade node; tests force any tier directly. Pure resolution here — the
 * loop multiplies its fixed-timestep step count, the HUD renders the
 * cycle button.
 */
import { engine } from "../lib/config";
import type { IncrementalProgressState } from "./traits";

/** Battle-speed tier with scale, label, and unlock condition. */
export interface TimeWarpTier {
  scale: number;
  label: string;
  /** node that unlocks this tier; null → always available */
  unlock: string | null;
  /** minimum rank of that node; null → mere ownership unlocks */
  unlockRank: number | null;
}

const TIERS: TimeWarpTier[] = engine.timeWarp.tiers;

/** Every tier the player has unlocked (1x is always present). */
export function unlockedTiers(progress: IncrementalProgressState | undefined): TimeWarpTier[] {
  const owned = new Set(progress?.purchasedUpgradeIds ?? []);
  const ranks = progress?.upgradeRanks ?? {};
  return TIERS.filter((tier) => {
    if (tier.unlock === null) return true;
    if (!owned.has(tier.unlock)) return false;
    return tier.unlockRank === null || (ranks[tier.unlock] ?? 0) >= tier.unlockRank;
  });
}

/** The tier the player would cycle to after the current scale (wraps to 1x). */
export function nextTier(
  progress: IncrementalProgressState | undefined,
  currentScale: number,
): TimeWarpTier {
  const tiers = unlockedTiers(progress);
  const index = tiers.findIndex((tier) => tier.scale === currentScale);
  return tiers[(index + 1) % tiers.length] ?? tiers[0];
}

/** Clamp a requested scale to what's unlocked (falls back to 1x). */
export function clampScale(progress: IncrementalProgressState | undefined, scale: number): number {
  const tiers = unlockedTiers(progress);
  return tiers.some((tier) => tier.scale === scale) ? scale : 1;
}
