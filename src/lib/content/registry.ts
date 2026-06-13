/**
 * Content registries: every JSON file under src/content globbed at build
 * time into typed, ID-keyed maps. Code never imports content files
 * directly — it asks a registry. Schema validation runs in the unit suite
 * (tests/unit/content-integrity.test.ts); lookups here fail loud so a
 * dangling ID can never limp into gameplay.
 */

import { parsePixelSheet } from "./pixelSheet";
import type {
  AnimationDef,
  AnySpriteDef,
  CharacterDef,
  DialogueBankDef,
  FlagDef,
  ItemDef,
  MapDef,
  PropDef,
  QuestDef,
  ShopDef,
  SpriteDef,
  TileDef,
} from "./types";

function byId<T extends { id: string }>(defs: Iterable<T>): Map<string, T> {
  const map = new Map<string, T>();
  for (const def of defs) {
    if (map.has(def.id)) throw new Error(`duplicate content id: ${def.id}`);
    map.set(def.id, def);
  }
  return map;
}

const glob = <T>(modules: Record<string, T>) => modules;

const tileModules = glob<TileDef>(
  import.meta.glob("/src/content/tiles/*.json", { eager: true, import: "default" }),
);

const pixelSheetModules = import.meta.glob<string>("/src/content/pixelart/**/*.pix", {
  eager: true,
  query: "?raw",
  import: "default",
});

const pixelSheetTiles = Object.entries(pixelSheetModules).flatMap(
  ([path, source]) => parsePixelSheet(source, path).tiles,
);
const pixelSheetProps = Object.entries(pixelSheetModules).flatMap(
  ([path, source]) => parsePixelSheet(source, path).props,
);
const pixelSheetSprites = Object.entries(pixelSheetModules).flatMap(
  ([path, source]) => parsePixelSheet(source, path).sprites,
);

/** ID-keyed tiles from JSON and .pix sheets. */
export const tiles = byId([...Object.values(tileModules), ...pixelSheetTiles]);

/** ID-keyed props from JSON and .pix sheets. */
export const props = byId([
  ...Object.values(
    glob<PropDef>(
      import.meta.glob("/src/content/props/*.json", { eager: true, import: "default" }),
    ),
  ),
  ...pixelSheetProps,
]);

/** ID-keyed sprites from JSON and .pix sheets (character/sheet-sprite). */
export const sprites = byId([
  ...Object.values(
    glob<AnySpriteDef>(
      import.meta.glob("/src/content/sprites/*.json", { eager: true, import: "default" }),
    ),
  ),
  ...pixelSheetSprites,
]);

/** ID-keyed animations (sprite frame sequences). */
export const animations = byId(
  Object.values(
    glob<AnimationDef>(
      import.meta.glob("/src/content/animations/*.json", { eager: true, import: "default" }),
    ),
  ),
);

/** ID-keyed world maps. */
export const maps = byId(
  Object.values(
    glob<MapDef>(
      import.meta.glob("/src/content/world/maps/*.json", { eager: true, import: "default" }),
    ),
  ),
);

/** ID-keyed quests. */
export const quests = byId(
  Object.values(
    glob<QuestDef>(
      import.meta.glob("/src/content/story/quests/*.json", { eager: true, import: "default" }),
    ),
  ),
);

/** ID-keyed dialogue banks (NPC conversations). */
export const dialogueBanks = byId(
  Object.values(
    glob<DialogueBankDef>(
      import.meta.glob("/src/content/story/dialogue/*.json", { eager: true, import: "default" }),
    ),
  ),
);

/** ID-keyed shops (merchant inventories). */
export const shops = byId(
  Object.values(
    glob<ShopDef>(
      import.meta.glob("/src/content/shops/*.json", { eager: true, import: "default" }),
    ),
  ),
);

import castFile from "../../content/story/characters.json";
import flagsFile from "../../content/story/flags.json";
import itemsFile from "../../content/story/items.json";

/** ID-keyed characters (NPCs and player). */
export const characters = new Map<string, CharacterDef>(
  Object.entries(castFile.characters as Record<string, CharacterDef>),
);
/** ID-keyed items (loot, currency, consumables). */
export const items = new Map<string, ItemDef>(
  Object.entries(itemsFile.items as Record<string, ItemDef>),
);
/** ID-keyed flags (save state/quest progress). */
export const flags = new Map<string, FlagDef>(
  Object.entries(flagsFile.flags as Record<string, FlagDef>),
);

function lookup<T>(registry: Map<string, T>, id: string, kind: string): T {
  const def = registry.get(id);
  if (!def) throw new Error(`unknown ${kind}: ${id}`);
  return def;
}

/** Fetch a tile by ID; fails loud if not found. */
export const getTile = (id: string) => lookup(tiles, id, "tile");
/** Fetch a prop by ID; fails loud if not found. */
export const getProp = (id: string) => lookup(props, id, "prop");
/** Fetch a sprite by ID; fails loud if not found. */
export const getSprite = (id: string) => lookup(sprites, id, "sprite");
/** Narrowing lookup for consumers that need .pix rows/frames/palette swaps
 * (rasterizers, recolor tests) — fails loud on a purchased sheet sprite. */
export const getCharacterSprite = (id: string): SpriteDef => {
  const def = getSprite(id);
  if (def.kind !== "character-sprite") throw new Error(`${id} is not a character-sprite`);
  return def;
};
/** Fetch an animation by ID; fails loud if not found. */
export const getAnimation = (id: string) => lookup(animations, id, "animation");
/** Fetch a map by ID; fails loud if not found. */
export const getMap = (id: string) => lookup(maps, id, "map");
/** Fetch a quest by ID; fails loud if not found. */
export const getQuest = (id: string) => lookup(quests, id, "quest");
/** Fetch a dialogue bank by ID; fails loud if not found. */
export const getDialogueBank = (id: string) => lookup(dialogueBanks, id, "dialogue bank");
/** Fetch a shop by ID; fails loud if not found. */
export const getShop = (id: string) => lookup(shops, id, "shop");
/** Fetch a character by ID; fails loud if not found. */
export const getCharacter = (id: string) => lookup(characters, id, "character");
/** Fetch an item by ID; fails loud if not found. */
export const getItem = (id: string) => lookup(items, id, "item");
/** Fetch a flag by ID; fails loud if not found. */
export const getFlag = (id: string) => lookup(flags, id, "flag");
