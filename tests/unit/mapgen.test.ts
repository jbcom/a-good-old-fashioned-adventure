import { describe, expect, it } from "vitest";
import dungeonDef from "../../src/content/world/maps/castle-dungeon.json";
import overworldDef from "../../src/content/world/maps/overworld.json";
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

  it("places prison bars with a doorway at row 16", () => {
    expect(grid[10][16]).toBe("tile:prison-bars");
    expect(grid[16][16]).toBe("tile:stone-floor");
    expect(grid[16][32]).toBe("tile:stone-floor");
  });
});
