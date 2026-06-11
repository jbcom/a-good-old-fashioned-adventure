import { describe, expect, it } from "vitest";
import { createGameWorld, instantiateMap, spawnEnemy, spawnPlayer } from "../../src/sim/factories";
import {
  FlagState,
  Health,
  IsEnemy,
  IsNpc,
  IsPlayer,
  IsSolid,
  LootContainer,
  MapRuntime,
  PropRef,
  SpriteRef,
  Transform,
} from "../../src/sim/traits";

describe("createGameWorld", () => {
  it("seeds world resources including flag defaults", () => {
    const world = createGameWorld(42);
    expect(world.get(FlagState)?.values).toEqual({
      "flag:approach-pilgrim-warned": false,
      "flag:bridge-fixed": false,
      "flag:castle-armory-seen": false,
      "flag:castle-letters-cleared": false,
      "flag:castle-library-read": false,
      "flag:fern-mender-greeted": false,
      "flag:has-dungeon-key": false,
      "flag:lost-page-guided": false,
      "flag:morning-errands-done": false,
      "flag:oldwood-oath-sworn": false,
      "flag:oldwood-roadward-mark": false,
      "flag:oldwood-thorncutter-greeted": false,
      "flag:oldwood-waystone-read": false,
      "flag:ruin-mural-read": false,
      "flag:shop-sample-claimed": false,
      "flag:stable-oats-bought": false,
      "flag:sunken-cart-read": false,
      "flag:sunken-courier-warned": false,
      "flag:tavern-song-learned": false,
      "flag:village-letter-basket-read": false,
    });
    expect(world.get(MapRuntime)?.mapId).toBe("");
  });
});

describe("spawnPlayer", () => {
  it("bundles class + base stats from config", () => {
    const world = createGameWorld();
    const player = spawnPlayer(world, "wizard", 10, 20);
    expect(player.get(Health)).toMatchObject({ hp: 100, maxHp: 100 });
    expect(player.get(SpriteRef)).toMatchObject({
      spriteId: "sprite:hero",
      paletteId: "palette:wizard",
    });
  });

  it("rejects unknown classes", () => {
    const world = createGameWorld();
    expect(() => spawnPlayer(world, "minstrel", 0, 0)).toThrow(/unknown class/);
  });
});

describe("spawnEnemy", () => {
  it("pulls stats from the archetype config", () => {
    const world = createGameWorld();
    const wyrm = spawnEnemy(world, "desert-wyrm", 680, 640);
    expect(wyrm.get(Health)).toMatchObject({ hp: 80, maxHp: 80 });
    expect(wyrm.get(SpriteRef)?.paletteId).toBe("palette:wyrm");
  });
});

describe("instantiateMap — overworld", () => {
  const world = createGameWorld();
  instantiateMap(world, "map:overworld", { classId: "knight" });

  it("builds the grid into MapRuntime", () => {
    const runtime = world.get(MapRuntime);
    expect(runtime?.cols).toBe(96);
    expect(runtime?.grid[28][32]).toBe("tile:water");
  });

  it("spawns the player at the map spawn point", () => {
    const player = world.queryFirst(IsPlayer);
    expect(player?.get(Transform)).toMatchObject({ x: 80, y: 190 });
  });

  it("spawns NPCs incl. the two unchosen companions", () => {
    const npcs = [...world.query(IsNpc)].map((e) => e.get(IsNpc)?.charId);
    expect(npcs).toContain("char:woodcutter");
    expect(npcs).toContain("char:gwydion");
    expect(npcs).toContain("char:companion-ranger");
    expect(npcs).toContain("char:companion-wizard");
    expect(npcs).not.toContain("char:companion-knight");
    expect(npcs).toHaveLength(4);
  });

  it("spawns enemies, chests, and the solid castle prop", () => {
    expect([...world.query(IsEnemy)]).toHaveLength(5);
    expect([...world.query(LootContainer)]).toHaveLength(2);
    const castle = [...world.query(PropRef)].find((e) => e.get(PropRef)?.propId === "prop:castle");
    expect(castle?.has(IsSolid)).toBe(true);
  });
});

describe("instantiateMap — transition preserves the player", () => {
  it("keeps player identity/stats, moves to the new spawn, swaps the cast", () => {
    const world = createGameWorld();
    instantiateMap(world, "map:overworld", { classId: "ranger" });
    const player = world.queryFirst(IsPlayer);
    player?.set(Health, { hp: 73, maxHp: 120 });

    instantiateMap(world, "map:castle-dungeon", { classId: "ranger" });

    const samePlayer = world.queryFirst(IsPlayer);
    expect(samePlayer?.get(Health)).toMatchObject({ hp: 73, maxHp: 120 });
    expect(samePlayer?.get(Transform)).toMatchObject({ x: 80, y: 250 });

    const npcs = [...world.query(IsNpc)].map((e) => e.get(IsNpc)?.charId);
    expect(npcs).toEqual(["char:princess-amber"]);
    expect([...world.query(IsEnemy)]).toHaveLength(4);
    expect(world.get(MapRuntime)?.mapId).toBe("map:castle-dungeon");
  });
});

describe("instantiateMap — named spawns", () => {
  it("moves the persistent player to a requested portal spawn", () => {
    const world = createGameWorld();
    instantiateMap(world, "map:village", { classId: "wizard" });
    const player = world.queryFirst(IsPlayer);
    player?.set(Health, { hp: 44, maxHp: 100 });

    instantiateMap(world, "map:village-house", { classId: "wizard", spawnId: "entry" });

    expect(world.get(MapRuntime)?.mapId).toBe("map:village-house");
    expect(world.queryFirst(IsPlayer)).toBe(player);
    expect(player?.get(Transform)).toMatchObject({ x: 192, y: 180 });
    expect(player?.get(Health)).toMatchObject({ hp: 44, maxHp: 100 });
  });

  it("fails loud when content references an unknown spawn", () => {
    const world = createGameWorld();
    expect(() =>
      instantiateMap(world, "map:village-house", { classId: "knight", spawnId: "loft" }),
    ).toThrow(/unknown spawn loft/);
  });
});
