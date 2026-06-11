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
];

function colorsInOps(ops: DrawOp[]): Set<string> {
  return new Set(ops.map((op) => op.color));
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
      expect(tile?.layers.length, id).toBeGreaterThanOrEqual(4);
      expect(colorsInOps(tile?.layers ?? []).size, id).toBeGreaterThanOrEqual(3);
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
      ]),
    );

    expect([...propRefs(getMap("map:village-house"))]).toContain("prop:table");
    expect([...propRefs(getMap("map:village-shop"))]).toEqual(
      expect.arrayContaining(["prop:barrel", "prop:shop-shelf", "prop:shop-ledger"]),
    );
    expect([...propRefs(getMap("map:village-tavern"))]).toEqual(
      expect.arrayContaining([
        "prop:table",
        "prop:tavern-bench",
        "prop:hearth-song-board",
        "prop:story-quilt",
      ]),
    );
  });

  it("places road storytelling props into the exterior route", () => {
    expect([...propRefs(getMap("map:oldwood-forest"))]).toEqual(
      expect.arrayContaining(["prop:signpost", "prop:stump", "prop:broadleaf-tree"]),
    );
    expect([...propRefs(getMap("map:deep-forest"))]).toEqual(
      expect.arrayContaining(["prop:stump", "prop:broadleaf-tree"]),
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
