import { describe, expect, it } from "vitest";
import { createGameWorld, instantiateMap, spawnUnit } from "../../src/sim/factories";
import { frontline, railAxis } from "../../src/sim/systems/waves";
import { IsPlayer } from "../../src/sim/traits";

/**
 * Rail axis (docs/RAIL-COMMAND.md §Rail axis): the line advances toward the
 * far end of each map's axis — north on the tall rescue-route, east on the
 * wide route maps. frontline projects onto the axis so a horizontal map
 * plays like a vertical one turned 90°.
 */
describe("rail axis", () => {
  it("rescue-route climbs north (tall map, low spawn)", () => {
    const world = createGameWorld(3);
    instantiateMap(world, "map:rescue-route", { classId: "knight" });
    world.queryFirst(IsPlayer)?.destroy();
    expect(railAxis(world)).toBe("north");
    spawnUnit(world, "knight", 130, 800);
    spawnUnit(world, "knight", 130, 400); // further north
    expect(frontline(world)?.y).toBe(400);
  });

  it("a wide route map runs east (left spawn)", () => {
    const world = createGameWorld(3);
    instantiateMap(world, "map:oldwood-forest", { classId: "knight" });
    world.queryFirst(IsPlayer)?.destroy();
    expect(railAxis(world)).toBe("east");
    spawnUnit(world, "knight", 200, 304);
    spawnUnit(world, "knight", 600, 304); // further east
    expect(frontline(world)?.x).toBe(600);
  });
});
