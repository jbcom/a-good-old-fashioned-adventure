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

  it("every animation image exists on disk and is manifested with matching strip geometry", () => {
    for (const def of sheetDefs) {
      for (const [name, anim] of Object.entries(def.animations)) {
        const abs = join(assetsRoot, anim.image);
        expect(existsSync(abs), `${def.id} ${name}: missing ${anim.image}`).toBe(true);
        const entry = manifestByPath.get(anim.image);
        expect(entry, `${def.id} ${name}: ${anim.image} not in MANIFEST.json`).toBeDefined();
        const directions = anim.directional ? def.directionOrder.length : 1;
        expect(
          entry?.width,
          `${def.id} ${name}: strip width must equal directions × framesPerDirection × frame width`,
        ).toBe(directions * anim.framesPerDirection * def.frameSize.w);
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
});
