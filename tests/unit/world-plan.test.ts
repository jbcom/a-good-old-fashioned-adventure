import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import audio from "../../src/config/audio.json";
import { getMap, maps } from "../../src/lib/content/registry";

const plannedMaps = [
  "map:village",
  "map:village-house",
  "map:village-shop",
  "map:village-tavern",
  "map:village-stable",
  "map:oldwood-forest",
  "map:deep-forest",
  "map:sunken-road",
  "map:desert-ruins",
  "map:castle-approach",
  "map:castle-yard",
  "map:castle-hall",
  "map:castle-library",
  "map:castle-armory",
  "map:castle-dungeon",
];

const exteriorRoad = [
  ["map:village", "map:oldwood-forest"],
  ["map:oldwood-forest", "map:deep-forest"],
  ["map:deep-forest", "map:sunken-road"],
  ["map:sunken-road", "map:castle-approach"],
] as const;

const castleInteriorRoad = [
  ["map:castle-approach", "map:castle-yard"],
  ["map:castle-yard", "map:castle-hall"],
  ["map:castle-hall", "map:castle-library"],
  ["map:castle-hall", "map:castle-armory"],
  ["map:castle-hall", "map:castle-dungeon"],
] as const;

interface PortalTrigger {
  id: string;
  kind?: string;
  label?: string;
  toMap?: string;
  toSpawn?: string;
  requiresFlag?: string;
  zone?: { x0: number; y0: number; x1: number; y1: number };
}

interface SpawnedMap {
  id: string;
  bgmTheme?: string;
  spawns?: Record<string, { x: number; y: number }>;
  triggers?: PortalTrigger[];
}

function map(id: string): SpawnedMap {
  return getMap(id) as SpawnedMap;
}

function portals(mapId: string): PortalTrigger[] {
  return (map(mapId).triggers ?? []).filter((trigger) => trigger.kind === "portal");
}

function inside(zone: PortalTrigger["zone"], pos: { x: number; y: number }): boolean {
  return !!zone && pos.x >= zone.x0 && pos.x <= zone.x1 && pos.y >= zone.y0 && pos.y <= zone.y1;
}

describe("S6 world plan content", () => {
  it("prioritizes authored pixel diorama vocabulary over imported asset dependency", () => {
    const worldDoc = readFileSync(resolve(process.cwd(), "docs/WORLD.md"), "utf8");
    expect(worldDoc).toContain("Authored Pixel Diorama Vocabulary");
    expect(worldDoc).toContain("Buildings:");
    expect(worldDoc).toContain("Trees and roadside props:");
    expect(worldDoc).toContain("NPC silhouettes:");
    expect(worldDoc).toContain("should not block authored 16-bit content");
  });

  it("documents the exterior road implementation slice", () => {
    const worldDoc = readFileSync(resolve(process.cwd(), "docs/WORLD.md"), "utf8");
    expect(worldDoc).toContain("Second S6 Slice");
    expect(worldDoc).toContain("map:oldwood-forest");
    expect(worldDoc).toContain("map:deep-forest");
    expect(worldDoc).toContain("map:castle-approach");
    expect(worldDoc).toContain("player governor");
  });

  it("documents the S6.6 expanded start-to-victory route", () => {
    const worldDoc = readFileSync(resolve(process.cwd(), "docs/WORLD.md"), "utf8");
    expect(worldDoc).toContain("Fifth S6 Slice");
    expect(worldDoc).toContain("New Game starts in `map:village`");
    expect(worldDoc).toContain("map:sunken-road");
    expect(worldDoc).toContain("Castle Approach owns the key-gated castle entry portal");
    expect(worldDoc).toContain("keyboard A/B and directional input only");
  });

  it("documents the castle-interior route slice before content implementation", () => {
    const worldDoc = readFileSync(resolve(process.cwd(), "docs/WORLD.md"), "utf8");
    expect(worldDoc).toContain("Sixth S6 Slice");
    expect(worldDoc).toContain("map:castle-yard");
    expect(worldDoc).toContain("map:castle-hall");
    expect(worldDoc).toContain("map:castle-library");
    expect(worldDoc).toContain("map:castle-armory");
    expect(worldDoc).toContain("quest:castle-letters");
    expect(worldDoc).toContain("real directional input and A-button dialogue");
  });

  it("documents the desert-ruins landmark loop before content implementation", () => {
    const worldDoc = readFileSync(resolve(process.cwd(), "docs/WORLD.md"), "utf8");
    expect(worldDoc).toContain("Seventh S6 Slice");
    expect(worldDoc).toContain("map:desert-ruins");
    expect(worldDoc).toContain("desert pilgrim");
    expect(worldDoc).toContain("mural trigger");
    expect(worldDoc).toContain("public directional input and A-button dialogue");
  });

  it("seeds the first village interior map set", () => {
    for (const id of plannedMaps) expect(maps.has(id), id).toBe(true);
  });

  it("gives every map a default named spawn", () => {
    for (const id of plannedMaps) {
      expect(map(id).spawns?.default, `${id} needs spawns.default`).toEqual(
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
      );
    }
  });

  it("assigns authored map audio themes to the village slice", () => {
    const themes = audio.bgm.themes as Record<string, number[]>;
    expect(themes.village.length).toBeGreaterThan(8);
    expect(themes.interior.length).toBeGreaterThan(8);
    expect(themes["sunken-road"].length).toBeGreaterThan(8);
    expect(map("map:village").bgmTheme).toBe("village");
    for (const id of [
      "map:village-house",
      "map:village-shop",
      "map:village-tavern",
      "map:village-stable",
    ]) {
      expect(map(id).bgmTheme, id).toBe("interior");
    }
  });

  it("connects village interiors through reversible portal triggers", () => {
    const villagePortals = portals("map:village").filter((portal) =>
      portal.toMap?.startsWith("map:village-"),
    );
    expect(villagePortals.map((portal) => portal.toMap).sort()).toEqual([
      "map:village-house",
      "map:village-shop",
      "map:village-stable",
      "map:village-tavern",
    ]);

    for (const portal of villagePortals) {
      expect(portal.label, portal.id).toBeTruthy();
      expect(portal.toSpawn, portal.id).toBe("entry");
      expect(portal.zone, portal.id).toEqual(
        expect.objectContaining({
          x0: expect.any(Number),
          y0: expect.any(Number),
          x1: expect.any(Number),
          y1: expect.any(Number),
        }),
      );
      expect(
        map(portal.toMap as string).spawns?.[portal.toSpawn as string],
        portal.id,
      ).toBeTruthy();
      const returnPortal = portals(portal.toMap as string).find(
        (candidate) => candidate.toMap === "map:village",
      );
      expect(returnPortal?.toSpawn, `${portal.toMap} returns to village`).toBeTruthy();
      expect(map("map:village").spawns?.[returnPortal?.toSpawn as string], portal.id).toBeTruthy();
    }
  });

  it("connects the exterior road through reversible portal triggers", () => {
    for (const [from, to] of exteriorRoad) {
      const outbound = portals(from).find((portal) => portal.toMap === to);
      expect(outbound, `${from} should lead to ${to}`).toBeTruthy();
      expect(outbound?.label, `${from} -> ${to}`).toBeTruthy();
      expect(outbound?.toSpawn, `${from} -> ${to}`).toBeTruthy();
      expect(map(to).spawns?.[outbound?.toSpawn as string], `${to} named spawn`).toBeTruthy();

      const inbound = portals(to).find((portal) => portal.toMap === from);
      expect(inbound, `${to} should return to ${from}`).toBeTruthy();
      expect(map(from).spawns?.[inbound?.toSpawn as string], `${from} return spawn`).toBeTruthy();
    }
  });

  it("connects Sunken Road to the optional Desert Ruins loop", () => {
    const outbound = portals("map:sunken-road").find(
      (portal) => portal.toMap === "map:desert-ruins",
    );
    expect(outbound?.id).toBe("trigger:enter-ruins");
    expect(outbound?.toSpawn).toBe("entry");
    expect(map("map:desert-ruins").spawns?.entry).toBeTruthy();

    const inbound = portals("map:desert-ruins").find(
      (portal) => portal.toMap === "map:sunken-road",
    );
    expect(inbound?.toSpawn).toBe("from-ruins");
    expect(map("map:sunken-road").spawns?.["from-ruins"]).toBeTruthy();
  });

  it("connects Castle Approach to the castle yard through a key-gated portal", () => {
    const gate = portals("map:castle-approach").find(
      (portal) => portal.toMap === "map:castle-yard",
    );
    expect(gate?.id).toBe("trigger:castle-gate-entry");
    expect(gate?.toSpawn).toBe("entry");
    expect(map("map:castle-yard").spawns?.[gate?.toSpawn as string]).toBeTruthy();
    expect(gate?.requiresFlag).toBe("flag:has-dungeon-key");
  });

  it("connects the authored castle interiors through reversible portal triggers", () => {
    for (const [from, to] of castleInteriorRoad) {
      const outbound = portals(from).find((portal) => portal.toMap === to);
      expect(outbound, `${from} should lead to ${to}`).toBeTruthy();
      expect(outbound?.label, `${from} -> ${to}`).toBeTruthy();
      expect(outbound?.toSpawn, `${from} -> ${to}`).toBeTruthy();
      expect(map(to).spawns?.[outbound?.toSpawn as string], `${to} named spawn`).toBeTruthy();

      if (to === "map:castle-dungeon") continue;
      const inbound = portals(to).find((portal) => portal.toMap === from);
      expect(inbound, `${to} should return to ${from}`).toBeTruthy();
      expect(map(from).spawns?.[inbound?.toSpawn as string], `${from} return spawn`).toBeTruthy();
    }
  });

  it("keeps return spawns outside the outbound village portal zones", () => {
    const village = map("map:village");
    for (const portal of portals("map:village")) {
      const interiorReturn = portals(portal.toMap as string).find(
        (candidate) => candidate.toMap === "map:village",
      );
      const returnSpawn = village.spawns?.[interiorReturn?.toSpawn as string];
      expect(returnSpawn, `${portal.id} return spawn exists`).toBeTruthy();
      expect(inside(portal.zone, returnSpawn as { x: number; y: number }), portal.id).toBe(false);
    }
  });

  it("keeps interior entry spawns outside their own return-door zones", () => {
    for (const portal of portals("map:village")) {
      const interior = map(portal.toMap as string);
      const entrySpawn = interior.spawns?.[portal.toSpawn as string];
      const returnPortal = portals(interior.id).find(
        (candidate) => candidate.toMap === "map:village",
      );
      expect(entrySpawn, `${interior.id} entry spawn exists`).toBeTruthy();
      expect(returnPortal?.zone, `${interior.id} return zone exists`).toBeTruthy();
      expect(
        inside(returnPortal?.zone, entrySpawn as { x: number; y: number }),
        `${interior.id} must not immediately exit on entry`,
      ).toBe(false);
    }
  });
});
