import { describe, expect, it } from "vitest";
import { incremental } from "../../src/lib/config";
import {
  animations,
  characters,
  dialogueBanks,
  flags,
  getCharacterSprite,
  getDialogueBank,
  getMap,
  getQuest,
  getShop,
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
    expect(tiles.size).toBe(48);
    // 69 authored props + 8 mega-sheet slicer props (dungeon + approach)
    expect(props.size).toBe(82);
    // 86 .pix sprites + 43 JSON sheet-sprites (src/content/sprites/*.json:
    // purchased animal/character/dragon-kin slices). S-DAG-ICONS retired 52
    // generic-node .pix emblems (now iconRef sheet crops); S20.2 added 5
    // unit-feel FX sprites (deploy-puff, charge-dust, blade-arc, heal-glow,
    // wither-tint). The bespoke emblems that remain are identity nodes
    // (dragon/lair/relic/route/named-boss/rose-major).
    expect(sprites.size).toBe(153);
    expect(animations.size).toBe(7);
    expect(maps.size).toBe(40);
    expect(quests.size).toBe(21);
    expect(dialogueBanks.size).toBe(31);
    expect(characters.size).toBe(35);
    expect(items.size).toBe(10);
    expect(flags.size).toBe(22);
    expect(shops.size).toBe(3);
  });

  it("typed lookups resolve real content", () => {
    expect(getTile("tile:water").solid).toBe(true);
    expect(getCharacterSprite("sprite:hero").rows).toHaveLength(16);
    expect(getMap("map:overworld").size).toEqual({ cols: 96, rows: 48 });
    expect(getQuest("quest:broken-bridge").start).toBe("find-woodcutter");
    expect(getQuest("quest:stable-oat-kindness").start).toBe("buy-oats");
    expect(getQuest("quest:oldwood-oat-token").start).toBe("wait-for-stable-service");
    expect(getQuest("quest:deep-forest-fern-light").start).toBe("greet-fern-mender");
    expect(getQuest("quest:village-letter-basket").start).toBe("read-letter");
    expect(getQuest("quest:sunken-courier-warning").start).toBe("take-warning");
    expect(getQuest("quest:oldwood-thorncutters-lantern").start).toBe("greet-thorncutter");
    expect(getQuest("quest:approach-pilgrim-warning").start).toBe("take-warning");
    expect(getQuest("quest:oldwood-lantern-keeper").start).toBe("greet-keeper");
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
      // sheet sprites own their animations inline (frame strips, not
      // anim:* refs) — tests/unit/sheet-sprites.test.ts validates those
      if (sprite.kind === "sheet-sprite") continue;
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

  it("every upgrade node carries an emblem — a bespoke .pix OR a sheet iconRef", () => {
    // the DAG is a wall of designs, never a wall of text
    // (docs/DESIGN-SYSTEM.md §upgrade emblems). S-DAG-ICONS hybrid: identity
    // nodes (dragon/lair/relic/route) keep a bespoke emblem-<slug>.pix; generic
    // nodes (economy/class/plain-enemy/ability) carry an iconRef sheet crop.
    // Every node must have exactly one of the two.
    for (const node of incremental.upgradeGraph.nodes) {
      const emblemId = node.id.replace(/^upgrade:/, "sprite:emblem-");
      const hasBespoke = sprites.has(emblemId);
      const hasIcon = node.iconRef !== undefined;
      expect(
        hasBespoke || hasIcon,
        `${node.id} has neither a bespoke emblem ${emblemId} nor an iconRef`,
      ).toBe(true);
      // not both — a node migrated to an iconRef should have its .pix retired
      expect(
        !(hasBespoke && hasIcon),
        `${node.id} has BOTH a bespoke emblem and an iconRef — retire the .pix`,
      ).toBe(true);
    }
  });
});
