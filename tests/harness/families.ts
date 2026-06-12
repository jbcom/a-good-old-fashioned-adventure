import { enemies } from "../../src/lib/config";

/** Archetype ids tagged with a warband family (enemies.json `family`). */
export function familyArchetypeIds(family: string): string[] {
  return Object.entries(enemies.archetypes)
    .filter(([, archetype]) => archetype.family === family)
    .map(([id]) => id);
}
