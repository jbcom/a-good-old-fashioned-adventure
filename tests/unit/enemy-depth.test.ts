import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { enemies, incremental } from "../../src/lib/config";
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
      "region:captured-village",
      "region:deep-forest",
      "region:thornwood-hollow",
      "region:castle-approach",
      "region:mistmire",
      "region:mistmire-lair",
      "region:crag",
      "region:crag-lair",
      "region:harbour",
      "region:harbour-lair",
      "region:frostpeak",
      "region:frostpeak-lair",
      "region:ashlands",
      "region:ashlands-lair",
      "region:sunken-crypt",
      "region:siege-warcamp",
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

  it("gives every Dragon's Lair room exactly one authored climax (never trash)", () => {
    // The lair-climax rule (user choice 2026-06-13, [[lair-climax-rule]]): every
    // lair room has EXACTLY ONE authored enemy entity, and it is a miniboss or
    // boss — never a wave-pool trash archetype (that would re-hardcode what the
    // zone model exists to spawn dynamically). throne-wing set the pattern; this
    // gate holds every room to it. Derived from mapLairs so new lairs auto-enrol.
    const offenders: string[] = [];
    for (const lair of Object.values(incremental.mapLairs ?? {})) {
      for (const roomMap of lair.rooms) {
        const authored = getMap(roomMap).entities.filter((e) => e.enemy);
        if (authored.length !== 1) {
          offenders.push(`${roomMap}: ${authored.length} authored enemies (want exactly 1)`);
          continue;
        }
        const archetype = enemies.archetypes[authored[0].enemy as string];
        const isClimax = archetype?.miniboss === true || archetype?.boss !== undefined;
        if (!isClimax) {
          offenders.push(`${roomMap}: authored ${authored[0].enemy} is trash, not a climax`);
        }
      }
    }
    expect(offenders, `lair rooms violating the one-climax rule:\n${offenders.join("\n")}`).toEqual(
      [],
    );
  });

  it("assigns every map to at most one difficultyCurve region", () => {
    // waveArchetypes resolves a map's region via `.find` (first match wins), so
    // a map listed in two regions silently shadows the later one — and a reorder
    // of difficultyCurve would change that map's waves out from under it. Assert
    // the partition is clean so no map's wave pool is ambiguous.
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const region of enemies.difficultyCurve) {
      for (const mapId of region.maps) {
        const prior = seen.get(mapId);
        if (prior) dupes.push(`${mapId} in both ${prior} and ${region.id}`);
        else seen.set(mapId, region.id);
      }
    }
    expect(dupes, `maps double-listed across regions: ${dupes.join(", ")}`).toEqual([]);
  });

  it("assigns distinct regional behavior families", () => {
    expect(enemies.archetypes["oldwood-raider"]).toMatchObject({ behavior: "patrol" });
    expect(enemies.archetypes["thorn-shaman"]).toMatchObject({ behavior: "caster" });
    expect(enemies.archetypes["bramble-stalker"]).toMatchObject({ behavior: "ambush" });
    expect(enemies.archetypes["gate-sentry"]).toMatchObject({ behavior: "guard" });
    expect(enemies.archetypes["banner-knight"]).toMatchObject({ behavior: "guard" });
  });

  it("each region's pool covers its archetypes (zone-spawned, not authored)", () => {
    // In the ZONE model (docs/RAIL-COMMAND.md §maps are zones, not enemies) maps
    // no longer author trash — a map's enemies are the region pool ∩ unlocked,
    // spawned at the wave gates. So we assert the REGION pools carry the right
    // archetypes for each tier, not that maps hardcode them.
    const pool = (regionId: string) =>
      enemies.difficultyCurve.find((r) => r.id === regionId)?.archetypes ?? [];

    expect(pool("region:oldwood")).toEqual(
      expect.arrayContaining(["oldwood-raider", "thorn-shaman"]),
    );
    expect(pool("region:deep-forest")).toEqual(expect.arrayContaining(["bramble-stalker"]));
    expect(pool("region:castle-approach")).toEqual(expect.arrayContaining(["gate-sentry"]));
    // banner-knight is a miniboss (authored climax, not a wave archetype); it is
    // NOT in the wave pool, but it must exist as an archetype
    expect(enemies.archetypes["banner-knight"]).toMatchObject({ miniboss: true });
  });
});
