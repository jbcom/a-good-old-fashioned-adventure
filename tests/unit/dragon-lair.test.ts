import { describe, expect, it } from "vitest";
import { incremental } from "../../src/lib/config";
import { runRail } from "../../src/sim/battleHarness";
import { initialIncrementalProgress } from "../../src/sim/incrementalProgress";
import { deepestLairRoom, princessMap } from "../../src/sim/mapProgression";

/**
 * The Dragon's Lair (docs/RAIL-COMMAND.md §Each map's FOUR sub-tracks): a
 * themed multi-room dungeon per map. Unlocking the lair relocates the princess
 * into its deepest unlocked room. These cover the resolver and the relocation.
 */
describe("dragon's lair", () => {
  it("resolves null when the lair is not unlocked", () => {
    const fresh = initialIncrementalProgress();
    expect(deepestLairRoom(fresh, "map:rescue-route")).toBeNull();
  });

  it("relocates the princess into the deepest unlocked lair room", () => {
    // find the lair room nodes for the first map that has a lair
    const lairNodes = incremental.upgradeGraph.nodes
      .filter((n) => n.lairRoom)
      .sort((a, b) => (a.lairRoom?.depth ?? 0) - (b.lairRoom?.depth ?? 0));
    expect(lairNodes.length, "at least one lair authored").toBeGreaterThan(0);

    const mapId = lairNodes[0].lairRoom?.mapId as string;
    const roomsForMap = lairNodes.filter((n) => n.lairRoom?.mapId === mapId);
    expect(roomsForMap.length, "the lair has rooms").toBeGreaterThan(0);

    // unlock the lair entrance (room 1) — princess moves into it
    const fresh = initialIncrementalProgress();
    // make the lair's map the furthest unlocked so currentMap == mapId
    const withMap = unlockUpTo(fresh, mapId);
    const room1 = roomsForMap.find((n) => n.lairRoom?.depth === 1);
    if (!room1) throw new Error("no room 1");
    const afterRoom1 = {
      ...withMap,
      purchasedUpgradeIds: [...withMap.purchasedUpgradeIds, room1.id],
    };
    const deepest1 = deepestLairRoom(afterRoom1, mapId);
    expect(deepest1?.roomMap).toBe(room1.lairRoom?.roomMap);
    expect(princessMap(afterRoom1)).toBe(room1.lairRoom?.roomMap);

    // unlock a deeper room if one exists — princess moves further in
    const room2 = roomsForMap.find((n) => n.lairRoom?.depth === 2);
    if (room2) {
      const afterRoom2 = {
        ...afterRoom1,
        purchasedUpgradeIds: [...afterRoom1.purchasedUpgradeIds, room2.id],
      };
      expect(deepestLairRoom(afterRoom2, mapId)?.depth).toBe(2);
      expect(princessMap(afterRoom2)).toBe(room2.lairRoom?.roomMap);
    }
  });

  it("every lair room is a playable rail (advances and farms or wins)", () => {
    // each room a player can be relocated into must be a real playable rail
    // (docs/RAIL-COMMAND.md §Each map's FOUR sub-tracks — a room is a rail)
    const roomMaps = new Set<string>();
    for (const node of incremental.upgradeGraph.nodes) {
      if (node.lairRoom) roomMaps.add(node.lairRoom.roomMap);
    }
    expect(roomMaps.size, "at least one lair room authored").toBeGreaterThan(0);
    for (const roomMap of roomMaps) {
      const r = runRail({
        unlockedClassIds: ["knight", "ranger", "wizard"],
        purchasedUpgradeIds: [
          "upgrade:first-vow",
          "upgrade:ranger-trail",
          "upgrade:wizard-focus",
          "upgrade:warband-of-one",
        ],
        upgradeRanks: { "upgrade:warband-of-one": 4 },
        mapId: roomMap,
        seed: 5,
        maxTicks: 60 * 90,
      });
      expect(r.advance, `${roomMap} stranded the line`).toBeGreaterThan(0.4);
      expect(
        r.reachedEnd || r.enemiesFelled > 0 || r.coins > 0,
        `${roomMap} neither won nor farmed`,
      ).toBe(true);
    }
  });

  it("lair rooms form a clean depth chain (1, 2, …) per map", () => {
    const byMap = new Map<string, number[]>();
    for (const node of incremental.upgradeGraph.nodes) {
      const room = node.lairRoom;
      if (!room) continue;
      const depths = byMap.get(room.mapId) ?? [];
      depths.push(room.depth);
      byMap.set(room.mapId, depths);
    }
    for (const [mapId, depths] of byMap) {
      const sorted = [...depths].sort((a, b) => a - b);
      // depths start at 1 and are contiguous (no gaps, no dupes)
      expect(sorted[0], `${mapId} lair starts at room 1`).toBe(1);
      for (let i = 0; i < sorted.length; i++) {
        expect(sorted[i], `${mapId} lair depth chain is contiguous`).toBe(i + 1);
      }
    }
  });
});

/** Unlock route packs so currentMap reaches `mapId` (test helper). */
function unlockUpTo(progress: ReturnType<typeof initialIncrementalProgress>, mapId: string) {
  const packs: string[] = [];
  for (const pack of incremental.routePacks) {
    packs.push(pack.id);
    if (pack.maps.includes(mapId)) break;
  }
  return { ...progress, unlockedRoutePackIds: packs };
}
