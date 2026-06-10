/**
 * Content registries: every JSON file under src/content globbed at build
 * time into typed, ID-keyed maps. Code never imports content files
 * directly — it asks a registry. Schema validation runs in the unit suite
 * (tests/unit/content-integrity.test.ts); lookups here fail loud so a
 * dangling ID can never limp into gameplay.
 */
import type {
  AnimationDef,
  CharacterDef,
  DialogueBankDef,
  FlagDef,
  ItemDef,
  MapDef,
  PropDef,
  QuestDef,
  SpriteDef,
  TileDef,
} from "./types";

function byId<T extends { id: string }>(modules: Record<string, T>): Map<string, T> {
  const map = new Map<string, T>();
  for (const def of Object.values(modules)) map.set(def.id, def);
  return map;
}

const glob = <T>(modules: Record<string, T>) => modules;

export const tiles = byId(
  glob<TileDef>(import.meta.glob("/src/content/tiles/*.json", { eager: true, import: "default" })),
);

export const props = byId(
  glob<PropDef>(import.meta.glob("/src/content/props/*.json", { eager: true, import: "default" })),
);

export const sprites = byId(
  glob<SpriteDef>(
    import.meta.glob("/src/content/sprites/*.json", { eager: true, import: "default" }),
  ),
);

export const animations = byId(
  glob<AnimationDef>(
    import.meta.glob("/src/content/animations/*.json", { eager: true, import: "default" }),
  ),
);

export const maps = byId(
  glob<MapDef>(
    import.meta.glob("/src/content/world/maps/*.json", { eager: true, import: "default" }),
  ),
);

export const quests = byId(
  glob<QuestDef>(
    import.meta.glob("/src/content/story/quests/*.json", { eager: true, import: "default" }),
  ),
);

export const dialogueBanks = byId(
  glob<DialogueBankDef>(
    import.meta.glob("/src/content/story/dialogue/*.json", { eager: true, import: "default" }),
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
export const getCharacter = (id: string) => lookup(characters, id, "character");
export const getItem = (id: string) => lookup(items, id, "item");
export const getFlag = (id: string) => lookup(flags, id, "flag");
