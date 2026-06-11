import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { enemies } from "../../src/lib/config";
import { getMap } from "../../src/lib/content/registry";

describe("S6.5 regional enemy depth", () => {
  it("documents the enemy-depth slice and config-first AI boundary", () => {
    const worldDoc = readFileSync(resolve(process.cwd(), "docs/WORLD.md"), "utf8");
    expect(worldDoc).toContain("Fourth S6 Slice");
    expect(worldDoc).toContain("oldwood-raider");
    expect(worldDoc).toContain("bramble-stalker");
    expect(worldDoc).toContain("gate-sentry");
    expect(worldDoc).toContain("Enemy AI remains config-first");
  });

  it("defines an ordered regional difficulty curve with real maps and archetypes", () => {
    expect(enemies.difficultyCurve.map((entry) => entry.id)).toEqual([
      "region:oldwood",
      "region:deep-forest",
      "region:castle-approach",
      "region:dungeon",
    ]);

    let lastThreat = 0;
    for (const entry of enemies.difficultyCurve) {
      expect(entry.threat).toBeGreaterThan(lastThreat);
      lastThreat = entry.threat;
      for (const mapId of entry.maps) expect(getMap(mapId).id).toBe(mapId);
      for (const archetypeId of entry.archetypes) {
        expect(enemies.archetypes[archetypeId], archetypeId).toBeTruthy();
      }
    }
  });

  it("assigns distinct regional behavior families", () => {
    expect(enemies.archetypes["oldwood-raider"]).toMatchObject({ behavior: "patrol" });
    expect(enemies.archetypes["thorn-shaman"]).toMatchObject({ behavior: "caster" });
    expect(enemies.archetypes["bramble-stalker"]).toMatchObject({ behavior: "ambush" });
    expect(enemies.archetypes["gate-sentry"]).toMatchObject({ behavior: "guard" });
    expect(enemies.archetypes["banner-knight"]).toMatchObject({ behavior: "guard" });
  });

  it("places new regional archetypes on the expanded route maps", () => {
    const enemyIds = (mapId: string) =>
      getMap(mapId)
        .entities.map((entity) => entity.enemy)
        .filter(Boolean);

    expect(enemyIds("map:oldwood-forest")).toEqual(
      expect.arrayContaining(["oldwood-raider", "thorn-shaman"]),
    );
    expect(enemyIds("map:deep-forest")).toEqual(expect.arrayContaining(["bramble-stalker"]));
    expect(enemyIds("map:castle-approach")).toEqual(
      expect.arrayContaining(["gate-sentry", "banner-knight"]),
    );
  });
});
