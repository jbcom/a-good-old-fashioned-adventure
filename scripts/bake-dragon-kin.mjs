/**
 * Offline dragon-kin PNG bake (docs/RAIL-COMMAND.md §dragon's kin).
 *
 * The dragon's kin are a FINITE set — one per spine map — so rather than
 * recolor the green High Dragon at runtime, we bake a full recolored PNG set
 * per kin here, once. Each baked set is a real file on disk that can be
 * quality-controlled by reading it directly (the whole point: deterministic,
 * inspectable art, not a runtime hue-rotate). The dragon's positionable
 * sprites — idle/walk/melee/firebreath/launch/hover/fly/death — all recolor
 * together so the death animation and firebreath match the body.
 *
 * Source: public/assets/bosses/dragon/*.png (green High Dragon, Electric Lemon).
 * Output: public/assets/bosses/dragon-kin/<relation-slug>/*.png
 *
 * The per-kin hue ROTATION (degrees) is read from the dragon-kin upgrade nodes
 * so config is the single source of truth. The source green sits at ~135°; the
 * rotation moves the whole ramp to the kin's target hue.
 *
 * Run: node scripts/bake-dragon-kin.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC_DIR = "public/assets/bosses/dragon";
const OUT_ROOT = "public/assets/bosses/dragon-kin";
const UPGRADE_DIR = "src/config/upgrades";
// the High Dragon's green body sits near this hue; rotation = target - source
const SOURCE_GREEN_HUE = 135;

function kinTargets() {
  const kin = [];
  for (const file of fs.readdirSync(UPGRADE_DIR).sort()) {
    const node = JSON.parse(fs.readFileSync(path.join(UPGRADE_DIR, file), "utf8"));
    if (node.dragonKin) {
      kin.push({
        relation: node.dragonKin.relation,
        slug: node.dragonKin.relation.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
        targetHue: node.dragonKin.hue,
      });
    }
  }
  return kin;
}

async function bakeOne(srcPng, outPng, rotation) {
  // modulate hue rotates every pixel's hue by `rotation` degrees, preserving
  // saturation/lightness — greys (outline, teeth) barely move, the green body
  // swings to the kin hue. Lanczos-free: nearest keeps the pixel-art edges.
  await sharp(srcPng).modulate({ hue: rotation }).png().toFile(outPng);
}

const MANIFEST = "public/assets/MANIFEST.json";

/** Mirror the source High Dragon's per-file geometry onto a kin path. */
function kinManifestFiles(slug, sourceFiles) {
  return sourceFiles.map((f) => ({
    ...f,
    path: f.path.replace("bosses/dragon/", `bosses/dragon-kin/${slug}/`),
  }));
}

function updateManifest(kin, sourceFiles) {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const files = [];
  for (const k of kin) files.push(...kinManifestFiles(k.slug, sourceFiles));
  const pack = {
    id: "dragon-kin",
    title: "Dragon-kin (baked recolors of High Dragon)",
    author: "Electric Lemon Games (recolored offline by scripts/bake-dragon-kin.mjs)",
    source: "Derived from the high-dragon pack — one recolored set per spine map's kin.",
    license:
      "Inherits the High Dragon license (bosses/dragon-kin/<slug>/LICENSE.txt copied from source).",
    mappedUse:
      "Per-map dragon-kin bosses (docs/RAIL-COMMAND.md §dragon's kin): the green High Dragon hue-rotated to each kin's color, baked to disk so each set is QC-able by reading its PNGs. Referenced by sprite:high-dragon-<slug>.",
    frameSize: 96,
    directionOrder: ["right", "up", "left", "down"],
    notes:
      "Generated — do not hand-edit. Re-run scripts/bake-dragon-kin.mjs after changing any dragonKin hue.",
    files,
  };
  const others = manifest.packs.filter((p) => p.id !== "dragon-kin");
  // keep dragon-kin right after high-dragon for readability
  const idx = others.findIndex((p) => p.id === "high-dragon");
  others.splice(idx + 1, 0, pack);
  manifest.packs = others;
  fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`manifest: dragon-kin pack with ${files.length} files`);
}

async function main() {
  const pngs = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith(".png"));
  if (pngs.length === 0) throw new Error(`no source PNGs in ${SRC_DIR}`);
  const kin = kinTargets();
  for (const k of kin) k.rotation = (((k.targetHue - SOURCE_GREEN_HUE) % 360) + 360) % 360;
  fs.mkdirSync(OUT_ROOT, { recursive: true });

  for (const k of kin) {
    const outDir = path.join(OUT_ROOT, k.slug);
    fs.mkdirSync(outDir, { recursive: true });
    for (const png of pngs) {
      await bakeOne(path.join(SRC_DIR, png), path.join(outDir, png), k.rotation);
    }
    // carry the source license into every baked set
    const license = path.join(SRC_DIR, "LICENSE.txt");
    if (fs.existsSync(license)) fs.copyFileSync(license, path.join(outDir, "LICENSE.txt"));
    console.log(`baked ${k.relation} (rotate ${k.rotation}°): ${pngs.length} PNGs → ${outDir}`);
  }

  // mirror the source dragon's per-file geometry into the manifest for each kin
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const sourceFiles = manifest.packs.find((p) => p.id === "high-dragon")?.files ?? [];
  updateManifest(kin, sourceFiles);

  console.log(`\ndone — ${kin.length} kin sets baked from ${pngs.length} source PNGs`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
