import { describe, expect, it } from "vitest";
import { incremental } from "../../src/lib/config";
import { runRail } from "../../src/sim/battleHarness";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { initialIncrementalProgress } from "../../src/sim/incrementalProgress";
import { deepestLairRoom, princessMap } from "../../src/sim/mapProgression";
import {
  DragonBuff,
  Health,
  IncrementalProgress,
  IsEnemy,
  KinIdentity,
} from "../../src/sim/traits";

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

  it("every lair room is a playable rail — sparse on no unlocks, dense on full", () => {
    // a lair room is a zone-based rail (docs/RAIL-COMMAND.md §maps are zones, not
    // enemies): with NO enemies unlocked it is a clear walk to the room's end;
    // with the region's enemies unlocked, waves spawn from the unlocked
    // permutation at the room's gates and the line FARMS. Both must hold.
    const roomMaps = new Set<string>();
    for (const node of incremental.upgradeGraph.nodes) {
      if (node.lairRoom) roomMaps.add(node.lairRoom.roomMap);
    }
    expect(roomMaps.size, "at least one lair room authored").toBeGreaterThan(0);

    const classes = ["knight", "ranger", "wizard"];
    const baseUpgrades = ["upgrade:first-vow", "upgrade:ranger-trail", "upgrade:wizard-focus"];
    // a full enemy-unlock set across the early/mid regions so any lair room's
    // region pool has something to draw from
    const fullUnlocks = [
      ...baseUpgrades,
      "upgrade:dragon-wake",
      "upgrade:unlock-forest-orc",
      "upgrade:unlock-oldwood-raider",
      "upgrade:unlock-orc-scout",
      "upgrade:unlock-thorn-shaman",
      "upgrade:unlock-bramble-stalker",
      "upgrade:warband-of-one",
    ];

    for (const roomMap of roomMaps) {
      // sparse: no enemy unlocks → the bare room is a clear walk to the end
      const sparse = runRail({
        unlockedClassIds: classes,
        purchasedUpgradeIds: baseUpgrades,
        mapId: roomMap,
        seed: 5,
        maxTicks: 60 * 90,
      });
      expect(sparse.advance, `${roomMap} stranded the line when bare`).toBeGreaterThan(0.4);

      // dense: the region's enemies unlocked → waves spawn at the gates and farm
      const dense = runRail({
        unlockedClassIds: classes,
        purchasedUpgradeIds: fullUnlocks,
        upgradeRanks: { "upgrade:warband-of-one": 4 },
        mapId: roomMap,
        seed: 5,
        maxTicks: 60 * 90,
      });
      expect(
        dense.enemiesFelled > 0 || dense.coins > 0,
        `${roomMap} spawned no waves from the unlocked set — its spawn zones may be unwired`,
      ).toBe(true);
    }
  });

  it("relocates the DRAGON into the deepest lair room when its kin is unlocked", () => {
    // pick the deepest lair room of a map whose kin can be unlocked
    const lairNodes = incremental.upgradeGraph.nodes.filter((n) => n.lairRoom);
    const deepest = lairNodes.reduce((a, b) =>
      (a.lairRoom?.depth ?? 0) >= (b.lairRoom?.depth ?? 0) ? a : b,
    );
    const parentMap = deepest.lairRoom?.mapId as string;
    const roomMap = deepest.lairRoom?.roomMap as string;
    const kinNode = incremental.upgradeGraph.nodes.find((n) => n.dragonKin?.mapId === parentMap);
    expect(kinNode, "the lair's parent map has a kin").toBeTruthy();

    // unlock the lair (all rooms) AND the kin, then instantiate the deepest room
    const lairRoomIds = lairNodes.filter((n) => n.lairRoom?.mapId === parentMap).map((n) => n.id);
    const world = createGameWorld(12);
    instantiateMap(world, roomMap, { classId: "knight" });
    const base = world.get(IncrementalProgress);
    if (!base) throw new Error("no progress");
    const unlocked = {
      ...base,
      purchasedUpgradeIds: [...base.purchasedUpgradeIds, ...lairRoomIds, kinNode?.id as string],
      // unlock all route packs so currentMap reaches the parent map
      unlockedRoutePackIds: incremental.routePacks.map((p) => p.id),
    };
    world.set(IncrementalProgress, unlocked);
    instantiateMap(world, roomMap, { classId: "knight" });

    // the kin dragon now holds the princess in the deepest lair room
    const kinBoss = [...world.query(IsEnemy, KinIdentity)].filter(
      (e) => e.get(KinIdentity)?.mapId === parentMap,
    );
    expect(kinBoss.length, "the dragon relocated into the lair").toBeGreaterThan(0);
  });

  it("the lair-relocated dragon gets the dragon-might HP boost (open-map parity)", () => {
    // reviewer 2026-06-13: a buffed kin must be just as tanky in the lair as on
    // its open map — the HP boost is applied at BOTH spawn sites identically
    const lairNodes = incremental.upgradeGraph.nodes.filter((n) => n.lairRoom);
    const deepest = lairNodes.reduce((a, b) =>
      (a.lairRoom?.depth ?? 0) >= (b.lairRoom?.depth ?? 0) ? a : b,
    );
    const parentMap = deepest.lairRoom?.mapId as string;
    const roomMap = deepest.lairRoom?.roomMap as string;
    const kinNode = incremental.upgradeGraph.nodes.find((n) => n.dragonKin?.mapId === parentMap);
    const mightId = `upgrade:dragon-might-${parentMap.replace(/^map:/, "")}`;
    const lairRoomIds = lairNodes.filter((n) => n.lairRoom?.mapId === parentMap).map((n) => n.id);

    const world = createGameWorld(21);
    instantiateMap(world, roomMap, { classId: "knight" });
    const base = world.get(IncrementalProgress);
    if (!base || !kinNode) throw new Error("missing setup");
    world.set(IncrementalProgress, {
      ...base,
      purchasedUpgradeIds: [...base.purchasedUpgradeIds, ...lairRoomIds, kinNode.id, mightId],
      upgradeRanks: { [mightId]: 1 },
      unlockedRoutePackIds: incremental.routePacks.map((p) => p.id),
    });
    instantiateMap(world, roomMap, { classId: "knight" });

    const kinBoss = [...world.query(IsEnemy, KinIdentity, DragonBuff)].find(
      (e) => e.get(KinIdentity)?.mapId === parentMap,
    );
    expect(kinBoss, "the buffed dragon relocated into the lair").toBeTruthy();
    const health = kinBoss?.get(Health);
    // a might-buffed kin is tankier than the base 60hp dragon-guardian
    expect(health?.maxHp ?? 0).toBeGreaterThan(60);
  });

  it("the lair holds only the princess when the dragon is NOT unlocked", () => {
    const lairNodes = incremental.upgradeGraph.nodes.filter((n) => n.lairRoom);
    const deepest = lairNodes.reduce((a, b) =>
      (a.lairRoom?.depth ?? 0) >= (b.lairRoom?.depth ?? 0) ? a : b,
    );
    const parentMap = deepest.lairRoom?.mapId as string;
    const roomMap = deepest.lairRoom?.roomMap as string;
    const lairRoomIds = lairNodes.filter((n) => n.lairRoom?.mapId === parentMap).map((n) => n.id);

    const world = createGameWorld(13);
    instantiateMap(world, roomMap, { classId: "knight" });
    const base = world.get(IncrementalProgress);
    if (!base) throw new Error("no progress");
    // unlock the lair but NOT the kin
    world.set(IncrementalProgress, {
      ...base,
      purchasedUpgradeIds: [...base.purchasedUpgradeIds, ...lairRoomIds],
    });
    instantiateMap(world, roomMap, { classId: "knight" });

    const kinBoss = [...world.query(IsEnemy, KinIdentity)].filter(
      (e) => e.get(KinIdentity)?.mapId === parentMap,
    );
    expect(kinBoss.length, "no dragon injected without its kin unlocked").toBe(0);
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
