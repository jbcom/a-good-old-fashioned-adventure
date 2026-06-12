/**
 * Typed shapes for every content kind (mirrors schemas/*.schema.json —
 * the schemas are the contract, these are their TS projection).
 */

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

export interface TileDef {
  id: string;
  kind: "tile";
  variantOf?: string;
  solid: boolean;
  layers?: DrawOp[];
  rows?: string[];
  koota: { traits: string[] };
}

export interface PropState {
  rows?: string[];
  drawOps?: DrawOp[];
}

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

export interface SpriteDef {
  id: string;
  kind: "character-sprite";
  description?: string;
  grid: { w: number; h: number };
  anchor: { x: number; y: number };
  rows: string[];
  recolorChannels: string[];
  defaultPalette: string;
  facing?: { method: "mirror-x" | "frames"; defaultDir: 1 | -1 };
  animations: Record<string, string>;
  koota: { traits: string[] };
}

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

export interface TerrainVariantRule {
  baseTile: string;
  variants: string[];
  chunk: { w: number; h: number };
  seed: number;
  note?: string;
}

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

export interface MapCompositionWindow {
  label: string;
  zone: { x0: number; y0: number; x1: number; y1: number };
  majorAnchors: string[];
  minorProps: string[];
  openReason?: string;
}

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
  entities: MapEntitySpawn[];
  composition?: { routeWindows?: MapCompositionWindow[] };
  triggers?: MapTrigger[];
  onEnter?: { dialogue: string; slot: string; once?: boolean }[];
}

export interface CharacterDef {
  name: string;
  role: "player" | "npc" | "voice";
  sprite?: string;
  palette?: string;
  portraitColor?: string;
  dialogue?: string;
  note?: string;
}

export interface ItemDef {
  name: string;
  pickup?: { sprite: string; color?: string; anim?: string; sfx?: string };
  onPickup: Record<string, unknown>[];
  floater?: { text: string; color: string };
}

export interface ShopListingDef {
  id: string;
  item: string;
  label: string;
  description: string;
  buyPrice: number;
  sellPrice: number;
}

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

export interface FlagDef {
  default: boolean;
  description: string;
}

export interface QuestCounter {
  event: string;
  match?: Record<string, unknown>;
  target: number;
}

export interface QuestCondition {
  dialogueEvent?: string;
  counterDone?: string;
  enemyDefeated?: string;
  itemAcquired?: string;
  shopTransaction?: { verb: "buy" | "sell"; shop?: string; listing?: string; item?: string };
  enterZone?: { map: string; trigger: string };
  flag?: string;
}

export interface QuestEdge {
  when: QuestCondition;
  to: string;
  effects?: Record<string, unknown>[];
}

export interface QuestStage {
  id: string;
  log?: string;
  terminal?: boolean;
  counters?: Record<string, QuestCounter>;
  hints?: Record<string, unknown>[];
  advance?: QuestEdge[];
}

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

export interface DialogueNode {
  lines: string[];
  opensShop?: string;
  choices?: { id: string; text: string; goto?: string }[];
  emits: string;
}

export interface DialogueBankDef {
  id: string;
  kind: "dialogue-bank";
  speaker: string;
  portraitOverride?: string;
  slots: DialogueSlot[];
  nodes: Record<string, DialogueNode>;
}

export interface PaletteDef {
  id: string;
  kind: "palette";
  colors: Record<string, { hex: string; name?: string }>;
}

export interface PaletteSwapsDef {
  kind: "palette-swaps";
  base: string;
  swaps: Record<string, Record<string, string>>;
}
