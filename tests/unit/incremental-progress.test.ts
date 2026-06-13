import { describe, expect, it } from "vitest";
import { incremental, player as playerConfig } from "../../src/lib/config";
import { pushEvent } from "../../src/sim/events";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import {
  bankCoins,
  bankGems,
  bankRoses,
  grantRunReward,
  purchaseUpgradeNode,
  recordDeathPayout,
  sanitizeIncrementalProgress,
} from "../../src/sim/incrementalProgress";
import { step } from "../../src/sim/tick";
import { IncrementalProgress } from "../../src/sim/traits";

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
    expect(world.get(IncrementalProgress)?.coins).toBe(playerConfig.baseStats.gold);
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
    // the run closed: live counters reset so a refresh before the next run
    // cannot inherit the dead run's totals
    expect(progress?.currentRunCoinsEarned).toBe(0);
    expect(progress?.currentRunRosesEarned).toBe(0);
  });

  it("closes the ledger on death the same way victory does", () => {
    const world = createGameWorld(23);
    instantiateMap(world, "map:village", { classId: "knight" });
    grantRunReward(world, "enemyDefeated");

    const closed = recordDeathPayout(world);
    expect(closed.lastRun).toMatchObject({
      result: "gameover",
      rescuedPrincess: false,
      coinsEarned: incremental.runRewards.enemyDefeated.base,
    });
    expect(closed.currentRunCoinsEarned).toBe(0);
    expect(closed.currentRunRosesEarned).toBe(0);
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
      // wizard is now a known unlockable class (the offense-first trio's spell slot)
      unlockedClassIds: ["knight", "ranger", "wizard"],
      unlockedRoutePackIds: ["oldwood"],
    });
  });

  it("caps crafted wallets far beyond any reachable balance", () => {
    const progress = sanitizeIncrementalProgress(
      { coins: Number.MAX_SAFE_INTEGER, roses: Number.MAX_SAFE_INTEGER },
      0,
    );
    expect(progress.coins).toBe(1_000_000);
    expect(progress.roses).toBe(1_000_000);
  });

  it("holds the wallet cap on the WRITE path too (security review 2026-06-13)", () => {
    // banking can't push a balance past the cap the deserializer enforces, so a
    // long farm never persists a value the load-path would reject
    const world = createGameWorld(31);
    instantiateMap(world, "map:village", { classId: "knight" });
    bankCoins(world, 5_000_000);
    bankGems(world, 5_000_000);
    bankRoses(world, 5_000_000);
    const progress = world.get(IncrementalProgress);
    expect(progress?.coins).toBe(1_000_000);
    expect(progress?.gems).toBe(1_000_000);
    expect(progress?.roses).toBe(1_000_000);
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

    // class-unlock majors price in GEMS now (the dragon-hoard currency that
    // buys breadth — docs/RAIL-COMMAND.md §Three currencies)
    world.set(IncrementalProgress, {
      ...(world.get(IncrementalProgress) ?? sanitizeIncrementalProgress({}, 0)),
      gems: 10,
    });
    const bought = purchaseUpgradeNode(world, "upgrade:ranger-trail");
    expect(bought).toMatchObject({
      ok: true,
      nodeId: "upgrade:ranger-trail",
      gems: 2,
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
    expect(world.get(IncrementalProgress)?.coins).toBe(4);

    const third = purchaseUpgradeNode(world, "upgrade:knight-vigor");
    expect(third).toMatchObject({ ok: false, reason: "currency" });

    const roundTrip = sanitizeIncrementalProgress({
      ...world.get(IncrementalProgress),
    });
    expect(roundTrip.upgradeRanks["upgrade:knight-vigor"]).toBe(2);
  });
});
