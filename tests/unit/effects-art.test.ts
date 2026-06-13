import { describe, expect, it } from "vitest";
import { combat, drops, enemies } from "../../src/lib/config";
import { getCharacterSprite, items } from "../../src/lib/content/registry";

describe("S9.15 no bare quads in the world", () => {
  it("gives every world pickup an authored sprite", () => {
    const droppable = new Set<string>([
      ...drops.onEnemyDeath.always.map((entry) => entry.item),
      ...drops.onEnemyDeath.rolls.map((entry) => entry.item),
    ]);
    for (const [itemId, item] of items) {
      if (!item.pickup) {
        expect(droppable.has(itemId), `${itemId} drops in the world but has no pickup`).toBe(false);
        continue;
      }
      const sprite = getCharacterSprite(item.pickup.sprite);
      expect(sprite.rows.length, itemId).toBeGreaterThan(0);
      expect(sprite.recolorChannels.length, itemId).toBeGreaterThanOrEqual(3);
    }
  });

  it("maps every projectile type fired by classes or enemies to an authored sprite", () => {
    const types = new Set<string>();
    for (const archetype of Object.values(enemies.archetypes)) {
      for (const source of [archetype.boss, archetype.caster, archetype.turret]) {
        if (source?.projectile) types.add(source.projectile.type);
      }
    }
    types.add("arrow");
    types.add("magic-bolt");

    for (const type of types) {
      const spriteId = combat.projectileSprites[type as keyof typeof combat.projectileSprites];
      expect(spriteId, `projectile ${type} needs an authored sprite`).toBeTruthy();
      const sprite = getCharacterSprite(spriteId);
      expect(sprite.rows.length, type).toBeGreaterThan(0);
    }
  });
});
