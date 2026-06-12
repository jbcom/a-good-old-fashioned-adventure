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

export const tiles = byId([...Object.values(tileModules), ...pixelSheetTiles]);

export const props = byId([
  ...Object.values(
    glob<PropDef>(
      import.meta.glob("/src/content/props/*.json", { eager: true, import: "default" }),
    ),
  ),
  ...pixelSheetProps,
]);

export const sprites = byId([
  ...Object.values(
    glob<SpriteDef>(
      import.meta.glob("/src/content/sprites/*.json", { eager: true, import: "default" }),
    ),
  ),
  ...pixelSheetSprites,
]);

export const animations = byId(
  Object.values(
    glob<AnimationDef>(
      import.meta.glob("/src/content/animations/*.json", { eager: true, import: "default" }),
    ),
  ),
);

export const maps = byId(
  Object.values(
    glob<MapDef>(
      import.meta.glob("/src/content/world/maps/*.json", { eager: true, import: "default" }),
    ),
  ),
);

export const quests = byId(
  Object.values(
    glob<QuestDef>(
      import.meta.glob("/src/content/story/quests/*.json", { eager: true, import: "default" }),
    ),
  ),
);

export const dialogueBanks = byId(
  Object.values(
    glob<DialogueBankDef>(
      import.meta.glob("/src/content/story/dialogue/*.json", { eager: true, import: "default" }),
    ),
  ),
);

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

export const characters = new Map<string, CharacterDef>(
  Object.entries(castFile.characters as Record<string, CharacterDef>),
);
export const items = new Map<string, ItemDef>(
  Object.entries(itemsFile.items as Record<string, ItemDef>),
);
export const flags = new Map<string, FlagDef>(
  Object.entries(flagsFile.flags as Record<string, FlagDef>),
);

function lookup<T>(registry: Map<string, T>, id: string, kind: string): T {
  const def = registry.get(id);
  if (!def) throw new Error(`unknown ${kind}: ${id}`);
  return def;
}

export const getTile = (id: string) => lookup(tiles, id, "tile");
export const getProp = (id: string) => lookup(props, id, "prop");
export const getSprite = (id: string) => lookup(sprites, id, "sprite");
export const getAnimation = (id: string) => lookup(animations, id, "animation");
export const getMap = (id: string) => lookup(maps, id, "map");
export const getQuest = (id: string) => lookup(quests, id, "quest");
export const getDialogueBank = (id: string) => lookup(dialogueBanks, id, "dialogue bank");
export const getShop = (id: string) => lookup(shops, id, "shop");
export const getCharacter = (id: string) => lookup(characters, id, "character");
export const getItem = (id: string) => lookup(items, id, "item");
export const getFlag = (id: string) => lookup(flags, id, "flag");
