import { describe, expect, it } from "vitest";
import { incremental, player as playerConfig } from "../../src/lib/config";
import { pushEvent } from "../../src/sim/events";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import {
  grantRunReward,
  purchaseUpgradeNode,
  sanitizeIncrementalProgress,
} from "../../src/sim/incrementalProgress";
import { step } from "../../src/sim/tick";
import { IncrementalProgress, IsPlayer, PlayerGold } from "../../src/sim/traits";

describe("incremental progression state", () => {
  it("boots with the first vow, knight, and starting coin balance", () => {
    const world = createGameWorld(19);
    instantiateMap(world, "map:village", { classId: "knight" });

    expect(world.get(IncrementalProgress)).toMatchObject({
      coins: playerConfig.baseStats.gold,
      roses: 0,
      rescueCount: 0,
      purchasedUpgradeIds: [incremental.upgradeGraph.root],
      unlockedClassIds: ["knight"],
      unlockedRoutePackIds: [],
    });
    expect(world.queryFirst(IsPlayer)?.get(PlayerGold)?.value).toBe(playerConfig.baseStats.gold);
  });

  it("turns enemy defeat events into common coins without bypassing the event reducer", () => {
    const world = createGameWorld(19);
    instantiateMap(world, "map:village", { classId: "knight" });
    const startingCoins = world.get(IncrementalProgress)?.coins ?? 0;

    pushEvent(world, { type: "enemy:defeated", archetypeId: "forest-orc", x: 10, y: 10 });
    step(world, 0);

    const reward = incremental.runRewards.enemyDefeated.base ?? 0;
    expect(world.get(IncrementalProgress)).toMatchObject({
      coins: startingCoins + reward,
      currentRunCoinsEarned: reward,
    });
    expect(world.queryFirst(IsPlayer)?.get(PlayerGold)?.value).toBe(startingCoins + reward);
  });

  it("records princess rescue as a rare rose payout and last-run summary", () => {
    const world = createGameWorld(19);
    instantiateMap(world, "map:castle-dungeon", { classId: "knight" });

    grantRunReward(world, "enemyDefeated");
    grantRunReward(world, "princessRescued");

    const progress = world.get(IncrementalProgress);
    expect(progress?.roses).toBe(incremental.runRewards.princessRescued.base);
    expect(progress?.rescueCount).toBe(1);
    expect(progress?.lastRun).toMatchObject({
      result: "victory",
      rescuedPrincess: true,
      coinsEarned: incremental.runRewards.enemyDefeated.base,
      rosesEarned: incremental.runRewards.princessRescued.base,
      routePackId: "baseline",
    });
  });

  it("sanitizes save payloads while preserving unlocked upgrades, classes, and route packs", () => {
    const progress = sanitizeIncrementalProgress(
      {
        coins: 41.8,
        roses: 4.2,
        rescueCount: 2.9,
        purchasedUpgradeIds: ["upgrade:first-vow", "upgrade:oldwood-bend", "bad"],
        unlockedClassIds: ["knight", "ranger", "wizard"],
        unlockedRoutePackIds: ["oldwood", "unknown"],
      },
      12,
    );

    expect(progress).toMatchObject({
      coins: 41,
      roses: 4,
      rescueCount: 2,
      purchasedUpgradeIds: ["upgrade:first-vow", "upgrade:oldwood-bend"],
      unlockedClassIds: ["knight", "ranger"],
      unlockedRoutePackIds: ["oldwood"],
    });
  });

  it("buys only connected and affordable upgrade nodes, unlocking classes and route packs", () => {
    const world = createGameWorld(19);
    instantiateMap(world, "map:village", { classId: "knight" });

    expect(purchaseUpgradeNode(world, "upgrade:rogue-shortcut")).toMatchObject({
      ok: false,
      reason: "locked",
    });
    expect(purchaseUpgradeNode(world, "upgrade:oldwood-bend")).toMatchObject({
      ok: false,
      reason: "currency",
    });

    world.set(IncrementalProgress, {
      ...(world.get(IncrementalProgress) ?? sanitizeIncrementalProgress({}, 0)),
      roses: 2,
    });
    const bought = purchaseUpgradeNode(world, "upgrade:ranger-trail");
    expect(bought).toMatchObject({
      ok: true,
      nodeId: "upgrade:ranger-trail",
      roses: 1,
    });
    expect(world.get(IncrementalProgress)).toMatchObject({
      purchasedUpgradeIds: ["upgrade:first-vow", "upgrade:ranger-trail"],
      unlockedClassIds: ["knight", "ranger"],
    });
  });

  it("ranks up coin tracks with growing prices until full rank", () => {
    const world = createGameWorld(20);
    instantiateMap(world, "map:village", { classId: "knight" });
    world.set(IncrementalProgress, {
      ...(world.get(IncrementalProgress) ?? sanitizeIncrementalProgress({}, 0)),
      coins: 30,
    });

    const first = purchaseUpgradeNode(world, "upgrade:knight-vigor");
    expect(first).toMatchObject({ ok: true, coins: 20 });
    expect(first.message).toContain("rank 1 of 5");

    const second = purchaseUpgradeNode(world, "upgrade:knight-vigor");
    expect(second).toMatchObject({ ok: true, coins: 4 });
    expect(second.message).toContain("rank 2 of 5");

    expect(world.get(IncrementalProgress)).toMatchObject({
      upgradeRanks: { "upgrade:knight-vigor": 2 },
    });
    expect(world.queryFirst(IsPlayer)?.get(PlayerGold)?.value).toBe(4);

    const third = purchaseUpgradeNode(world, "upgrade:knight-vigor");
    expect(third).toMatchObject({ ok: false, reason: "currency" });

    const roundTrip = sanitizeIncrementalProgress({
      ...world.get(IncrementalProgress),
    });
    expect(roundTrip.upgradeRanks["upgrade:knight-vigor"]).toBe(2);
  });
});
