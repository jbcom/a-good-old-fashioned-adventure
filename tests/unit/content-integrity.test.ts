import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";

/**
 * The content contract (docs/CONTENT-ARCHITECTURE.md §Validation):
 * every config/content file validates against its declared schema, and
 * every namespaced ID reference resolves to a declared ID.
 */

type Json = Record<string, unknown>;

const schemaModules = import.meta.glob<Json>("/schemas/*.json", {
  eager: true,
  import: "default",
});
const contentModules = import.meta.glob<Json>(["/src/config/*.json", "/src/content/**/*.json"], {
  eager: true,
  import: "default",
});

const ajv = new Ajv2020({ strict: false, allErrors: true });
const schemaIdByBasename = new Map<string, string>();
for (const [path, schema] of Object.entries(schemaModules)) {
  const basename = path.split("/").at(-1) as string;
  ajv.addSchema(schema, schema.$id as string);
  schemaIdByBasename.set(basename, schema.$id as string);
}

function declaredSchemaBasename(doc: Json): string | undefined {
  const ref = doc.$schema;
  return typeof ref === "string" ? ref.split("/").at(-1) : undefined;
}

describe("schema validation", () => {
  for (const [path, doc] of Object.entries(contentModules)) {
    it(`${path} validates against its declared schema`, () => {
      const basename = declaredSchemaBasename(doc);
      expect(basename, `${path} must declare $schema`).toBeDefined();
      const schemaId = schemaIdByBasename.get(basename as string);
      expect(schemaId, `unknown schema ${basename}`).toBeDefined();
      const validate = ajv.getSchema(schemaId as string);
      expect(validate, `schema ${schemaId} not compiled`).toBeDefined();
      const valid = validate?.(doc);
      expect(valid, JSON.stringify(validate?.errors, null, 2)).toBe(true);
    });
  }
});

describe("referential integrity", () => {
  const declaredIds = new Set<string>();
  for (const [path, doc] of Object.entries(contentModules)) {
    if (typeof doc.id === "string") declaredIds.add(doc.id);
    if (doc.swaps) for (const k of Object.keys(doc.swaps as Json)) declaredIds.add(k);
    for (const registry of ["characters", "items", "flags"] as const) {
      if (doc[registry]) for (const k of Object.keys(doc[registry] as Json)) declaredIds.add(k);
    }
    if (path.endsWith("config/enemies.json")) {
      for (const k of Object.keys((doc.archetypes as Json) ?? {})) declaredIds.add(`enemy:${k}`);
    }
  }

  const refPattern =
    /"(tile|palette|anim|sprite|prop|char|item|flag|quest|map|dlgbank|shop):[a-z0-9.-]+"/g;

  for (const [path, doc] of Object.entries(contentModules)) {
    it(`${path} has no dangling references`, () => {
      const dangling: string[] = [];
      for (const match of JSON.stringify(doc).matchAll(refPattern)) {
        const ref = match[0].slice(1, -1);
        if (ref !== doc.id && !declaredIds.has(ref)) dangling.push(ref);
      }
      expect(dangling).toEqual([]);
    });
  }

  it("map enemy spawns reference known archetypes", () => {
    for (const doc of Object.values(contentModules)) {
      if (doc.kind !== "map") continue;
      for (const entity of (doc.entities as Json[]) ?? []) {
        if (typeof entity.enemy === "string") {
          expect(declaredIds, `enemy:${entity.enemy}`).toContain(`enemy:${entity.enemy}`);
        }
      }
    }
  });

  it("quest graphs are internally consistent", () => {
    for (const doc of Object.values(contentModules)) {
      if (doc.kind !== "quest") continue;
      const stages = doc.stages as Json[];
      const stageIds = new Set(stages.map((s) => s.id as string));
      expect(stageIds).toContain(doc.start as string);
      for (const stage of stages) {
        for (const edge of (stage.advance as Json[]) ?? []) {
          expect(stageIds, `${doc.id}: ${stage.id} -> ${edge.to}`).toContain(edge.to as string);
        }
      }
    }
  });

  it("dialogue slots point at existing nodes", () => {
    for (const doc of Object.values(contentModules)) {
      if (doc.kind !== "dialogue-bank") continue;
      const nodes = doc.nodes as Json;
      for (const slot of doc.slots as Json[]) {
        expect(nodes, `${doc.id}: slot -> ${slot.node}`).toHaveProperty(slot.node as string);
      }
    }
  });

  it("pixel grids are rectangular at declared width", () => {
    for (const doc of Object.values(contentModules)) {
      const grid = doc.grid as { w: number } | undefined;
      if (grid && Array.isArray(doc.rows)) {
        for (const row of doc.rows as string[]) expect(row).toHaveLength(grid.w);
      }
      if (grid && doc.states) {
        for (const state of Object.values(doc.states as Record<string, Json>)) {
          if (Array.isArray(state.rows)) {
            for (const row of state.rows as string[]) expect(row).toHaveLength(grid.w);
          }
        }
      }
    }
  });
});
