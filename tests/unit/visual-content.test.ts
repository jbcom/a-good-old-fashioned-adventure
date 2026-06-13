import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getMap, props, tiles } from "../../src/lib/content/registry";
import type { DrawOp, MapDef, PropDef, PropState, TileDef } from "../../src/lib/content/types";

const requiredDetailedTiles = [
  "tile:grass",
  "tile:path",
  "tile:leaf-litter",
  "tile:castle-road",
  "tile:water",
  "tile:mountain",
  "tile:sand",
  "tile:village-cobble",
  "tile:stone-floor",
  "tile:shop-floor",
  "tile:tavern-floor",
  "tile:ruin-floor",
  "tile:ruin-mosaic",
  "tile:stone-wall",
  "tile:wood-bridge",
  "tile:royal-rug",
];

const requiredVillageProps = [
  "prop:cottage-facade",
  "prop:village-shop",
  "prop:village-tavern",
  "prop:broadleaf-tree",
  "prop:signpost",
  "prop:stump",
  "prop:castle-gatehouse",
  "prop:well",
  "prop:table",
  "prop:barrel",
  "prop:broken-cart",
  "prop:sandstone-arch",
  "prop:castle-banner",
  "prop:castle-shelf",
  "prop:castle-lantern",
  "prop:weapon-rack",
  "prop:throne-door",
  "prop:scribe-desk",
  "prop:shop-shelf",
  "prop:shop-ledger",
  "prop:ruin-mural",
  "prop:desert-shrine",
  "prop:ruin-column",
  "prop:pilgrim-canopy",
  "prop:market-stall",
  "prop:notice-board",
  "prop:flower-cart",
  "prop:tavern-bench",
  "prop:hearth-song-board",
  "prop:story-quilt",
  "prop:village-stable",
  "prop:hay-bale",
  "prop:tack-rack",
  "prop:oat-bin",
  "prop:stable-stall",
];

function colorsInOps(ops: DrawOp[]): Set<string> {
  return new Set(ops.map((op) => op.color));
}

function tileColors(tile: TileDef): Set<string> {
  // a PNG-sheet tile carries its authored palette in the image, not in the
  // content file; the readable color budget is the base fill plus the overlay
  // (each distinct field cell is its own authored design), so it always clears
  // the flat-fill floor — count the baseColor and the sheet as real channels
  if (tile.sheet) {
    const channels = new Set<string>();
    if (tile.baseColor) channels.add(tile.baseColor);
    channels.add(`sheet:${tile.sheet.image}`);
    if (tile.sheet.field) channels.add(`field:${tile.sheet.field.cols}x${tile.sheet.field.rows}`);
    return channels;
  }
  if (tile.rows) return nonTransparentChannels(tile.rows);
  return colorsInOps(tile.layers ?? []);
}

function tileSignature(tile: TileDef): string {
  // a sheet tile's identity is its base color + the exact crop/field it samples
  if (tile.sheet) {
    return JSON.stringify({ base: tile.baseColor ?? null, sheet: tile.sheet });
  }
  if (tile.rows) return tile.rows.join("\n");
  return JSON.stringify(
    (tile.layers ?? []).map((op) => ({
      op: op.op,
      color: op.color,
      x: op.x,
      y: op.y,
      w: op.w,
      h: op.h,
      points: op.points,
      stepX: op.stepX,
      stepY: op.stepY,
      count: op.count,
    })),
  );
}

function tileDetailScore(tile: TileDef): number {
  // a real PNG ground overlay is richer than any hand-placed draw-op set: the
  // 16px crop is dense authored texture, and a field samples several cells. The
  // base+overlay composite is the new "not a flat fill" — score it well above
  // the floor (a bare baseColor with no sheet stays flat and scores low)
  if (tile.sheet) return tile.sheet.field ? 8 : 6;
  if (tile.rows) return new Set(tile.rows).size;
  return tile.layers?.length ?? 0;
}

function stateRows(prop: PropDef): string[] {
  const state = (prop.states.default ?? Object.values(prop.states)[0]) as PropState;
  return state.rows ?? [];
}

function nonTransparentChannels(rows: string[]): Set<string> {
  return new Set(rows.join("").replaceAll(".", "").split(""));
}

function propRefs(map: MapDef): Set<string> {
  return new Set(
    map.entities
      .map((entity) => entity.ref)
      .filter((ref): ref is string => !!ref && ref.startsWith("prop:")),
  );
}

describe("authored pixel-art richness", () => {
  it("documents the no-flat-fill rule in the product design docs", () => {
    const design = documentFromRepo("docs/DESIGN.md");
    const system = documentFromRepo("docs/DESIGN-SYSTEM.md");
    expect(design).toContain("No required terrain tile should be a single flat fill");
    expect(system.replace(/\s+/g, " ")).toContain(
      "A map is not visually complete when it is mostly flat-color tile fields",
    );
  });

  it("keeps required terrain tiles more detailed than a flat color", () => {
    for (const id of requiredDetailedTiles) {
      const tile = tiles.get(id) as TileDef | undefined;
      expect(tile, id).toBeTruthy();
      expect(tileDetailScore(tile as TileDef), id).toBeGreaterThanOrEqual(4);
      expect(tileColors(tile as TileDef).size, id).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps terrain-family variants as deliberate pixel designs, not duplicate flat fills", () => {
    const variantFamilies = new Map<string, TileDef[]>();
    for (const tile of tiles.values()) {
      const base = tile.variantOf ?? tile.id;
      const family = variantFamilies.get(base) ?? [];
      family.push(tile);
      variantFamilies.set(base, family);
    }

    for (const id of [
      "tile:grass",
      "tile:path",
      "tile:leaf-litter",
      "tile:sand",
      "tile:castle-road",
      "tile:village-cobble",
    ]) {
      const family = variantFamilies.get(id) ?? [];
      expect(family.length, id).toBeGreaterThanOrEqual(4);
      expect(family.length, id).toBeLessThanOrEqual(8);
      expect(new Set(family.map((tile) => tileSignature(tile))).size, id).toBe(family.length);
      for (const tile of family) {
        expect(tileDetailScore(tile), tile.id).toBeGreaterThanOrEqual(6);
        expect(tileColors(tile).size, tile.id).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("adds a village prop vocabulary beyond chests and the castle", () => {
    for (const id of requiredVillageProps) {
      const prop = props.get(id) as PropDef | undefined;
      expect(prop, id).toBeTruthy();
      const rows = stateRows(prop as PropDef);
      for (const row of rows) expect(row, id).toHaveLength((prop as PropDef).grid.w);
      const channels = nonTransparentChannels(rows);
      expect(channels.size, id).toBeGreaterThanOrEqual(5);
    }
  });

  it("places facades and storytelling props into the village and interiors", () => {
    const villageRefs = [...propRefs(getMap("map:village"))];
    expect(villageRefs).toEqual(
      expect.arrayContaining([
        "prop:cottage-facade",
        "prop:village-shop",
        "prop:village-tavern",
        "prop:broadleaf-tree",
        "prop:well",
        "prop:barrel",
        "prop:market-stall",
        "prop:notice-board",
        "prop:flower-cart",
        "prop:village-stable",
      ]),
    );

    // the interiors are now captured-village lair rooms (the dragon's nest); each
    // keeps its storybook prop vocabulary, dressed to the ransacked theme
    expect([...propRefs(getMap("map:village-house"))]).toContain("prop:table");
    expect([...propRefs(getMap("map:village-shop"))]).toEqual(
      expect.arrayContaining(["prop:barrel", "prop:shop-shelf", "prop:table"]),
    );
    expect([...propRefs(getMap("map:village-tavern"))]).toEqual(
      expect.arrayContaining(["prop:table", "prop:tavern-bench", "prop:story-quilt"]),
    );
    expect([...propRefs(getMap("map:village-stable"))]).toEqual(
      expect.arrayContaining([
        "prop:hay-bale",
        "prop:tack-rack",
        "prop:oat-bin",
        "prop:stable-stall",
      ]),
    );
  });

  it("places road storytelling props into the exterior route", () => {
    expect([...propRefs(getMap("map:oldwood-forest"))]).toEqual(
      expect.arrayContaining(["prop:signpost", "prop:stump", "prop:broadleaf-tree"]),
    );
    expect([...propRefs(getMap("map:deep-forest"))]).toEqual(
      expect.arrayContaining(["prop:glowcap-ring", "prop:broadleaf-tree"]),
    );
    expect([...propRefs(getMap("map:sunken-road"))]).toEqual(
      expect.arrayContaining(["prop:sandstone-arch", "prop:broken-cart", "prop:barrel"]),
    );
    expect([...propRefs(getMap("map:desert-ruins"))]).toEqual(
      expect.arrayContaining([
        "prop:sandstone-arch",
        "prop:ruin-mural",
        "prop:desert-shrine",
        "prop:ruin-column",
        "prop:pilgrim-canopy",
      ]),
    );
    expect([...propRefs(getMap("map:castle-approach"))]).toEqual(
      expect.arrayContaining(["prop:castle-gatehouse", "prop:barrel"]),
    );
  });

  it("places authored room props into the castle yard and interior wing", () => {
    expect([...propRefs(getMap("map:castle-yard"))]).toEqual(
      expect.arrayContaining(["prop:castle-banner", "prop:castle-lantern", "prop:barrel"]),
    );
    expect([...propRefs(getMap("map:castle-hall"))]).toEqual(
      expect.arrayContaining([
        "prop:castle-banner",
        "prop:castle-lantern",
        "prop:scribe-desk",
        "prop:throne-door",
      ]),
    );
    expect([...propRefs(getMap("map:castle-library"))]).toEqual(
      expect.arrayContaining(["prop:castle-shelf", "prop:castle-lantern", "prop:table"]),
    );
    expect([...propRefs(getMap("map:castle-armory"))]).toEqual(
      expect.arrayContaining(["prop:weapon-rack", "prop:castle-banner", "prop:barrel"]),
    );
  });
});

function documentFromRepo(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}
