import type { World } from "koota";
import type { IncrementalUpgradeNode } from "../lib/config";
import { enemies, incremental } from "../lib/config";
import { getMap } from "../lib/content/registry";
import {
  type GameEvent,
  IncrementalProgress,
  type IncrementalProgressState,
  Outbox,
} from "./traits";

function integer(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
}

/** Untrusted save wallets are capped far beyond any reachable balance. */
const WALLET_CAP = 1_000_000;

function knownUpgradeIds(): Set<string> {
  return new Set(incremental.upgradeGraph.nodes.map((node) => node.id));
}

export function nodeRanks(node: IncrementalUpgradeNode): number {
  return Math.max(1, Math.floor(node.ranks ?? 1));
}

export function purchasedRank(
  progress: IncrementalProgressState,
  node: IncrementalUpgradeNode,
): number {
  if (!progress.purchasedUpgradeIds.includes(node.id)) return 0;
  if (nodeRanks(node) === 1) return 1;
  return Math.min(nodeRanks(node), Math.max(1, integer(progress.upgradeRanks[node.id], 1)));
}

/**
 * Rail-command roster (docs/RAIL-COMMAND.md §sim model): every unlocked
 * class fields one unit, plus whatever unitCount ranks the DAG added.
 */
export function rosterFor(
  progress: IncrementalProgressState,
): { classId: string; count: number }[] {
  return progress.unlockedClassIds.map((classId) => {
    let count = 1;
    for (const node of incremental.upgradeGraph.nodes) {
      const perRank = node.effect?.unitCount ?? 0;
      if (!perRank || node.classId !== classId) continue;
      count += perRank * purchasedRank(progress, node);
    }
    return { classId, count };
  });
}

export function upgradeMaxHpBonus(
  progress: IncrementalProgressState | undefined,
  classId: string,
): number {
  if (!progress) return 0;
  let bonus = 0;
  for (const node of incremental.upgradeGraph.nodes) {
    const perRank = node.effect?.maxHp ?? 0;
    if (!perRank) continue;
    if (node.classId && node.classId !== classId) continue;
    bonus += perRank * purchasedRank(progress, node);
  }
  return bonus;
}

export function rankCost(
  node: IncrementalUpgradeNode,
  ownedRanks: number,
): { coins: number; roses: number } {
  const factor = (node.rankCostGrowth ?? 1) ** ownedRanks;
  return {
    coins: Math.round((node.cost.coins ?? 0) * factor),
    roses: Math.round((node.cost.roses ?? 0) * factor),
  };
}

function sanitizeUpgradeRanks(input: unknown, purchased: string[]): Record<string, number> {
  const source =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const result: Record<string, number> = {};
  for (const node of incremental.upgradeGraph.nodes) {
    if (nodeRanks(node) === 1 || !purchased.includes(node.id)) continue;
    result[node.id] = Math.min(nodeRanks(node), Math.max(1, integer(source[node.id], 1)));
  }
  return result;
}

function knownClassIds(): Set<string> {
  return new Set([incremental.classes.starting, ...incremental.classes.unlockable]);
}

function knownRoutePackIds(): Set<string> {
  return new Set(incremental.routePacks.map((pack) => pack.id));
}

function knownMinibossIds(): Set<string> {
  return new Set(
    Object.entries(enemies.archetypes)
      .filter(([, archetype]) => archetype.miniboss)
      .map(([id]) => id),
  );
}

function sanitizeIdList(input: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(input)) return [];
  const result: string[] = [];
  for (const value of input) {
    if (typeof value !== "string" || !allowed.has(value) || result.includes(value)) continue;
    result.push(value);
  }
  return result;
}

export function initialIncrementalProgress(startingCoins = 0): IncrementalProgressState {
  return {
    coins: Math.max(0, Math.floor(startingCoins)),
    roses: 0,
    rescueCount: 0,
    purchasedUpgradeIds: [incremental.upgradeGraph.root],
    upgradeRanks: {},
    defeatedMinibossIds: [],
    unlockedClassIds: [incremental.classes.starting],
    unlockedRoutePackIds: [],
    currentRunCoinsEarned: 0,
    currentRunRosesEarned: 0,
    currentRunRoadIds: [],
    activeRoutePackId: "baseline",
    lastRun: null,
  };
}

export function sanitizeIncrementalProgress(
  input: unknown,
  fallbackCoins = 0,
): IncrementalProgressState {
  const data =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const purchasedRaw = sanitizeIdList(data.purchasedUpgradeIds, knownUpgradeIds());
  const purchasedUpgradeIds = purchasedRaw.includes(incremental.upgradeGraph.root)
    ? purchasedRaw
    : [incremental.upgradeGraph.root, ...purchasedRaw];
  const unlockedClassIds = sanitizeIdList(data.unlockedClassIds, knownClassIds());
  const unlockedRoutePackIds = sanitizeIdList(data.unlockedRoutePackIds, knownRoutePackIds());
  const activeRoutePackId =
    typeof data.activeRoutePackId === "string" &&
    (data.activeRoutePackId === "baseline" || knownRoutePackIds().has(data.activeRoutePackId))
      ? data.activeRoutePackId
      : "baseline";
  return {
    coins: Math.min(integer(data.coins, fallbackCoins), WALLET_CAP),
    roses: Math.min(integer(data.roses), WALLET_CAP),
    rescueCount: integer(data.rescueCount),
    purchasedUpgradeIds,
    upgradeRanks: sanitizeUpgradeRanks(data.upgradeRanks, purchasedUpgradeIds),
    defeatedMinibossIds: sanitizeIdList(data.defeatedMinibossIds, knownMinibossIds()),
    unlockedClassIds: unlockedClassIds.includes(incremental.classes.starting)
      ? unlockedClassIds
      : [incremental.classes.starting, ...unlockedClassIds],
    unlockedRoutePackIds,
    currentRunCoinsEarned: integer(data.currentRunCoinsEarned),
    currentRunRosesEarned: integer(data.currentRunRosesEarned),
    currentRunRoadIds: Array.isArray(data.currentRunRoadIds)
      ? data.currentRunRoadIds.filter((id): id is string => typeof id === "string").slice(0, 256)
      : [],
    activeRoutePackId,
    lastRun: sanitizeLastRun(data.lastRun),
  };
}

function sanitizeLastRun(input: unknown): IncrementalProgressState["lastRun"] {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const data = input as Record<string, unknown>;
  const result =
    data.result === "gameover" ? "gameover" : data.result === "victory" ? "victory" : null;
  if (!result) return null;
  const routePackId =
    typeof data.routePackId === "string" &&
    (data.routePackId === "baseline" || knownRoutePackIds().has(data.routePackId))
      ? data.routePackId
      : "baseline";
  return {
    result,
    coinsEarned: integer(data.coinsEarned),
    rosesEarned: integer(data.rosesEarned),
    rescuedPrincess: data.rescuedPrincess === true,
    routePackId,
  };
}

export function currentProgress(world: World): IncrementalProgressState {
  const existing = world.get(IncrementalProgress);
  if (existing) return existing;
  const next = initialIncrementalProgress();
  world.add(IncrementalProgress(next));
  return next;
}

function setProgress(world: World, next: IncrementalProgressState): void {
  world.set(IncrementalProgress, next);
}

function bankSfx(world: World, name: "coin" | "rose"): void {
  world.get(Outbox)?.sfx.push(name);
}

export function restoreIncrementalProgress(
  world: World,
  input: unknown,
  fallbackCoins = 0,
): IncrementalProgressState {
  const next = sanitizeIncrementalProgress(input, fallbackCoins);
  setProgress(world, next);
  return next;
}

/**
 * Bank coin INCOME (chests, bounties, run rewards): credits the single
 * wallet and the run's earned ledger (docs/INCREMENTAL-RESCUE-LOOP.md
 * §currencies — there is no per-run purse).
 */
export function bankCoins(world: World, amount: number): void {
  if (amount <= 0) return;
  const progress = currentProgress(world);
  setProgress(world, {
    ...progress,
    coins: progress.coins + amount,
    currentRunCoinsEarned: progress.currentRunCoinsEarned + amount,
  });
  bankSfx(world, "coin");
}

/**
 * Shop-side conversion: moves coins without touching the earned ledger
 * (a sale is not income; a purchase is not negative income). Returns the
 * new balance, or null when the wallet can't cover a debit.
 */
export function adjustCoins(world: World, delta: number): number | null {
  const progress = currentProgress(world);
  const coins = progress.coins + delta;
  if (coins < 0) return null;
  setProgress(world, { ...progress, coins });
  return coins;
}

function addRoses(world: World, amount: number): IncrementalProgressState {
  const progress = currentProgress(world);
  if (amount <= 0) return progress;
  const next = {
    ...progress,
    roses: progress.roses + amount,
    currentRunRosesEarned: progress.currentRunRosesEarned + amount,
  };
  setProgress(world, next);
  bankSfx(world, "rose");
  return next;
}

export function grantRunReward(world: World, rewardId: string): void {
  const reward = incremental.runRewards[rewardId];
  if (!reward) return;
  if (reward.currency === "coins") {
    bankCoins(world, reward.base ?? 0);
    return;
  }

  const next = addRoses(world, reward.base ?? 0);
  if (rewardId !== "princessRescued") return;
  const rescueCount = next.rescueCount + 1;
  setProgress(world, {
    ...next,
    rescueCount,
    // the run closes here: its earned totals live on in lastRun only — a
    // save/refresh before the next run must not inherit them
    currentRunCoinsEarned: 0,
    currentRunRosesEarned: 0,
    currentRunRoadIds: [],
    lastRun: {
      result: "victory",
      coinsEarned: next.currentRunCoinsEarned,
      rosesEarned: next.currentRunRosesEarned,
      rescuedPrincess: true,
      routePackId: next.activeRoutePackId,
    },
  });
}

export function applyIncrementalEventReward(world: World, event: GameEvent): void {
  if (event.type === "zone:entered") {
    applyRoadTravelled(world, event);
    return;
  }
  if (event.type !== "enemy:defeated") return;
  const { archetypeId, bounty = 0 } = event;
  grantRunReward(world, "enemyDefeated");
  // warband reinforcements carry a bounty: the adversarial trade pays
  if (bounty > 0) bankCoins(world, bounty);
  if (!archetypeId || !enemies.archetypes[archetypeId]?.miniboss) return;

  // minibosses always pay a purse; the FIRST clean clear pays a rose
  grantRunReward(world, "minibossDefeated");
  const progress = currentProgress(world);
  if (!progress.defeatedMinibossIds.includes(archetypeId)) {
    grantRunReward(world, "objectiveCleared");
    const next = currentProgress(world);
    setProgress(world, {
      ...next,
      defeatedMinibossIds: [...next.defeatedMinibossIds, archetypeId],
    });
  }
}

/**
 * Travel pays (docs/INCREMENTAL-RESCUE-LOOP.md §currencies): the first
 * crossing of each road-waypoint zone per run banks roadTravelled coins.
 * currentRunRoadIds remembers crossings; run close resets it.
 */
function applyRoadTravelled(world: World, event: GameEvent): void {
  if (!event.mapId || !event.triggerId) return;
  const trigger = getMap(event.mapId).triggers?.find((entry) => entry.id === event.triggerId);
  if (trigger?.kind !== "road-waypoint") return;
  const key = `${event.mapId}:${event.triggerId}`;
  const progress = currentProgress(world);
  if (progress.currentRunRoadIds.includes(key)) return;
  setProgress(world, {
    ...progress,
    currentRunRoadIds: [...progress.currentRunRoadIds, key],
  });
  const base = incremental.runRewards.roadTravelled.perSegment ?? 0;
  bankCoins(world, base + checkpointBonus(progress));
}

/** Summed per-checkpoint coin bonus from owned economy upgrade ranks. */
export function checkpointBonus(progress: IncrementalProgressState): number {
  let bonus = 0;
  for (const node of incremental.upgradeGraph.nodes) {
    const perRank = node.effect?.checkpointBonus ?? 0;
    if (perRank) bonus += perRank * purchasedRank(progress, node);
  }
  return bonus;
}

/**
 * Death pays out: the run's banked coins stay banked and the run closes with
 * a gameover ledger entry instead of a wipe.
 */
export function recordDeathPayout(world: World): IncrementalProgressState {
  const progress = currentProgress(world);
  const next: IncrementalProgressState = {
    ...progress,
    // mirror the victory path: closing the run zeroes the live counters
    currentRunCoinsEarned: 0,
    currentRunRosesEarned: 0,
    currentRunRoadIds: [],
    lastRun: {
      result: "gameover",
      coinsEarned: progress.currentRunCoinsEarned,
      rosesEarned: progress.currentRunRosesEarned,
      rescuedPrincess: false,
      routePackId: progress.activeRoutePackId,
    },
  };
  setProgress(world, next);
  return next;
}

export interface UpgradePurchaseResult {
  ok: boolean;
  nodeId: string;
  label: string;
  reason?: "missing" | "purchased" | "locked" | "currency";
  message: string;
  coins: number;
  roses: number;
}

function nodeById(nodeId: string): IncrementalUpgradeNode | undefined {
  return incremental.upgradeGraph.nodes.find((node) => node.id === nodeId);
}

function canReachNode(progress: IncrementalProgressState, node: IncrementalUpgradeNode): boolean {
  return node.prerequisites.every((id) => progress.purchasedUpgradeIds.includes(id));
}

function hasCurrency(
  progress: IncrementalProgressState,
  price: { coins: number; roses: number },
): boolean {
  return progress.coins >= price.coins && progress.roses >= price.roses;
}

function addUnique(values: string[], value?: string): string[] {
  if (!value || values.includes(value)) return values;
  return [...values, value];
}

export function purchaseUpgradeNode(world: World, nodeId: string): UpgradePurchaseResult {
  const progress = currentProgress(world);
  const node = nodeById(nodeId);
  if (!node) {
    return {
      ok: false,
      nodeId,
      label: nodeId,
      reason: "missing",
      message: "That vow has not been written yet.",
      coins: progress.coins,
      roses: progress.roses,
    };
  }
  const ownedRanks = purchasedRank(progress, node);
  const maxRanks = nodeRanks(node);
  if (ownedRanks >= maxRanks) {
    return {
      ok: false,
      nodeId: node.id,
      label: node.label,
      reason: "purchased",
      message:
        maxRanks > 1
          ? `${node.label} is already at full rank.`
          : `${node.label} is already part of the tale.`,
      coins: progress.coins,
      roses: progress.roses,
    };
  }
  if (!canReachNode(progress, node)) {
    return {
      ok: false,
      nodeId: node.id,
      label: node.label,
      reason: "locked",
      message: `${node.label} needs a connected vow first.`,
      coins: progress.coins,
      roses: progress.roses,
    };
  }
  const price = rankCost(node, ownedRanks);
  if (!hasCurrency(progress, price)) {
    return {
      ok: false,
      nodeId: node.id,
      label: node.label,
      reason: "currency",
      message: `${node.label} asks for ${price.coins} coins and ${price.roses} roses.`,
      coins: progress.coins,
      roses: progress.roses,
    };
  }

  const nextRank = ownedRanks + 1;
  const next = {
    ...progress,
    coins: progress.coins - price.coins,
    roses: progress.roses - price.roses,
    purchasedUpgradeIds:
      ownedRanks === 0 ? [...progress.purchasedUpgradeIds, node.id] : progress.purchasedUpgradeIds,
    upgradeRanks:
      maxRanks > 1 ? { ...progress.upgradeRanks, [node.id]: nextRank } : progress.upgradeRanks,
    unlockedClassIds: addUnique(progress.unlockedClassIds, node.classId),
    unlockedRoutePackIds: addUnique(progress.unlockedRoutePackIds, node.routePack),
  };
  setProgress(world, next);
  const message =
    maxRanks > 1
      ? nextRank === 1
        ? `${node.label} joins the road (rank 1 of ${maxRanks}).`
        : `${node.label} advances to rank ${nextRank} of ${maxRanks}.`
      : `${node.label} joins the road.`;
  return {
    ok: true,
    nodeId: node.id,
    label: node.label,
    message,
    coins: next.coins,
    roses: next.roses,
  };
}
