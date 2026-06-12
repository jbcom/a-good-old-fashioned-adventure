import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getMap, getTile } from "../../src/lib/content/registry";
import type {
  MapCompositionWindow,
  MapDef,
  MapEntitySpawn,
  TerrainVariantRule,
  TileDef,
} from "../../src/lib/content/types";
import { buildGrid } from "../../src/sim/mapgen";

const mandatoryExteriorMaps = [
  "map:village",
  "map:oldwood-forest",
  "map:deep-forest",
  "map:sunken-road",
  "map:castle-approach",
] as const;

const dominantTileCap = 0.84;

const requiredTerrainFamilies: Record<(typeof mandatoryExteriorMaps)[number], string[]> = {
  "map:village": ["tile:grass", "tile:path", "tile:village-cobble", "tile:mountain"],
  "map:oldwood-forest": ["tile:leaf-litter", "tile:path", "tile:grass", "tile:mountain"],
  "map:deep-forest": ["tile:leaf-litter", "tile:path", "tile:mountain"],
  "map:sunken-road": ["tile:sand", "tile:path", "tile:castle-road", "tile:mountain", "tile:water"],
  "map:castle-approach": ["tile:grass", "tile:castle-road", "tile:mountain", "tile:stone-floor"],
};

function documentFromRepo(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function entityId(entity: MapEntitySpawn): string | null {
  if (entity.ref) return entity.ref;
  if (entity.enemy) return `enemy:${entity.enemy}`;
  return null;
}

function entityInWindow(entity: MapEntitySpawn, window: MapCompositionWindow): boolean {
  if (entity.x === undefined || entity.y === undefined) return false;
  const tx = entity.x / 16;
  const ty = entity.y / 16;
  return (
    tx >= window.zone.x0 && tx <= window.zone.x1 && ty >= window.zone.y0 && ty <= window.zone.y1
  );
}

function idsInWindow(map: MapDef, window: MapCompositionWindow): string[] {
  return map.entities
    .filter((entity) => entityInWindow(entity, window))
    .map(entityId)
    .filter((id): id is string => !!id);
}

function occurrences(ids: string[], id: string): number {
  return ids.filter((candidate) => candidate === id).length;
}

function terrainRules(map: MapDef): TerrainVariantRule[] {
  return map.terrainVariants ?? [];
}

function semanticTile(map: MapDef, tileId: string): string {
  const rule = terrainRules(map).find((candidate) => candidate.variants.includes(tileId));
  return rule?.baseTile ?? tileId;
}

function windowTiles(map: MapDef, window: MapCompositionWindow): string[] {
  const grid = buildGrid(map);
  const tiles: string[] = [];
  for (let y = window.zone.y0; y <= window.zone.y1; y++) {
    for (let x = window.zone.x0; x <= window.zone.x1; x++) {
      tiles.push(grid[y]?.[x] ?? "");
    }
  }
  return tiles.filter(Boolean);
}

function dominantShare(tiles: string[]): number {
  const counts = new Map<string, number>();
  for (const tile of tiles) counts.set(tile, (counts.get(tile) ?? 0) + 1);
  return Math.max(...counts.values()) / tiles.length;
}

function cellsForFamily(map: MapDef, tiles: string[], baseTile: string): string[] {
  return tiles.filter((tile) => semanticTile(map, tile) === baseTile);
}

describe("content composition rules", () => {
  it("documents the tile-variation, prop-cadence, and open-space rules", () => {
    const doc = documentFromRepo("docs/CONTENT-COMPOSITION.md");
    const compact = doc.replace(/\s+/g, " ");
    expect(compact).toContain("dominant tile");
    expect(compact).toContain("terrainVariants");
    expect(compact).toContain("four to eight");
    expect(compact).toContain("deterministic noise");
    expect(compact).toContain("tile:mountain");
    expect(compact).toContain("tile:water");
    expect(compact).toContain("tile:stone-floor");
    expect(compact).toContain("never a looser budget");
    expect(doc).toContain("major anchor");
    expect(doc).toContain("minor props");
    expect(doc).toContain("openReason");
  });

  it("requires mandatory exterior maps to declare route composition windows", () => {
    for (const mapId of mandatoryExteriorMaps) {
      const map = getMap(mapId);
      expect(map.composition?.routeWindows?.length, mapId).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps route windows from becoming repeated terrain carpets", () => {
    for (const mapId of mandatoryExteriorMaps) {
      const map = getMap(mapId);
      for (const window of map.composition?.routeWindows ?? []) {
        const tiles = windowTiles(map, window);
        expect(tiles.length, `${mapId}:${window.label} zone is empty`).toBeGreaterThan(0);
        const share = dominantShare(tiles.map((tile) => semanticTile(map, tile)));
        expect(window.openReason, `${mapId}:${window.label}`).toBeUndefined();
        expect(share, `${mapId}:${window.label}`).toBeLessThanOrEqual(dominantTileCap);
      }
    }
  });

  it("declares four to eight authored terrain variants for mandatory exterior surfaces", () => {
    for (const mapId of mandatoryExteriorMaps) {
      const map = getMap(mapId);
      const rules = terrainRules(map);
      for (const baseTile of requiredTerrainFamilies[mapId]) {
        const rule = rules.find((candidate) => candidate.baseTile === baseTile);
        expect(rule, `${mapId}:${baseTile}`).toBeDefined();
        expect(rule?.variants.length, `${mapId}:${baseTile}`).toBeGreaterThanOrEqual(4);
        expect(rule?.variants.length, `${mapId}:${baseTile}`).toBeLessThanOrEqual(8);
        expect(rule?.variants, `${mapId}:${baseTile}`).toContain(baseTile);
        expect(rule?.chunk.w, `${mapId}:${baseTile}`).toBeGreaterThanOrEqual(2);
        expect(rule?.chunk.h, `${mapId}:${baseTile}`).toBeGreaterThanOrEqual(2);
        for (const variantId of rule?.variants ?? []) {
          const variant = getTile(variantId) as TileDef & { variantOf?: string };
          expect(variant.solid, variantId).toBe(getTile(baseTile).solid);
          if (variantId !== baseTile) expect(variant.variantOf, variantId).toBe(baseTile);
        }
      }
    }
  });

  it("renders concrete terrain-variant diversity inside route windows", () => {
    for (const mapId of mandatoryExteriorMaps) {
      const map = getMap(mapId);
      for (const window of map.composition?.routeWindows ?? []) {
        const tiles = windowTiles(map, window);
        for (const rule of terrainRules(map)) {
          const familyTiles = cellsForFamily(map, tiles, rule.baseTile);
          if (familyTiles.length < 16) continue;
          expect(
            new Set(familyTiles).size,
            `${mapId}:${window.label}:${rule.baseTile}`,
          ).toBeGreaterThanOrEqual(Math.min(4, rule.variants.length));
        }
      }
    }
  });

  it("enforces major anchor and minor prop cadence in ordinary route windows", () => {
    for (const mapId of mandatoryExteriorMaps) {
      const map = getMap(mapId);
      for (const window of map.composition?.routeWindows ?? []) {
        const presentIds = idsInWindow(map, window);
        const presentMajor = window.majorAnchors.filter((id) => presentIds.includes(id));
        const presentMinor = window.minorProps.filter(
          (id, index, ids) =>
            occurrences(presentIds, id) >= occurrences(ids.slice(0, index + 1), id),
        );

        expect(presentMajor.length, `${mapId}:${window.label}`).toBeGreaterThanOrEqual(1);
        expect(window.minorProps.length, `${mapId}:${window.label}`).toBeGreaterThanOrEqual(2);
        expect(presentMinor.length, `${mapId}:${window.label}`).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
