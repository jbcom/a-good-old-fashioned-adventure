import { describe, expect, it } from "vitest";
import castleApproachDef from "../../src/content/world/maps/castle-approach.json";
import dungeonDef from "../../src/content/world/maps/castle-dungeon.json";
import deepForestDef from "../../src/content/world/maps/deep-forest.json";
import oldwoodDef from "../../src/content/world/maps/oldwood-forest.json";
import overworldDef from "../../src/content/world/maps/overworld.json";
import sunkenRoadDef from "../../src/content/world/maps/sunken-road.json";
import { buildGrid, type MapGenInput } from "../../src/sim/mapgen";

// Expectations mirror the prototype's buildGrids() output (kingdom_quest_rpg.tsx).
describe("overworld generation", () => {
  const grid = buildGrid(overworldDef as MapGenInput);

  it("rings the world with mountains", () => {
    expect(grid[0][0]).toBe("tile:mountain");
    expect(grid[47][95]).toBe("tile:mountain");
    expect(grid[0][32]).toBe("tile:mountain");
  });

  it("cuts the river at col 32 with the broken-bridge cell water", () => {
    expect(grid[24][32]).toBe("tile:water");
    expect(grid[12][32]).toBe("tile:water");
    expect(grid[28][32]).toBe("tile:water");
  });

  it("leaves the castle gate gap at col 64 rows 24-25", () => {
    expect(grid[23][64]).toBe("tile:mountain");
    expect(grid[24][64]).toBe("tile:grass");
    expect(grid[25][64]).toBe("tile:grass");
    expect(grid[26][64]).toBe("tile:mountain");
  });

  it("lays the western path network", () => {
    expect(grid[12][5]).toBe("tile:path");
    expect(grid[20][16]).toBe("tile:path");
    expect(grid[28][20]).toBe("tile:path");
  });

  it("fills the southern desert", () => {
    expect(grid[35][40]).toBe("tile:sand");
    expect(grid[46][63]).toBe("tile:sand");
    expect(grid[30][40]).not.toBe("tile:sand");
  });

  it("lays the eastern approach to the castle", () => {
    expect(grid[24][70]).toBe("tile:path");
    expect(grid[15][80]).toBe("tile:path");
    expect(grid[10][90]).toBe("tile:path");
  });
});

describe("dungeon generation", () => {
  const grid = buildGrid(dungeonDef as MapGenInput);

  it("walls the border and interior dividers", () => {
    expect(grid[0][0]).toBe("tile:stone-wall");
    expect(grid[10][32]).toBe("tile:stone-wall");
    expect(grid[16][20]).toBe("tile:stone-wall");
  });

  it("places prison bars with playable five-tile doorways", () => {
    expect(grid[10][16]).toBe("tile:prison-bars");
    expect(grid[16][16]).toBe("tile:stone-floor");
    expect(grid[16][32]).toBe("tile:stone-floor");
    expect(grid[14][16]).toBe("tile:stone-floor");
    expect(grid[15][16]).toBe("tile:stone-floor");
    expect(grid[17][16]).toBe("tile:stone-floor");
    expect(grid[18][16]).toBe("tile:stone-floor");
    expect(grid[16][14]).toBe("tile:stone-floor");
    expect(grid[16][15]).toBe("tile:stone-floor");
    expect(grid[16][17]).toBe("tile:stone-floor");
    expect(grid[16][18]).toBe("tile:stone-floor");
    expect(grid[15][32]).toBe("tile:stone-floor");
    expect(grid[17][32]).toBe("tile:stone-floor");
  });
});

describe("S6 exterior route generation", () => {
  const oldwood = buildGrid(oldwoodDef as MapGenInput);
  const deepForest = buildGrid(deepForestDef as MapGenInput);
  const sunkenRoad = buildGrid(sunkenRoadDef as MapGenInput);
  const castleApproach = buildGrid(castleApproachDef as MapGenInput);

  it("lays readable road corridors through forest maps", () => {
    expect(oldwood[19][4]).toBe("tile:path");
    expect(oldwood[19][60]).toBe("tile:path");
    expect(oldwood[8][26]).toBe("tile:leaf-litter");
    expect(deepForest[19][4]).toBe("tile:path");
    expect(deepForest[19][64]).toBe("tile:path");
    expect(deepForest[12][44]).toBe("tile:leaf-litter");
  });

  it("stages the castle approach with a stone road and gate apron", () => {
    expect(castleApproach[19][4]).toBe("tile:castle-road");
    expect(castleApproach[19][70]).toBe("tile:castle-road");
    expect(castleApproach[14][61]).toBe("tile:stone-floor");
    expect(castleApproach[6][63]).toBe("tile:mountain");
  });

  it("lays the Sunken Road as a desert threshold with old stone and wash", () => {
    expect(sunkenRoad[19][4]).toBe("tile:path");
    expect(sunkenRoad[19][52]).toBe("tile:path");
    expect(sunkenRoad[18][42]).toBe("tile:castle-road");
    expect(sunkenRoad[19][22]).toBe("tile:path");
    expect(sunkenRoad[10][18]).toBe("tile:water");
    expect(sunkenRoad[18][30]).toBe("tile:castle-road");
  });
});
