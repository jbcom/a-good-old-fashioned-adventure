import type { PropDef, SpriteDef, TileDef } from "./types";

interface DraftTile {
  kind: "tile";
  id: string;
  solid?: boolean;
  variantOf?: string;
  traits?: string[];
  rows: string[];
}

interface DraftProp {
  kind: "prop";
  id: string;
  grid?: { w: number; h: number };
  anchor?: { x: number; y: number };
  solid?: boolean;
  state?: string;
  recolorChannels?: string[];
  defaultPalette?: string;
  traits?: string[];
  rows: string[];
}

interface DraftSprite {
  kind: "sprite";
  id: string;
  description?: string;
  grid?: { w: number; h: number };
  anchor?: { x: number; y: number };
  recolorChannels?: string[];
  defaultPalette?: string;
  facing?: { method: "mirror-x" | "frames"; defaultDir: 1 | -1 };
  animations?: Record<string, string>;
  traits?: string[];
  rows: string[];
}

type DraftAsset = DraftTile | DraftProp | DraftSprite;

export interface ParsedPixelSheet {
  tiles: TileDef[];
  props: PropDef[];
  sprites: SpriteDef[];
}

const tileIdPattern = /^tile:[a-z0-9-]+$/;
const propIdPattern = /^prop:[a-z0-9-]+$/;
const spriteIdPattern = /^sprite:[a-z0-9-]+$/;
const paletteIdPattern = /^palette:[a-z0-9-]+$/;
const animIdPattern = /^anim:[a-z0-9-]+$/;

function parseBoolean(value: string, path: string, lineNumber: number): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${path}:${lineNumber}: expected true or false, received ${value}`);
}

function finalizeTile(draft: DraftTile, path: string): TileDef {
  if (draft.solid === undefined) throw new Error(`${path}:${draft.id}: missing solid`);
  if (!draft.traits?.length) throw new Error(`${path}:${draft.id}: missing traits`);
  if (draft.rows.length !== 16) {
    throw new Error(`${path}:${draft.id}: expected 16 pixel rows, received ${draft.rows.length}`);
  }
  for (const row of draft.rows) {
    if (row.length !== 16) throw new Error(`${path}:${draft.id}: row ${row} is not 16 pixels`);
  }
  return {
    id: draft.id,
    kind: "tile",
    variantOf: draft.variantOf,
    solid: draft.solid,
    rows: draft.rows,
    koota: { traits: draft.traits },
  };
}

function parseSize(value: string, path: string, lineNumber: number): { w: number; h: number } {
  const match = value.match(/^(\d+)x(\d+)$/);
  if (!match) throw new Error(`${path}:${lineNumber}: expected size like 16x16`);
  return { w: Number(match[1]), h: Number(match[2]) };
}

function parseAnchor(value: string, path: string, lineNumber: number): { x: number; y: number } {
  const match = value.match(/^(-?\d+),(-?\d+)$/);
  if (!match) throw new Error(`${path}:${lineNumber}: expected anchor like 8,16`);
  return { x: Number(match[1]), y: Number(match[2]) };
}

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseAnimations(value: string, path: string, lineNumber: number): Record<string, string> {
  const animations: Record<string, string> = {};
  for (const entry of parseCsv(value)) {
    const [name, animId] = entry.split("=");
    if (!name || !animId || !animIdPattern.test(animId)) {
      throw new Error(`${path}:${lineNumber}: expected animation entry like walk=anim:walk-bob`);
    }
    animations[name] = animId;
  }
  return animations;
}

function parseFacing(
  value: string,
  path: string,
  lineNumber: number,
): { method: "mirror-x" | "frames"; defaultDir: 1 | -1 } {
  const [method, dir] = value.split(/\s+/);
  if (method !== "mirror-x" && method !== "frames") {
    throw new Error(`${path}:${lineNumber}: unsupported facing method ${method}`);
  }
  if (dir !== "1" && dir !== "-1") {
    throw new Error(`${path}:${lineNumber}: facing defaultDir must be 1 or -1`);
  }
  return { method, defaultDir: Number(dir) as 1 | -1 };
}

function validateRows(
  draft: { id: string; rows: string[] },
  grid: { w: number; h: number },
  path: string,
): void {
  if (draft.rows.length !== grid.h) {
    throw new Error(
      `${path}:${draft.id}: expected ${grid.h} pixel rows, received ${draft.rows.length}`,
    );
  }
  for (const row of draft.rows) {
    if (row.length !== grid.w)
      throw new Error(`${path}:${draft.id}: row ${row} is not ${grid.w} pixels`);
  }
}

function finalizeProp(draft: DraftProp, path: string): PropDef {
  if (!draft.grid) throw new Error(`${path}:${draft.id}: missing grid`);
  if (!draft.anchor) throw new Error(`${path}:${draft.id}: missing anchor`);
  if (draft.solid === undefined) throw new Error(`${path}:${draft.id}: missing solid`);
  if (!draft.state) throw new Error(`${path}:${draft.id}: missing state`);
  if (!draft.recolorChannels?.length) throw new Error(`${path}:${draft.id}: missing channels`);
  if (!draft.defaultPalette) throw new Error(`${path}:${draft.id}: missing palette`);
  if (!draft.traits?.length) throw new Error(`${path}:${draft.id}: missing traits`);
  validateRows(draft, draft.grid, path);
  return {
    id: draft.id,
    kind: "prop",
    grid: draft.grid,
    anchor: draft.anchor,
    solid: draft.solid,
    states: { [draft.state]: { rows: draft.rows } },
    recolorChannels: draft.recolorChannels,
    defaultPalette: draft.defaultPalette,
    koota: { traits: draft.traits },
  };
}

function finalizeSprite(draft: DraftSprite, path: string): SpriteDef {
  if (!draft.grid) throw new Error(`${path}:${draft.id}: missing grid`);
  if (!draft.anchor) throw new Error(`${path}:${draft.id}: missing anchor`);
  if (!draft.recolorChannels?.length) throw new Error(`${path}:${draft.id}: missing channels`);
  if (!draft.defaultPalette) throw new Error(`${path}:${draft.id}: missing palette`);
  if (!draft.animations) throw new Error(`${path}:${draft.id}: missing animations`);
  if (!draft.traits?.length) throw new Error(`${path}:${draft.id}: missing traits`);
  validateRows(draft, draft.grid, path);
  return {
    id: draft.id,
    kind: "character-sprite",
    description: draft.description,
    grid: draft.grid,
    anchor: draft.anchor,
    rows: draft.rows,
    recolorChannels: draft.recolorChannels,
    defaultPalette: draft.defaultPalette,
    facing: draft.facing,
    animations: draft.animations,
    koota: { traits: draft.traits },
  };
}

export function parsePixelSheet(source: string, path = "<pixel-sheet>"): ParsedPixelSheet {
  const tiles: TileDef[] = [];
  const props: PropDef[] = [];
  const sprites: SpriteDef[] = [];
  let current: DraftAsset | null = null;
  let readingRows = false;

  const closeCurrent = () => {
    if (!current) throw new Error(`${path}: @end without an open asset`);
    switch (current.kind) {
      case "tile":
        tiles.push(finalizeTile(current, path));
        break;
      case "prop":
        props.push(finalizeProp(current, path));
        break;
      case "sprite":
        sprites.push(finalizeSprite(current, path));
        break;
    }
    current = null;
    readingRows = false;
  };

  const lines = source.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const lineNumber = index + 1;
    const line = lines[index].trim();
    if (!line || (!readingRows && line.startsWith("#"))) continue;
    if (line === "@pixel-sheet v1") continue;

    if (readingRows) {
      if (line === "@end") {
        closeCurrent();
      } else if (!current) {
        throw new Error(`${path}:${lineNumber}: pixel row without an open asset`);
      } else {
        current.rows.push(line);
      }
      continue;
    }

    if (line.startsWith("@tile ")) {
      if (current) throw new Error(`${path}:${lineNumber}: nested @tile block`);
      const id = line.slice("@tile ".length).trim();
      if (!tileIdPattern.test(id)) throw new Error(`${path}:${lineNumber}: invalid tile id ${id}`);
      current = { kind: "tile", id, rows: [] };
      continue;
    }

    if (line.startsWith("@prop ")) {
      if (current) throw new Error(`${path}:${lineNumber}: nested @prop block`);
      const id = line.slice("@prop ".length).trim();
      if (!propIdPattern.test(id)) throw new Error(`${path}:${lineNumber}: invalid prop id ${id}`);
      current = { kind: "prop", id, rows: [] };
      continue;
    }

    if (line.startsWith("@sprite ")) {
      if (current) throw new Error(`${path}:${lineNumber}: nested @sprite block`);
      const id = line.slice("@sprite ".length).trim();
      if (!spriteIdPattern.test(id)) {
        throw new Error(`${path}:${lineNumber}: invalid sprite id ${id}`);
      }
      current = { kind: "sprite", id, rows: [] };
      continue;
    }

    if (line === "@end") {
      closeCurrent();
      continue;
    }

    if (!current) throw new Error(`${path}:${lineNumber}: field outside an asset block`);
    if (line === "rows") {
      readingRows = true;
      continue;
    }

    const [key, ...rest] = line.split(/\s+/);
    const value = rest.join(" ");
    switch (key) {
      case "description":
        if (current.kind !== "sprite")
          throw new Error(`${path}:${lineNumber}: description is sprite-only`);
        current.description = value;
        break;
      case "grid":
        if (current.kind === "tile")
          throw new Error(`${path}:${lineNumber}: tiles are fixed 16x16`);
        current.grid = parseSize(value, path, lineNumber);
        break;
      case "anchor":
        if (current.kind === "tile")
          throw new Error(`${path}:${lineNumber}: tiles do not use anchors`);
        current.anchor = parseAnchor(value, path, lineNumber);
        break;
      case "solid":
        if (current.kind === "sprite")
          throw new Error(`${path}:${lineNumber}: sprites do not use solid`);
        current.solid = parseBoolean(value, path, lineNumber);
        break;
      case "variantOf":
        if (current.kind !== "tile")
          throw new Error(`${path}:${lineNumber}: variantOf is tile-only`);
        if (!tileIdPattern.test(value)) {
          throw new Error(`${path}:${lineNumber}: invalid variantOf tile id ${value}`);
        }
        current.variantOf = value;
        break;
      case "channels":
        if (current.kind === "tile")
          throw new Error(`${path}:${lineNumber}: tiles use palette rows directly`);
        current.recolorChannels = parseCsv(value);
        break;
      case "palette":
        if (current.kind === "tile")
          throw new Error(`${path}:${lineNumber}: tiles use palette:base`);
        if (!paletteIdPattern.test(value))
          throw new Error(`${path}:${lineNumber}: invalid palette ${value}`);
        current.defaultPalette = value;
        break;
      case "state":
        if (current.kind !== "prop") throw new Error(`${path}:${lineNumber}: state is prop-only`);
        current.state = value;
        break;
      case "facing":
        if (current.kind !== "sprite")
          throw new Error(`${path}:${lineNumber}: facing is sprite-only`);
        current.facing = parseFacing(value, path, lineNumber);
        break;
      case "animations":
        if (current.kind !== "sprite")
          throw new Error(`${path}:${lineNumber}: animations is sprite-only`);
        current.animations = parseAnimations(value, path, lineNumber);
        break;
      case "traits":
        current.traits = parseCsv(value);
        break;
      default:
        throw new Error(`${path}:${lineNumber}: unknown pixel-sheet field ${key}`);
    }
  }

  if (current) throw new Error(`${path}: unclosed asset ${current.id}`);
  return { tiles, props, sprites };
}
