/**
 * Typed shapes for every content kind (mirrors schemas/*.schema.json —
 * the schemas are the contract, these are their TS projection).
 */

/** Procedural drawing primitive: fill, rect, triangle, or tiled rect with optional animation. */
export interface DrawOp {
  op: "fill" | "rect" | "triangle" | "repeat-rect";
  color: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  points?: number[][];
  stepX?: number;
  stepY?: number;
  count?: number;
  animate?: { anim: string; amplitude?: number; periodMs?: number; phaseFromWorldX?: number };
}

/** Tile definition: visual layers, collision, koota traits, and optional purchased sheet. */
export interface TileDef {
  id: string;
  kind: "tile";
  variantOf?: string;
  solid: boolean;
  layers?: DrawOp[];
  rows?: string[];
  /** purchased-sheet crop (slicer manifest) — same second raster source
   * props and sprites carry; palette swaps never apply. The (x,y,w,h) crop is
   * the source's NATIVE resolution (16 for roguelike, 64 for RPG Tiles Vector)
   * and the ground compositor bakes at native res so the texture never
   * magnifies into a flat blob. With `field`, (x,y) is the top-left of a
   * cols×rows block of w×h cells and the compositor samples a per-(col,row)
   * cell so a ground area shows the pack's variation, not one repeated cell. */
  sheet?: {
    image: string;
    x: number;
    y: number;
    w: number;
    h: number;
    field?: { cols: number; rows: number };
  };
  koota: { traits: string[] };
}

/** Prop state variant: visual appearance and optional purchased sheet. */
export interface PropState {
  rows?: string[];
  drawOps?: DrawOp[];
  /** purchased-sheet crop (docs/CONTENT-ARCHITECTURE.md §Purchased PNG
   * sheet sprites — slicer manifest): cell rect inside a preloaded image
   * under public/assets/. Palette swaps never apply. */
  sheet?: { image: string; x: number; y: number; w: number; h: number };
}

/** Interactive prop: collision, visual states, interaction, palette, and koota traits. */
export interface PropDef {
  id: string;
  kind: "prop";
  grid: { w: number; h: number };
  anchor: { x: number; y: number };
  solid: boolean;
  interaction?: {
    verb: string;
    method?: string;
    sfx?: string;
    once?: boolean;
    feedback?: { anim: string };
    dialogue?: { bank: string; slot: string };
  };
  states: Record<string, PropState>;
  recolorChannels?: string[];
  defaultPalette: string;
  koota: { traits: string[] };
}

/** Character sprite: grid-based animations, palette, facing method, and koota traits. */
export interface SpriteDef {
  id: string;
  kind: "character-sprite";
  description?: string;
  grid: { w: number; h: number };
  anchor: { x: number; y: number };
  rows: string[];
  frames?: Record<string, string[]>;
  recolorChannels: string[];
  defaultPalette: string;
  facing?: { method: "mirror-x" | "frames"; defaultDir: 1 | -1 };
  animations: Record<string, string>;
  koota: { traits: string[] };
}

/** One animation inside a purchased PNG sheet sprite: a horizontal strip
 * of frames, optionally laid out as 4 consecutive direction blocks
 * (docs/CONTENT-ARCHITECTURE.md §Purchased PNG sheet sprites). */
export interface SheetAnimDef {
  /** image path under public/assets/ (must be manifested) */
  image: string;
  framesPerDirection: number;
  /** true → the strip holds directionOrder.length consecutive blocks */
  directional: boolean;
  fps: number;
  /** default true; false clamps on the final frame (death) */
  loop?: boolean;
  /** y row index for multi-row sheets (row 0 when absent) */
  row?: number;
  /** third layout convention (Electric Lemon humanoids): one row per
   * direction, frames horizontal. A bare number is the row (frames start
   * at column 0); {row, col} sets the starting cell for sheets that pack
   * two directions into one row (the fighter's 2-frame attacks).
   * Mutually exclusive with directional/row; never mirrors. */
  directionRows?: Record<"right" | "up" | "left" | "down", number | { row: number; col: number }>;
}

/** Purchased sheet sprite: directional animations, facing method, and pose mappings. */
export interface SheetSpriteDef {
  id: string;
  kind: "sheet-sprite";
  description?: string;
  frameSize: { w: number; h: number };
  anchor: { x: number; y: number };
  directionOrder: ("right" | "up" | "left" | "down")[];
  /** side-view row sheets declare which way their pixels natively face;
   * the renderer mirrors when the entity faces the other way. Directional
   * block sheets (the dragon) omit this and never mirror. */
  facing?: { nativeDir: "right" | "left" };
  animations: Record<string, SheetAnimDef>;
  /** bridges the .pix pose vocabulary + choreography phases to animations */
  poseMap: Record<string, string>;
  koota: { traits: string[] };
}

/** Union type of sprite definition variants. */
export type AnySpriteDef = SpriteDef | SheetSpriteDef;

/** Anime.js animation definition: target property, keyframes, duration, and easing. */
export interface AnimationDef {
  id: string;
  kind: "animation";
  engine: "animejs";
  target: "spriteOffset" | "spriteTint" | "spriteAlpha" | "spriteScale" | "layerOffset";
  properties?: Record<string, unknown>;
  keyframes?: Record<string, unknown>[];
  duration: number;
  easing?: string;
  loop?: boolean | number;
  direction?: "normal" | "reverse" | "alternate";
  description?: string;
}

/** Map generation operation: tile fill, border, span, region, or conditional rule. */
export interface GenOp {
  op: "border" | "col" | "row" | "col-span" | "row-span" | "region" | "set";
  tile: string;
  x?: number;
  y?: number;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  at?: [number, number];
  exceptRows?: number[];
  exceptCols?: number[];
  unlessRegion?: string;
  note?: string;
}

/** Terrain variant rule: base tile, variant pool, chunk size, and random seed. */
export interface TerrainVariantRule {
  baseTile: string;
  variants: string[];
  chunk: { w: number; h: number };
  seed: number;
  note?: string;
}

/** Map entity spawn: NPC, enemy, or fixture with position, direction, and constraints. */
export interface MapEntitySpawn {
  ref?: string;
  enemy?: string;
  spawnRule?: string;
  requiresRoutePack?: string;
  withoutRoutePack?: string;
  x?: number;
  y?: number;
  tileAt?: [number, number];
  dir?: 1 | -1;
  patrol?: { points: { x: number; y: number }[]; speed?: number };
  contents?: string;
  positions?: { x: number; y: number }[];
  note?: string;
}

/** Trigger zone: warps, dialogue events, conditional effects, and visual indicators. */
export interface MapTrigger {
  id: string;
  kind?: string;
  label?: string;
  toMap?: string;
  toSpawn?: string;
  sfx?: string;
  zone?: { x0: number; y0: number; x1: number; y1: number };
  tiles?: [number, number][];
  requiresFlag?: string;
  requiresRoutePack?: string;
  solidUnlessFlag?: string;
  effects?: Record<string, unknown>[];
  indicator?: { drawOps: DrawOp[]; atTile: [number, number] };
}

/** Composition window: named region for placement layout and asset anchoring. */
export interface MapCompositionWindow {
  label: string;
  zone: { x0: number; y0: number; x1: number; y1: number };
  majorAnchors: string[];
  minorProps: string[];
  openReason?: string;
}

/** Map definition: size, generation, spawns, entities, triggers, and entry dialogue. */
export interface MapDef {
  id: string;
  kind: "map";
  name: string;
  size: { cols: number; rows: number };
  baseTile: string;
  bgmTheme: string;
  generation: GenOp[];
  terrainVariants?: TerrainVariantRule[];
  playerSpawn: { x: number; y: number };
  spawns: Record<string, { x: number; y: number }>;
  /** Rail-command wave release points (docs/RAIL-COMMAND.md §waves). */
  waveGates?: { id: string; x: number; y: number }[];
  entities: MapEntitySpawn[];
  composition?: { routeWindows?: MapCompositionWindow[] };
  triggers?: MapTrigger[];
  onEnter?: { dialogue: string; slot: string; once?: boolean }[];
}

/** Character: name, role, sprite, portrait, and optional dialogue bank. */
export interface CharacterDef {
  name: string;
  role: "player" | "npc" | "voice";
  sprite?: string;
  palette?: string;
  portraitColor?: string;
  dialogue?: string;
  note?: string;
}

/** Item definition: pickup visual, effects, and floater feedback. */
export interface ItemDef {
  name: string;
  pickup?: { sprite: string; color?: string; anim?: string; sfx?: string };
  onPickup: Record<string, unknown>[];
  floater?: { text: string; color: string };
}

/** Shop listing: item, label, description, and buy/sell prices. */
export interface ShopListingDef {
  id: string;
  item: string;
  label: string;
  description: string;
  buyPrice: number;
  sellPrice: number;
}

/** Shop definition: name, keeper, currency, and item listings. */
export interface ShopDef {
  id: string;
  kind: "shop";
  name: string;
  keeper: string;
  currency: string;
  buySfx?: string;
  sellSfx?: string;
  denySfx?: string;
  listings: ShopListingDef[];
}

/** Flag definition: default value and description. */
export interface FlagDef {
  default: boolean;
  description: string;
}

/** Quest counter: event type, optional filter, and target completion count. */
export interface QuestCounter {
  event: string;
  match?: Record<string, unknown>;
  target: number;
}

/** Quest stage transition condition: dialogue, counters, defeats, items, or flags. */
export interface QuestCondition {
  dialogueEvent?: string;
  counterDone?: string;
  enemyDefeated?: string;
  itemAcquired?: string;
  shopTransaction?: { verb: "buy" | "sell"; shop?: string; listing?: string; item?: string };
  enterZone?: { map: string; trigger: string };
  flag?: string;
}

/** Quest stage transition: condition and destination stage with optional effects. */
export interface QuestEdge {
  when: QuestCondition;
  to: string;
  effects?: Record<string, unknown>[];
}

/** Quest stage: log text, counters, completion conditions, and transitions. */
export interface QuestStage {
  id: string;
  log?: string;
  terminal?: boolean;
  counters?: Record<string, QuestCounter>;
  hints?: Record<string, unknown>[];
  advance?: QuestEdge[];
}

/** Quest definition: title, start stage, stages, and optional auto-start trigger. */
export interface QuestDef {
  id: string;
  kind: "quest";
  title: string;
  act?: number;
  autoStart?: boolean;
  startOn?: { enterMap?: string };
  start: string;
  stages: QuestStage[];
}

/** Dialogue slot: conditional dialogue variant selected by quest/stage/flag state. */
export interface DialogueSlot {
  id?: string;
  when?: {
    quest?: string;
    stage?: string;
    stageIn?: string[];
    flag?: string;
    notFlag?: string;
  };
  default?: boolean;
  node: string;
}

/** Dialogue node: text lines, player choices, and optional shop trigger. */
export interface DialogueNode {
  lines: string[];
  opensShop?: string;
  choices?: { id: string; text: string; goto?: string }[];
  emits: string;
}

/** Dialogue bank: speaker, portrait, conditional slots, and dialogue nodes. */
export interface DialogueBankDef {
  id: string;
  kind: "dialogue-bank";
  speaker: string;
  portraitOverride?: string;
  slots: DialogueSlot[];
  nodes: Record<string, DialogueNode>;
}

/** Palette definition: named colors keyed by identifier. */
export interface PaletteDef {
  id: string;
  kind: "palette";
  colors: Record<string, { hex: string; name?: string }>;
}

/** Palette swaps: base palette and variant color remappings. */
export interface PaletteSwapsDef {
  kind: "palette-swaps";
  base: string;
  swaps: Record<string, Record<string, string>>;
}
