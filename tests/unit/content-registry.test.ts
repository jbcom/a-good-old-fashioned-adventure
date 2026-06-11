import { describe, expect, it } from "vitest";
import {
  animations,
  characters,
  dialogueBanks,
  flags,
  getDialogueBank,
  getMap,
  getQuest,
  getShop,
  getSprite,
  getTile,
  items,
  maps,
  props,
  quests,
  shops,
  sprites,
  tiles,
} from "../../src/lib/content/registry";

describe("registries are fully populated", () => {
  it("counts match the content tree", () => {
    expect(tiles.size).toBe(17);
    expect(props.size).toBe(64);
    expect(sprites.size).toBe(3);
    expect(animations.size).toBe(7);
    expect(maps.size).toBe(16);
    expect(quests.size).toBe(18);
    expect(dialogueBanks.size).toBe(29);
    expect(characters.size).toBe(32);
    expect(items.size).toBe(10);
    expect(flags.size).toBe(20);
    expect(shops.size).toBe(3);
  });

  it("typed lookups resolve real content", () => {
    expect(getTile("tile:water").solid).toBe(true);
    expect(getSprite("sprite:hero").rows).toHaveLength(16);
    expect(getMap("map:overworld").size).toEqual({ cols: 96, rows: 48 });
    expect(getQuest("quest:broken-bridge").start).toBe("find-woodcutter");
    expect(getQuest("quest:stable-oat-kindness").start).toBe("buy-oats");
    expect(getQuest("quest:oldwood-oat-token").start).toBe("wait-for-stable-service");
    expect(getQuest("quest:deep-forest-fern-light").start).toBe("greet-fern-mender");
    expect(getQuest("quest:village-letter-basket").start).toBe("read-letter");
    expect(getQuest("quest:sunken-courier-warning").start).toBe("take-warning");
    expect(getQuest("quest:oldwood-thorncutters-lantern").start).toBe("greet-thorncutter");
    expect(getQuest("quest:approach-pilgrim-warning").start).toBe("take-warning");
    expect(getShop("shop:brindle-counter").listings).toHaveLength(2);
    expect(getShop("shop:oswin-stable-counter").listings).toHaveLength(2);
    expect(getShop("shop:road-cart-counter").listings).toHaveLength(2);
    expect(getDialogueBank("dlgbank:woodcutter").nodes.request.emits).toBe(
      "dlg:woodcutter.request",
    );
  });

  it("unknown ids fail loud with the kind in the message", () => {
    expect(() => getTile("tile:lava")).toThrow(/unknown tile: tile:lava/);
    expect(() => getQuest("quest:nope")).toThrow(/unknown quest/);
  });

  it("every sprite animation ref resolves through the registry", () => {
    for (const sprite of sprites.values()) {
      for (const animId of Object.values(sprite.animations)) {
        expect(animations.has(animId), `${sprite.id} -> ${animId}`).toBe(true);
      }
    }
  });

  it("every character dialogue ref resolves", () => {
    for (const [id, character] of characters) {
      if (character.dialogue) {
        expect(dialogueBanks.has(character.dialogue), `${id} -> ${character.dialogue}`).toBe(true);
      }
    }
  });
});
