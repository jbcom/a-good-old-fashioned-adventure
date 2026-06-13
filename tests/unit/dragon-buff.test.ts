import { describe, expect, it } from "vitest";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { dragonBuffFor, initialIncrementalProgress } from "../../src/sim/incrementalProgress";
import { DragonBuff, IncrementalProgress, IsEnemy, KinIdentity } from "../../src/sim/traits";

/**
 * The Dragon track BUFFS the dragon (docs/RAIL-COMMAND.md §The Dragon track
 * BUFFS the dragon): purchased dragon-might ranks widen the kin's volley
 * (multi-attack), grow its fireball AoE, and raise the rescue reward.
 */
describe("dragon combat buffs", () => {
  it("is neutral with no might ranks, scales per rank", () => {
    const fresh = initialIncrementalProgress();
    const neutral = dragonBuffFor(fresh, "map:rescue-route");
    expect(neutral.extraBolts).toBe(0);
    expect(neutral.aoeRadius).toBe(0);
    expect(neutral.rewardMult).toBe(1);

    const ranked = {
      ...fresh,
      purchasedUpgradeIds: [
        ...fresh.purchasedUpgradeIds,
        "upgrade:dragon-kin-rescue-route",
        "upgrade:dragon-might-rescue-route",
      ],
      upgradeRanks: { "upgrade:dragon-might-rescue-route": 2 },
    };
    const buff = dragonBuffFor(ranked, "map:rescue-route");
    expect(buff.extraBolts).toBe(4); // 2 ranks × 2 bolts
    expect(buff.aoeRadius).toBeGreaterThan(0);
    expect(buff.rewardMult).toBeGreaterThan(1); // a buffed dragon pays more
  });

  it("applies DragonBuff to the spawned kin boss when might is bought", () => {
    const world = createGameWorld(9);
    instantiateMap(world, "map:rescue-route", { classId: "knight" });
    const progress = world.get(IncrementalProgress);
    if (!progress) throw new Error("no progress");
    world.set(IncrementalProgress, {
      ...progress,
      purchasedUpgradeIds: [
        ...progress.purchasedUpgradeIds,
        "upgrade:dragon-kin-rescue-route",
        "upgrade:dragon-might-rescue-route",
      ],
      upgradeRanks: { "upgrade:dragon-might-rescue-route": 1 },
    });
    instantiateMap(world, "map:rescue-route", { classId: "knight" });

    const buffedBoss = [...world.query(IsEnemy, KinIdentity, DragonBuff)];
    expect(buffedBoss.length, "the kin boss carries a DragonBuff").toBeGreaterThan(0);
    expect(buffedBoss[0].get(DragonBuff)?.extraBolts).toBe(2);
  });
});
