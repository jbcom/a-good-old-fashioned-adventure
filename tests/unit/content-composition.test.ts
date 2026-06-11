import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getMap } from "../../src/lib/content/registry";
import type { MapCompositionWindow, MapDef, MapEntitySpawn } from "../../src/lib/content/types";
import { buildGrid } from "../../src/sim/mapgen";

const mandatoryExteriorMaps = [
  "map:village",
  "map:oldwood-forest",
  "map:deep-forest",
  "map:sunken-road",
  "map:castle-approach",
] as const;

const dominantTileCap = 0.92;

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

function requiredOccurrences(ids: string[], id: string): number {
  return ids.filter((candidate) => candidate === id).length;
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

describe("content composition rules", () => {
  it("documents the tile-variation, prop-cadence, and open-space rules", () => {
    const doc = documentFromRepo("docs/CONTENT-COMPOSITION.md");
    const compact = doc.replace(/\s+/g, " ");
    expect(compact).toContain("dominant tile");
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
        const share = dominantShare(windowTiles(map, window));
        if (window.openReason) {
          expect(window.openReason, `${mapId}:${window.label}`).toMatch(
            /travel|threshold|breath|leaving|exposed/i,
          );
          expect(share, `${mapId}:${window.label}`).toBeLessThanOrEqual(0.97);
        } else {
          expect(share, `${mapId}:${window.label}`).toBeLessThanOrEqual(dominantTileCap);
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
            occurrences(presentIds, id) >= requiredOccurrences(ids.slice(0, index + 1), id),
        );

        expect(presentMajor.length, `${mapId}:${window.label}`).toBeGreaterThanOrEqual(1);
        if (window.openReason) {
          expect(presentMinor.length, `${mapId}:${window.label}`).toBeGreaterThanOrEqual(1);
        } else {
          expect(window.minorProps.length, `${mapId}:${window.label}`).toBeGreaterThanOrEqual(2);
          expect(presentMinor.length, `${mapId}:${window.label}`).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });
});
