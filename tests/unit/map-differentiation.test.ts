import { describe, expect, it } from "vitest";
import { getTile, maps } from "../../src/lib/content/registry";
import type { MapDef } from "../../src/lib/content/types";
import { buildGrid } from "../../src/sim/mapgen";

/**
 * S9.13 map experience differentiation gate. Every map must read as its own
 * experience: pairwise distance combines the semantic tile distribution with
 * the authored feature cast (props, NPCs, enemies). Deterministic — pure
 * content, no rendering.
 */
const MIN_PAIRWISE = 0.35;
const MIN_MEDIAN = 0.75;

function semanticTileId(tileId: string): string {
  const tile = getTile(tileId);
  return tile.variantOf ?? tile.id;
}

function tileHistogram(map: MapDef): Map<string, number> {
  const counts = new Map<string, number>();
  let total = 0;
  for (const row of buildGrid(map)) {
    for (const tileId of row) {
      const semantic = semanticTileId(tileId);
      counts.set(semantic, (counts.get(semantic) ?? 0) + 1);
      total += 1;
    }
  }
  for (const [key, value] of counts) counts.set(key, value / total);
  return counts;
}

function featureProfile(map: MapDef): Map<string, number> {
  const counts = new Map<string, number>();
  let total = 0;
  for (const entity of map.entities) {
    const key = entity.ref ?? (entity.enemy ? `enemy:${entity.enemy}` : null);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    total += 1;
  }
  for (const [key, value] of counts) counts.set(key, value / Math.max(1, total));
  return counts;
}

function totalVariation(a: Map<string, number>, b: Map<string, number>): number {
  const keys = new Set([...a.keys(), ...b.keys()]);
  let sum = 0;
  for (const key of keys) sum += Math.abs((a.get(key) ?? 0) - (b.get(key) ?? 0));
  return sum / 2;
}

function median(values: number[]): number {
  const sorted = [...values].sort((x, y) => x - y);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

describe("S9.13 map experience differentiation", () => {
  const defs = [...maps.values()];
  const hists = new Map(defs.map((map) => [map.id, tileHistogram(map)]));
  const feats = new Map(defs.map((map) => [map.id, featureProfile(map)]));

  function distance(a: MapDef, b: MapDef): number {
    const tiles = totalVariation(
      hists.get(a.id) as Map<string, number>,
      hists.get(b.id) as Map<string, number>,
    );
    const features = totalVariation(
      feats.get(a.id) as Map<string, number>,
      feats.get(b.id) as Map<string, number>,
    );
    return 0.5 * tiles + 0.5 * features;
  }

  it("keeps every pair of maps meaningfully distinct", () => {
    for (let i = 0; i < defs.length; i++) {
      for (let j = i + 1; j < defs.length; j++) {
        const d = distance(defs[i], defs[j]);
        expect(
          d,
          `${defs[i].id} and ${defs[j].id} read too alike (${d.toFixed(3)})`,
        ).toBeGreaterThanOrEqual(MIN_PAIRWISE);
      }
    }
  });

  it("keeps every map's median differentiation high — its own experience", () => {
    for (const map of defs) {
      const distances = defs.filter((other) => other.id !== map.id).map((o) => distance(map, o));
      const med = median(distances);
      expect(
        med,
        `${map.id} blends into the set (median ${med.toFixed(3)})`,
      ).toBeGreaterThanOrEqual(MIN_MEDIAN);
    }
  });
});
