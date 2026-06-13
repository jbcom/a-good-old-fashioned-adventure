import { describe, expect, it } from "vitest";
import { enemies, incremental } from "../../src/lib/config";
import { getCharacterSprite, getMap } from "../../src/lib/content/registry";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import {
  applyIncrementalEventReward,
  sanitizeIncrementalProgress,
} from "../../src/sim/incrementalProgress";
import { IncrementalProgress } from "../../src/sim/traits";

describe("S9.8 miniboss ladder", () => {
  it("fields a named bespoke miniboss on every route pack", () => {
    for (const pack of incremental.routePacks) {
      const archetypesOnPack = new Set<string>();
      for (const mapId of pack.maps) {
        for (const entity of getMap(mapId).entities) {
          if (entity.enemy) archetypesOnPack.add(entity.enemy);
        }
      }
      const minibosses = [...archetypesOnPack].filter(
        (id) => enemies.archetypes[id]?.miniboss === true,
      );
      expect(minibosses.length, `${pack.id} needs a placed miniboss`).toBeGreaterThanOrEqual(1);
      for (const id of minibosses) {
        const archetype = enemies.archetypes[id];
        expect(archetype.sprite, `${id} needs a bespoke design`).toMatch(/^sprite:boss-/);
        expect(getCharacterSprite(archetype.sprite).rows.length).toBeGreaterThan(0);
      }
    }
    // the dragon remains the final guardian, not a miniboss
    expect(enemies.archetypes["dragon-guardian"].miniboss).toBeUndefined();
    expect(enemies.archetypes["shadow-warlord"].miniboss).toBeUndefined();
  });

  it("pays a purse on every clear and a rose only on the first clean clear", () => {
    const world = createGameWorld(91);
    instantiateMap(world, "map:rescue-route", { classId: "knight" });
    const before = world.get(IncrementalProgress);
    const coins0 = before?.coins ?? 0;

    applyIncrementalEventReward(world, { type: "enemy:defeated", archetypeId: "desert-wyrm" });
    const first = world.get(IncrementalProgress);
    expect(first?.coins).toBe(coins0 + 3 + 15);
    expect(first?.roses).toBe(1);
    expect(first?.defeatedMinibossIds).toContain("desert-wyrm");

    applyIncrementalEventReward(world, { type: "enemy:defeated", archetypeId: "desert-wyrm" });
    const second = world.get(IncrementalProgress);
    expect(second?.coins).toBe(coins0 + 2 * (3 + 15));
    expect(second?.roses).toBe(1);

    // trash mobs stay plain bounties
    applyIncrementalEventReward(world, { type: "enemy:defeated", archetypeId: "forest-orc" });
    expect(world.get(IncrementalProgress)?.coins).toBe(coins0 + 2 * 18 + 3);
  });

  it("persists first-clear ledgers through save sanitization", () => {
    const progress = sanitizeIncrementalProgress({
      defeatedMinibossIds: ["desert-wyrm", "banner-knight", "not-a-boss", "forest-orc"],
    });
    expect(progress.defeatedMinibossIds).toEqual(["desert-wyrm", "banner-knight"]);
  });
});
