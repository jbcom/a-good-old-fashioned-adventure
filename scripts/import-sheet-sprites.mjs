#!/usr/bin/env node
/**
 * Build tagged .aseprite masters for every purchased sheet sprite def
 * (src/content/sprites/*.json) so animations can be scrubbed, audited
 * (aseprite MCP audit_animation), and previewed — the author-side half of
 * the PNG sheet pipeline (docs/CONTENT-ARCHITECTURE.md §Purchased PNG
 * sheet sprites). Masters land in raw-assets/aseprite/ (gitignored:
 * regenerable from the def + the curated PNGs).
 *
 * Directional strips emit one tag per animation per direction
 * (idle-right, idle-up, …); row sheets emit one tag per animation.
 *
 * Usage: node scripts/import-sheet-sprites.mjs [sprite-id ...]
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
// ASEPRITE_BIN wins; otherwise a per-platform default (macOS app bundle, or the
// `aseprite` on PATH for Linux/Windows) so this isn't macOS-only
const defaultAsepriteBin =
  process.platform === "darwin" ? "/Applications/Aseprite.app/Contents/MacOS/Aseprite" : "aseprite";
const asepriteBin = process.env.ASEPRITE_BIN ?? defaultAsepriteBin;
const importerLua = resolve(repoRoot, "scripts/aseprite/import-sheet-sprite.lua");
const assetsDir = resolve(repoRoot, "public/assets");
const outDir = resolve(repoRoot, "raw-assets/aseprite");

const only = process.argv.slice(2);
const defsDir = resolve(repoRoot, "src/content/sprites");
mkdirSync(outDir, { recursive: true });

for (const file of readdirSync(defsDir)) {
  if (!file.endsWith(".json")) continue;
  const def = JSON.parse(readFileSync(resolve(defsDir, file), "utf8"));
  if (def.kind !== "sheet-sprite") continue;
  const slug = def.id.replace(/^sprite:/, "");
  if (only.length > 0 && !only.includes(slug)) continue;

  const entries = [];
  for (const [name, anim] of Object.entries(def.animations)) {
    const frameDurationMs = Math.round(1000 / anim.fps);
    if (anim.directionRows) {
      for (const [dir, cell] of Object.entries(anim.directionRows)) {
        const row = typeof cell === "number" ? cell : cell.row;
        const startX = (typeof cell === "number" ? 0 : cell.col) * def.frameSize.w;
        entries.push(
          `${name}-${dir}:${anim.image}:${row}:${anim.framesPerDirection}:${frameDurationMs}:${startX}`,
        );
      }
    } else if (anim.directional) {
      def.directionOrder.forEach((dir, block) => {
        entries.push(
          `${name}-${dir}:${anim.image}:${anim.row ?? 0}:${anim.framesPerDirection}:${frameDurationMs}:${
            block * anim.framesPerDirection * def.frameSize.w
          }`,
        );
      });
    } else {
      entries.push(
        `${name}:${anim.image}:${anim.row ?? 0}:${anim.framesPerDirection}:${frameDurationMs}:0`,
      );
    }
  }

  const plan = `${def.frameSize.w}x${def.frameSize.h};${entries.join("|")}`;
  const out = resolve(outDir, `${slug}.aseprite`);
  try {
    execFileSync(
      asepriteBin,
      [
        "-b",
        "--script-param",
        `plan=${plan}`,
        "--script-param",
        `assets=${assetsDir}`,
        "--script-param",
        `out=${out}`,
        "--script",
        importerLua,
      ],
      { stdio: "inherit" },
    );
  } catch (err) {
    // a missing/failing Aseprite binary throws a raw ENOENT/exit — surface a
    // usable message (set ASEPRITE_BIN) instead of an opaque stack trace
    throw new Error(
      `Aseprite import failed for "${slug}" via "${asepriteBin}". Set ASEPRITE_BIN to your Aseprite executable. Original: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
