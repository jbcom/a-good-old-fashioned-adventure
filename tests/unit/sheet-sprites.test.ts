import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getSprite, sprites } from "../../src/lib/content/registry";
import { isSheetSprite, resolveSheetFrame } from "../../src/lib/content/sheetSprite";
import type { SheetSpriteDef } from "../../src/lib/content/types";

/**
 * Purchased PNG sheet sprites (docs/CONTENT-ARCHITECTURE.md §Purchased PNG
 * sheet sprites): same sprite:* namespace, second raster backend. These
 * tests pin the contract — defs resolve through the registry, every
 * referenced image exists with geometry consistent with
 * public/assets/MANIFEST.json, every poseMap target is a declared
 * animation, and the pure frame resolver is deterministic.
 */

const assetsRoot = fileURLToPath(new URL("../../public/assets", import.meta.url));

const manifest = JSON.parse(readFileSync(join(assetsRoot, "MANIFEST.json"), "utf8")) as {
  packs: {
    files: { path: string; width?: number; height?: number }[];
  }[];
};
const manifestByPath = new Map(manifest.packs.flatMap((p) => p.files.map((f) => [f.path, f])));

const sheetDefs = [...sprites.values()].filter(isSheetSprite);

describe("sheet sprite defs", () => {
  it("registry serves sprite:high-dragon as a sheet sprite", () => {
    const def = getSprite("sprite:high-dragon");
    expect(isSheetSprite(def)).toBe(true);
  });

  it("at least one sheet sprite is registered", () => {
    expect(sheetDefs.length).toBeGreaterThan(0);
  });

  it("every animation image exists on disk and is manifested with fitting geometry", () => {
    for (const def of sheetDefs) {
      for (const [name, anim] of Object.entries(def.animations)) {
        const abs = join(assetsRoot, anim.image);
        expect(existsSync(abs), `${def.id} ${name}: missing ${anim.image}`).toBe(true);
        const entry = manifestByPath.get(anim.image);
        expect(entry, `${def.id} ${name}: ${anim.image} not in MANIFEST.json`).toBeDefined();
        const directions = anim.directional ? def.directionOrder.length : 1;
        // frame extents must fit inside the manifested sheet — a row sheet
        // (boar) is wider than its shortest row, a dedicated strip (dragon)
        // is exactly as wide as its frames
        expect(
          directions * anim.framesPerDirection * def.frameSize.w,
          `${def.id} ${name}: frames overflow the sheet width`,
        ).toBeLessThanOrEqual(entry?.width ?? 0);
        expect(
          ((anim.row ?? 0) + 1) * def.frameSize.h,
          `${def.id} ${name}: row ${anim.row ?? 0} overflows the sheet height`,
        ).toBeLessThanOrEqual(entry?.height ?? 0);
      }
    }
  });

  it("every poseMap target names a declared animation", () => {
    for (const def of sheetDefs) {
      for (const [pose, target] of Object.entries(def.poseMap)) {
        expect(
          def.animations[target],
          `${def.id}: poseMap ${pose} → ${target} undeclared`,
        ).toBeDefined();
      }
      expect(def.poseMap.idle, `${def.id}: poseMap must cover idle`).toBeDefined();
    }
  });
});

describe("resolveSheetFrame", () => {
  const dragon = getSprite("sprite:high-dragon") as SheetSpriteDef;
  const base = { pose: "idle", choreoPhase: "", facingDir: 1 as const, moveX: 0, moveY: 0, t: 0 };

  it("idle at t=0 faces right at frame 0", () => {
    const r = resolveSheetFrame(dragon, base);
    expect(r.animName).toBe("idle");
    expect(r.direction).toBe("right");
    expect(r.sourceX).toBe(0);
    expect(r.sourceY).toBe(0);
  });

  it("advances frames with the deterministic clock and loops", () => {
    const fps = dragon.animations.idle.fps;
    const fpd = dragon.animations.idle.framesPerDirection;
    const r1 = resolveSheetFrame(dragon, { ...base, t: 1 / fps });
    expect(r1.sourceX).toBe(dragon.frameSize.w);
    const wrapped = resolveSheetFrame(dragon, { ...base, t: fpd / fps });
    expect(wrapped.sourceX).toBe(0);
  });

  it("normalizes the .pix pose vocabulary: walk-1 → walk, walk-up-0 → walk facing up", () => {
    const side = resolveSheetFrame(dragon, { ...base, pose: "walk-1", moveX: 1 });
    expect(side.animName).toBe("walk");
    expect(side.direction).toBe("right");
    const up = resolveSheetFrame(dragon, { ...base, pose: "walk-up-0", moveY: -1 });
    expect(up.direction).toBe("up");
    const fpd = dragon.animations.walk.framesPerDirection;
    expect(up.sourceX).toBeGreaterThanOrEqual(
      dragon.directionOrder.indexOf("up") * fpd * dragon.frameSize.w,
    );
  });

  it("facing mirror: facingDir -1 selects the left block", () => {
    const r = resolveSheetFrame(dragon, { ...base, facingDir: -1 });
    const fpd = dragon.animations.idle.framesPerDirection;
    expect(r.direction).toBe("left");
    expect(r.sourceX).toBe(dragon.directionOrder.indexOf("left") * fpd * dragon.frameSize.w);
  });

  it("movement direction wins over facing: heading down shows the front block", () => {
    const r = resolveSheetFrame(dragon, { ...base, pose: "walk-0", moveY: 1, facingDir: -1 });
    expect(r.direction).toBe("down");
  });

  it("choreography phase outranks pose: volley breathes fire", () => {
    const r = resolveSheetFrame(dragon, { ...base, pose: "walk-0", choreoPhase: "volley" });
    expect(r.animName).toBe("firebreath");
  });

  it("a non-looping animation clamps at its final frame", () => {
    const death = dragon.animations.death;
    const r = resolveSheetFrame(dragon, { ...base, pose: "death", t: 100 });
    expect(r.animName).toBe("death");
    expect(r.sourceX).toBe((death.framesPerDirection - 1) * dragon.frameSize.w);
  });

  it("unknown poses fall back to idle", () => {
    const r = resolveSheetFrame(dragon, { ...base, pose: "no-such-pose" });
    expect(r.animName).toBe("idle");
  });

  it("a 4-direction sheet never mirrors", () => {
    const r = resolveSheetFrame(dragon, { ...base, facingDir: -1 });
    expect(r.mirror).toBe(false);
  });
});

describe("direction-row sheets (Electric Lemon humanoids)", () => {
  const mage = getSprite("sprite:hooded-mage") as SheetSpriteDef;
  const base = { pose: "idle", choreoPhase: "", facingDir: 1 as const, moveX: 0, moveY: 0, t: 0 };

  it("each direction reads its authored row and never mirrors", () => {
    const right = resolveSheetFrame(mage, base);
    expect(right.sourceY).toBe(8 * mage.frameSize.h);
    expect(right.mirror).toBe(false);
    const left = resolveSheetFrame(mage, { ...base, facingDir: -1 });
    expect(left.sourceY).toBe(9 * mage.frameSize.h);
    expect(left.mirror).toBe(false);
    const up = resolveSheetFrame(mage, { ...base, pose: "walk-up-0", moveY: -1 });
    expect(up.sourceY).toBe(15 * mage.frameSize.h);
    const down = resolveSheetFrame(mage, { ...base, pose: "walk-1", moveY: 1 });
    expect(down.sourceY).toBe(14 * mage.frameSize.h);
  });

  it("frames advance horizontally within the direction row", () => {
    const r = resolveSheetFrame(mage, { ...base, t: 1 / mage.animations.idle.fps });
    expect(r.sourceX).toBe(mage.frameSize.w);
    expect(r.sourceY).toBe(8 * mage.frameSize.h);
  });
});

describe("side-view sheets (mirror-x)", () => {
  const boar = getSprite("sprite:wild-boar") as SheetSpriteDef;
  const base = { pose: "idle", choreoPhase: "", facingDir: 1 as const, moveX: 0, moveY: 0, t: 0 };

  it("rows address vertically: dark variant walk reads row 7", () => {
    const dark = getSprite("sprite:wild-boar-dark") as SheetSpriteDef;
    const r = resolveSheetFrame(dark, { ...base, pose: "walk-0", moveX: -1, facingDir: -1 });
    expect(r.sourceY).toBe(7 * dark.frameSize.h);
    expect(r.sourceX).toBe(0);
  });

  it("facing the native direction does not mirror; the other way does", () => {
    expect(resolveSheetFrame(boar, { ...base, facingDir: -1 }).mirror).toBe(false);
    expect(resolveSheetFrame(boar, base).mirror).toBe(true);
  });

  it("vertical travel keeps the last horizontal facing for the mirror", () => {
    const r = resolveSheetFrame(boar, { ...base, pose: "walk-up-1", moveY: -1, facingDir: -1 });
    expect(r.direction).toBe("up");
    expect(r.mirror).toBe(false);
  });
});

describe("directionRows + directional guard", () => {
  it("directionRows owns addressing — block arithmetic never double-offsets", () => {
    const mage = getSprite("sprite:hooded-mage") as SheetSpriteDef;
    // force the risky combination on a copy of a real anim
    const def: SheetSpriteDef = {
      ...mage,
      animations: {
        ...mage.animations,
        idle: { ...mage.animations.idle, directional: true },
      },
    };
    const r = resolveSheetFrame(def, {
      pose: "idle",
      choreoPhase: "",
      facingDir: -1,
      moveX: 0,
      moveY: 0,
      t: 0,
    });
    // left would be block 2 — with directionRows present the column must stay 0
    expect(r.sourceX).toBe(0);
    expect(r.sourceY).toBe(9 * def.frameSize.h);
  });
});
