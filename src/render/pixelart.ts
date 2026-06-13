/**
 * Pixel-art rasterization: turns content (palette + rows / draw-ops) into
 * canvases. The atlas layer above caches these per (asset × palette); both
 * renderer candidates consume the same canvases as textures.
 */
import basePalette from "../content/palettes/base.json";
import swapsFile from "../content/palettes/swaps.json";

/** Character key → hex color (e.g., "@r" → "#ff0000"). */
export type PaletteMap = Record<string, string>;

export function resolvePalette(paletteId: string): PaletteMap {
  const palette: PaletteMap = {};
  for (const [ch, def] of Object.entries(basePalette.colors)) palette[ch] = def.hex;
  if (paletteId === "palette:base") return palette;
  const swap = (swapsFile.swaps as Record<string, PaletteMap>)[paletteId];
  if (!swap) throw new Error(`unknown palette: ${paletteId}`);
  return { ...palette, ...swap };
}

/** Convert palette character (@r) to hex, or pass through if already hex. */
export function resolveColor(color: string, palette: PaletteMap): string {
  if (!color.startsWith("@")) return color;
  const hex = palette[color.slice(1)];
  if (!hex) throw new Error(`palette key not found: ${color}`);
  return hex;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.imageSmoothingEnabled = false;
  return [canvas, ctx];
}

/** Rasterize a sprite as rows of palette characters (. = transparent) onto a 1px-per-char canvas. */
export function rasterizeRows(rows: string[], palette: PaletteMap): HTMLCanvasElement {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const [canvas, ctx] = makeCanvas(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === ".") continue;
      const hex = palette[ch];
      if (!hex || hex === "transparent") continue;
      ctx.fillStyle = hex;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

/** Single draw operation for procedural tile/prop rendering. */
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
}

/** Execute draw-op list (fill, rect, triangle, repeat-rect) onto a square canvas. */
export function rasterizeDrawOps(ops: DrawOp[], palette: PaletteMap, size = 16): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(size, size);
  for (const op of ops) {
    ctx.fillStyle = resolveColor(op.color, palette);
    switch (op.op) {
      case "fill":
        ctx.fillRect(0, 0, size, size);
        break;
      case "rect":
        ctx.fillRect(op.x as number, op.y as number, op.w as number, op.h as number);
        break;
      case "triangle": {
        const pts = op.points as number[][];
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (const [px, py] of pts.slice(1)) ctx.lineTo(px, py);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case "repeat-rect": {
        const count = op.count as number;
        for (let i = 0; i < count; i++) {
          ctx.fillRect(
            (op.x as number) + i * (op.stepX ?? 0),
            (op.y as number) + i * (op.stepY ?? 0),
            op.w as number,
            op.h as number,
          );
        }
        break;
      }
    }
  }
  return canvas;
}
