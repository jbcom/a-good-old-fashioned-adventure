import type { World } from "koota";
import type { IncrementalUpgradeNode } from "../lib/config";
import { incremental } from "../lib/config";
import { IncrementalProgress, type IncrementalProgressState, IsPlayer, PlayerGold } from "./traits";

function integer(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
}

function knownUpgradeIds(): Set<string> {
  return new Set(incremental.upgradeWeb.nodes.map((node) => node.id));
}

function knownClassIds(): Set<string> {
  return new Set([incremental.classes.starting, ...incremental.classes.unlockable]);
}

function knownRoutePackIds(): Set<string> {
  return new Set(incremental.routePacks.map((pack) => pack.id));
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
    purchasedUpgradeIds: [incremental.upgradeWeb.root],
    unlockedClassIds: [incremental.classes.starting],
    unlockedRoutePackIds: [],
    currentRunCoinsEarned: 0,
    currentRunRosesEarned: 0,
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
  const purchasedUpgradeIds = sanitizeIdList(data.purchasedUpgradeIds, knownUpgradeIds());
  const unlockedClassIds = sanitizeIdList(data.unlockedClassIds, knownClassIds());
  const unlockedRoutePackIds = sanitizeIdList(data.unlockedRoutePackIds, knownRoutePackIds());
  const activeRoutePackId =
    typeof data.activeRoutePackId === "string" &&
    (data.activeRoutePackId === "baseline" || knownRoutePackIds().has(data.activeRoutePackId))
      ? data.activeRoutePackId
      : "baseline";
  return {
    coins: integer(data.coins, fallbackCoins),
    roses: integer(data.roses),
    rescueCount: integer(data.rescueCount),
    purchasedUpgradeIds: purchasedUpgradeIds.includes(incremental.upgradeWeb.root)
      ? purchasedUpgradeIds
      : [incremental.upgradeWeb.root, ...purchasedUpgradeIds],
    unlockedClassIds: unlockedClassIds.includes(incremental.classes.starting)
      ? unlockedClassIds
      : [incremental.classes.starting, ...unlockedClassIds],
    unlockedRoutePackIds,
    currentRunCoinsEarned: integer(data.currentRunCoinsEarned),
    currentRunRosesEarned: integer(data.currentRunRosesEarned),
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

function currentProgress(world: World): IncrementalProgressState {
  const existing = world.get(IncrementalProgress);
  if (existing) return existing;
  const next = initialIncrementalProgress();
  world.add(IncrementalProgress(next));
  return next;
}

function setProgress(world: World, next: IncrementalProgressState): void {
  world.set(IncrementalProgress, next);
}

function syncPlayerCoins(world: World, coins: number): void {
  const player = world.queryFirst(IsPlayer);
  if (player?.has(PlayerGold)) player.set(PlayerGold, { value: coins });
}

export function restoreIncrementalProgress(
  world: World,
  input: unknown,
  fallbackCoins = 0,
): IncrementalProgressState {
  const next = sanitizeIncrementalProgress(input, fallbackCoins);
  setProgress(world, next);
  syncPlayerCoins(world, next.coins);
  return next;
}

export function syncProgressCoinsFromPlayer(world: World): IncrementalProgressState {
  const progress = currentProgress(world);
  const playerCoins = world.queryFirst(IsPlayer)?.get(PlayerGold)?.value;
  if (playerCoins === undefined || playerCoins === progress.coins) return progress;
  const next = { ...progress, coins: playerCoins };
  setProgress(world, next);
  return next;
}

function addCoins(world: World, amount: number): void {
  if (amount <= 0) return;
  const progress = currentProgress(world);
  const coins = progress.coins + amount;
  setProgress(world, {
    ...progress,
    coins,
    currentRunCoinsEarned: progress.currentRunCoinsEarned + amount,
  });
  syncPlayerCoins(world, coins);
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
  return next;
}

export function grantRunReward(world: World, rewardId: string): void {
  const reward = incremental.runRewards[rewardId];
  if (!reward) return;
  if (reward.currency === "coins") {
    addCoins(world, reward.base ?? 0);
    return;
  }

  const next = addRoses(world, reward.base ?? 0);
  if (rewardId !== "princessRescued") return;
  const rescueCount = next.rescueCount + 1;
  setProgress(world, {
    ...next,
    rescueCount,
    lastRun: {
      result: "victory",
      coinsEarned: next.currentRunCoinsEarned,
      rosesEarned: next.currentRunRosesEarned,
      rescuedPrincess: true,
      routePackId: next.activeRoutePackId,
    },
  });
}

export function applyIncrementalEventReward(world: World, eventType: string): void {
  if (eventType === "enemy:defeated") grantRunReward(world, "enemyDefeated");
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
  return incremental.upgradeWeb.nodes.find((node) => node.id === nodeId);
}

function canReachNode(progress: IncrementalProgressState, node: IncrementalUpgradeNode): boolean {
  return node.prerequisites.every((id) => progress.purchasedUpgradeIds.includes(id));
}

function hasCurrency(progress: IncrementalProgressState, node: IncrementalUpgradeNode): boolean {
  return progress.coins >= (node.cost.coins ?? 0) && progress.roses >= (node.cost.roses ?? 0);
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
  if (progress.purchasedUpgradeIds.includes(node.id)) {
    return {
      ok: false,
      nodeId: node.id,
      label: node.label,
      reason: "purchased",
      message: `${node.label} is already part of the tale.`,
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
  if (!hasCurrency(progress, node)) {
    return {
      ok: false,
      nodeId: node.id,
      label: node.label,
      reason: "currency",
      message: `${node.label} asks for ${node.cost.coins ?? 0} coins and ${
        node.cost.roses ?? 0
      } roses.`,
      coins: progress.coins,
      roses: progress.roses,
    };
  }

  const next = {
    ...progress,
    coins: progress.coins - (node.cost.coins ?? 0),
    roses: progress.roses - (node.cost.roses ?? 0),
    purchasedUpgradeIds: [...progress.purchasedUpgradeIds, node.id],
    unlockedClassIds: addUnique(progress.unlockedClassIds, node.classId),
    unlockedRoutePackIds: addUnique(progress.unlockedRoutePackIds, node.routePack),
  };
  setProgress(world, next);
  syncPlayerCoins(world, next.coins);
  return {
    ok: true,
    nodeId: node.id,
    label: node.label,
    message: `${node.label} joins the road.`,
    coins: next.coins,
    roses: next.roses,
  };
}
