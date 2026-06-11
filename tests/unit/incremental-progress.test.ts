import { describe, expect, it } from "vitest";
import { incremental, player as playerConfig } from "../../src/lib/config";
import { pushEvent } from "../../src/sim/events";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { grantRunReward, sanitizeIncrementalProgress } from "../../src/sim/incrementalProgress";
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
      purchasedUpgradeIds: [incremental.upgradeWeb.root],
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
});
