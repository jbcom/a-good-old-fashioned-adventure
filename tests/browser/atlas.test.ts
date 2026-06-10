import { describe, expect, it } from "vitest";
import basePalette from "../../src/content/palettes/base.json";
import swaps from "../../src/content/palettes/swaps.json";
import heroSprite from "../../src/content/sprites/hero.json";
import { propCanvas, spriteCanvas, tileCanvas } from "../../src/render/atlas";

/** Real-browser pixel readback: palette swaps must recolor EXACTLY the
 * swapped channels and leave every other pixel byte-identical. */

function pixelsOf(canvas: HTMLCanvasElement): Uint8ClampedArray {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

describe("palette swap correctness (pixel compare)", () => {
  it("ranger swap recolors only S/s/R/r channels of the hero grid", () => {
    const knight = pixelsOf(spriteCanvas("sprite:hero", "palette:knight"));
    const ranger = pixelsOf(spriteCanvas("sprite:hero", "palette:ranger"));
    const rows = heroSprite.rows;
    const swap = swaps.swaps["palette:ranger"] as Record<string, string>;
    const swappedChannels = new Set(Object.keys(swap));

    let recolored = 0;
    let preserved = 0;
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        const ch = rows[y][x];
        if (ch === ".") continue;
        const i = (y * 16 + x) * 4;
        const a = [knight[i], knight[i + 1], knight[i + 2]];
        const b = [ranger[i], ranger[i + 1], ranger[i + 2]];
        if (swappedChannels.has(ch)) {
          expect(b, `swapped channel ${ch} at ${x},${y}`).toEqual(hexToRgb(swap[ch]));
          recolored++;
        } else {
          expect(b, `unswapped channel ${ch} at ${x},${y}`).toEqual(a);
          preserved++;
        }
      }
    }
    expect(recolored).toBeGreaterThan(20);
    expect(preserved).toBeGreaterThan(30);
  });

  it("skeleton swap turns armor bone-white", () => {
    const skeleton = pixelsOf(spriteCanvas("sprite:hero", "palette:skeleton"));
    const rows = heroSprite.rows;
    const bone = hexToRgb("#eef0f2");
    const y = rows.findIndex((r) => r.includes("S"));
    const x = rows[y].indexOf("S");
    const i = (y * 16 + x) * 4;
    expect([skeleton[i], skeleton[i + 1], skeleton[i + 2]]).toEqual(bone);
  });

  it("bakes once: repeated lookups return the same canvas instance", () => {
    expect(spriteCanvas("sprite:hero", "palette:wizard")).toBe(
      spriteCanvas("sprite:hero", "palette:wizard"),
    );
  });
});

describe("props and tiles bake from content", () => {
  it("chest closed state uses regal gold from the base palette", () => {
    const closed = pixelsOf(propCanvas("prop:chest", "closed"));
    const gold = hexToRgb(basePalette.colors.G.hex);
    // row 2 of the chest grid has G at x=5
    const i = (2 * 16 + 5) * 4;
    expect([closed[i], closed[i + 1], closed[i + 2]]).toEqual(gold);
  });

  it("chest open state renders draw-ops", () => {
    const open = propCanvas("prop:chest", "open");
    expect(open.width).toBe(16);
    const data = pixelsOf(open);
    expect(data.some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  });

  it("water tile fills deep sea blue", () => {
    const water = pixelsOf(tileCanvas("tile:water"));
    const deepSea = hexToRgb(basePalette.colors.l.hex);
    expect([water[0], water[1], water[2]]).toEqual(deepSea);
  });
});
