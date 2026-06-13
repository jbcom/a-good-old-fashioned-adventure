import { describe, expect, it } from "vitest";
import { incremental } from "../../src/lib/config";
import { createGameWorld, instantiateMap, spawnEnemy } from "../../src/sim/factories";
import {
  applyIncrementalEventReward,
  currentProgress,
  initialIncrementalProgress,
  kinForMap,
  sanitizeIncrementalProgress,
} from "../../src/sim/incrementalProgress";
import { IncrementalProgress, IsEnemy, KinIdentity } from "../../src/sim/traits";

/**
 * The dragon's kin (docs/RAIL-COMMAND.md §dragon's kin): each spine map's
 * guardian is a tracked relative recolored from the green High Dragon. These
 * cover the sim-side identity — the resolver, the spawn tag, the defeat
 * tracking, and the sanitize floor.
 */
describe("dragon kin identity", () => {
  it("resolves the unlocked kin for a map, null when not unlocked", () => {
    const fresh = initialIncrementalProgress();
    expect(kinForMap(fresh, "map:rescue-route")).toBeNull();

    // unlock the rescue-route kin
    const unlocked = {
      ...fresh,
      purchasedUpgradeIds: [...fresh.purchasedUpgradeIds, "upgrade:dragon-kin-rescue-route"],
    };
    const kin = kinForMap(unlocked, "map:rescue-route");
    expect(kin).not.toBeNull();
    expect(kin?.relation).toBe("brother");
    expect(kin?.hue).toBeGreaterThan(0);
    expect(kin?.mapId).toBe("map:rescue-route");
  });

  it("every spine map has a kin node with a distinct relation and hue", () => {
    const kinNodes = incremental.upgradeGraph.nodes.filter((n) => n.dragonKin);
    const relations = kinNodes.map((n) => n.dragonKin?.relation);
    const hues = kinNodes.map((n) => n.dragonKin?.hue);
    // one kin per spine map
    expect(kinNodes.length).toBe(incremental.mapDag.order.length);
    // relations are unique (the Mario family tree)
    expect(new Set(relations).size).toBe(relations.length);
    // hues are unique (each kin reads as a different color)
    expect(new Set(hues).size).toBe(hues.length);
  });

  it("tags a dragon-family boss with KinIdentity when its kin is unlocked", () => {
    const world = createGameWorld(7);
    instantiateMap(world, "map:rescue-route", { classId: "knight" });
    const progress = world.get(IncrementalProgress);
    if (!progress) throw new Error("no progress");
    world.set(IncrementalProgress, {
      ...progress,
      purchasedUpgradeIds: [...progress.purchasedUpgradeIds, "upgrade:dragon-kin-rescue-route"],
    });
    // re-instantiate so the boss spawns with the kin unlocked
    instantiateMap(world, "map:rescue-route", { classId: "knight" });

    const bosses = [...world.query(IsEnemy, KinIdentity)];
    expect(bosses.length).toBeGreaterThan(0);
    expect(bosses[0].get(KinIdentity)?.relation).toBe("brother");
  });

  it("records a felled kin's relation in defeatedKinRelations, once", () => {
    const world = createGameWorld(8);
    instantiateMap(world, "map:rescue-route", { classId: "knight" });
    spawnEnemy(world, "dragon-guardian", 100, 100);

    applyIncrementalEventReward(world, {
      type: "enemy:defeated",
      archetypeId: "dragon-guardian",
      kinRelation: "brother",
    });
    expect(currentProgress(world).defeatedKinRelations).toEqual(["brother"]);

    // felling the same relation again does not duplicate it
    applyIncrementalEventReward(world, {
      type: "enemy:defeated",
      archetypeId: "dragon-guardian",
      kinRelation: "brother",
    });
    expect(currentProgress(world).defeatedKinRelations).toEqual(["brother"]);
  });

  it("sanitizes defeatedKinRelations to the known relation set", () => {
    const dirty = sanitizeIncrementalProgress({
      defeatedKinRelations: ["brother", "not-a-real-relation", "uncle", 42, "brother"],
    });
    // known relations kept, unknown/duplicate/non-string dropped
    expect(dirty.defeatedKinRelations).toEqual(["brother", "uncle"]);
  });
});
