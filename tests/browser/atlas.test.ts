import { describe, expect, it } from "vitest";
import basePalette from "../../src/content/palettes/base.json";
import swaps from "../../src/content/palettes/swaps.json";
import { getCharacterSprite, props, sprites } from "../../src/lib/content/registry";
import { isSheetSprite, resolveSheetFrame } from "../../src/lib/content/sheetSprite";
import {
  preloadSheetImages,
  propCanvas,
  sheetFrameCanvas,
  spriteCanvas,
  tileCanvas,
  tileFieldCanvas,
} from "../../src/render/atlas";

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
    const rows = getCharacterSprite("sprite:hero").rows;
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
    const rows = getCharacterSprite("sprite:hero").rows;
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

describe("purchased sheet sprites bake real pixels", () => {
  it("every sheet sprite's poses crop non-empty frames", async () => {
    await preloadSheetImages();
    for (const def of [...sprites.values()].filter(isSheetSprite)) {
      for (const pose of Object.keys(def.poseMap)) {
        const frame = resolveSheetFrame(def, {
          pose,
          choreoPhase: "",
          facingDir: 1,
          moveX: 0,
          moveY: 0,
          t: 0,
        });
        const data = pixelsOf(sheetFrameCanvas(def, frame));
        let opaque = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] > 0) opaque++;
        // a wrong row offset or direction block crops dead sheet area —
        // demand a real silhouette, not a sliver
        expect(
          opaque / (def.frameSize.w * def.frameSize.h),
          `${def.id} pose ${pose} (${frame.anim.image} @${frame.sourceX},${frame.sourceY})`,
        ).toBeGreaterThan(0.05);
      }
    }
  });
});

describe("baseColor + sheet overlay terrain (The Ground pack)", () => {
  it("grass composites its green base UNDER the ground.png dither overlay", async () => {
    await preloadSheetImages();
    const data = pixelsOf(tileFieldCanvas("tile:grass", 0, 0));
    const [br, bg, bb] = hexToRgb("#3f5f2e");

    // every pixel is fully opaque — the base fill closes the overlay's
    // transparency so no map-background bleeds through the grass
    for (let i = 3; i < data.length; i += 4) expect(data[i]).toBe(255);

    // the field is green-dominant (the base color shows through the sparse
    // overlay): mean green channel beats red and blue, near the base tone
    let r = 0;
    let g = 0;
    let b = 0;
    const n = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    r /= n;
    g /= n;
    b /= n;
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
    expect(Math.abs(g - bg)).toBeLessThan(40);
    expect(Math.abs(r - br)).toBeLessThan(40);
    expect(Math.abs(b - bb)).toBeLessThan(40);

    // the overlay actually drew — the cell is NOT a uniform flat fill, it
    // carries the dither texture (some pixels differ from the base)
    let textured = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (
        Math.abs(data[i] - br) > 6 ||
        Math.abs(data[i + 1] - bg) > 6 ||
        Math.abs(data[i + 2] - bb) > 6
      ) {
        textured++;
      }
    }
    expect(textured).toBeGreaterThan(0);
  });

  it("a field tile samples different cells per board position", async () => {
    await preloadSheetImages();
    // wrapping over the 2×2 field block: (0,0) and (1,1) are distinct cells,
    // so the dithered scatter does not repeat as one tiled cell
    const a = pixelsOf(tileFieldCanvas("tile:grass", 0, 0));
    const c = pixelsOf(tileFieldCanvas("tile:grass", 1, 1));
    let diff = 0;
    for (let i = 0; i < a.length; i += 4) {
      if (a[i] !== c[i] || a[i + 1] !== c[i + 1] || a[i + 2] !== c[i + 2]) diff++;
    }
    expect(diff).toBeGreaterThan(0);
  });
});

describe("sheet-sliced props bake real pixels", () => {
  it("every sheet prop state crops a non-empty cell", async () => {
    await preloadSheetImages();
    for (const def of props.values()) {
      for (const [state, propState] of Object.entries(def.states)) {
        if (!propState.sheet) continue;
        const data = pixelsOf(propCanvas(def.id, state));
        let opaque = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] > 0) opaque++;
        expect(
          opaque / (propState.sheet.w * propState.sheet.h),
          `${def.id} state ${state} @${propState.sheet.x},${propState.sheet.y}`,
        ).toBeGreaterThan(0.05);
      }
    }
  });
});
