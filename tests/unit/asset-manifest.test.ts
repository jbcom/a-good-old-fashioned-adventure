import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Integrity gate for purchased/imported assets (docs/PIXEL-ART-AUDIT.md §SA.0):
 * public/assets/MANIFEST.json is the license-aware registry — every file it
 * lists must exist with the stated pixel geometry, and every image under the
 * covered directories must be listed. An unmanifested binary is an asset with
 * no recorded license or mapped use, which must never ship silently.
 */

const assetsRoot = join(__dirname, "../../public/assets");

interface ManifestFile {
  path: string;
  width: number;
  height: number;
  frames?: number;
  directions?: number;
  framesPerDirection?: number;
}

interface ManifestPack {
  id: string;
  title: string;
  author: string;
  source: string;
  license: string;
  mappedUse: string;
  frameSize?: number;
  files: ManifestFile[];
}

const manifest = JSON.parse(readFileSync(join(assetsRoot, "MANIFEST.json"), "utf8")) as {
  coveredDirs: string[];
  packs: ManifestPack[];
};

/** Width/height straight from the PNG IHDR chunk — no image decoder needed. */
function pngDimensions(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  expect(buf.subarray(12, 16).toString("ascii")).toBe("IHDR");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function walkImages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && /\.(png|webp|gif|jpg)$/i.test(e.name))
    .map((e) => relative(assetsRoot, join(e.parentPath, e.name)));
}

describe("asset manifest", () => {
  const allFiles = manifest.packs.flatMap((p) => p.files);

  it("declares license, source, and mapped use for every pack", () => {
    for (const pack of manifest.packs) {
      for (const field of ["id", "title", "author", "source", "license", "mappedUse"] as const) {
        expect(pack[field], `pack ${pack.id} missing ${field}`).toBeTruthy();
      }
      expect(pack.files.length, `pack ${pack.id} lists no files`).toBeGreaterThan(0);
    }
  });

  it("every manifested file exists with the stated pixel geometry", () => {
    for (const file of allFiles) {
      const dims = pngDimensions(join(assetsRoot, file.path));
      expect(dims, file.path).toEqual({ width: file.width, height: file.height });
    }
  });

  it("animation strips are consistent: width = frames × frameSize, frames = directions × framesPerDirection", () => {
    for (const pack of manifest.packs) {
      if (!pack.frameSize) continue;
      for (const file of pack.files) {
        expect(file.width, `${file.path} width`).toBe((file.frames ?? 0) * pack.frameSize);
        expect(file.height, `${file.path} height`).toBe(pack.frameSize);
        expect(file.frames, `${file.path} frames`).toBe(
          (file.directions ?? 0) * (file.framesPerDirection ?? 0),
        );
      }
    }
  });

  it("every image under the covered directories is manifested", () => {
    const manifested = new Set(allFiles.map((f) => f.path));
    const onDisk = manifest.coveredDirs.flatMap((d) => walkImages(join(assetsRoot, d)));
    expect(onDisk.length).toBeGreaterThan(0);
    const orphans = onDisk.filter((p) => !manifested.has(p));
    expect(orphans, "images on disk with no manifest entry (license/use unrecorded)").toEqual([]);
  });
});
