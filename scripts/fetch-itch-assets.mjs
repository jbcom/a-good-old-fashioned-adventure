#!/usr/bin/env node
/**
 * SA.0(b) download pass (pattern: voxel-realms/scripts/fetch-itch-audio.mjs):
 * pull the curated allow-list of purchased itch.io packs into
 * raw-assets/archives/, then extract into raw-assets/extracted/<slug>/.
 * Idempotent — skips archives that already exist with matching size + md5.
 *
 * Reads ITCH_API_KEY from .env (gitignored) and the owned-keys cache at
 * .itch-cache/library.json (built by scripts/itch-library.mjs). raw-assets/
 * is gitignored: everything is hoarded locally, and only curated keepers are
 * promoted to public/assets/ with a MANIFEST.json entry (the integrity gate
 * in tests/unit/asset-manifest.test.ts refuses unmanifested images).
 *
 * Usage:
 *   node scripts/fetch-itch-assets.mjs        # download + extract
 *   node scripts/fetch-itch-assets.mjs --dry  # list what would be downloaded
 */

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ARCHIVES = join(ROOT, "raw-assets", "archives");
const EXTRACTED = join(ROOT, "raw-assets", "extracted");
const LIBRARY = join(ROOT, ".itch-cache", "library.json");

const DRY = process.argv.includes("--dry");

const KEY = readFileSync(join(ROOT, ".env"), "utf8").match(/ITCH_API_KEY=(\S+)/)?.[1];
if (!KEY) {
  console.error("ITCH_API_KEY missing from .env");
  process.exit(1);
}

// Curation allow-list (docs/PIXEL-ART-AUDIT.md §SA.0 shortlist), exact titles
// from .itch-cache/library.json. Mapping to gameplay surface:
//   - Animal sprite packs → SA.3 gap 1: region trash-enemy bodies
//     (forest: boar/squirrel/owl; sunken-road: snake/cobra/raven;
//      castle approach: vulture; dungeon: bat/rat/naked-mole-rat)
//   - Music packs → S20.3: battle/dungeon/boss loops, tavern, menu,
//     victory stingers, dark ambient beds
//   - UI SFX → S20.3: interface cues replacing bespoke ToneJS recipes
//     where the purchased sample reads better
const ALLOW_LIST = new Set([
  "Bat Sprite Pack",
  "2D Pixel Art Rat Sprites",
  "2D Pixel Art Naked Mole Rat Sprites",
  "2D Pixel Art Snake Sprites",
  "2D Pixel Art Cobra Sprites",
  "2D Pixel Art Wild Boar Sprites",
  "2D Pixel Art Raven Sprites",
  "2D Pixel Art Vulture Sprites",
  "2D Pixel Art Owl Sprites",
  "2D Pixel Art Squirrel Sprites",
  "Retro Combat Music Pack - 12 Chiptune Battle Loops",
  "Retro Dungeon Game Music Pack – 12 Chiptune Loops",
  "Retro Boss Battle Music Pack – $4.99 Chiptune Loops",
  "RPG Fantasy Music Pack – 10 Tavern & Adventure Tracks",
  "Calm Menu Music Pack – Perfect for Game Menus & UI (10 Loops)",
  "Victory & Level Complete Music Pack – 24 Game Stingers",
  "Dark Ambient Game Music Pack – Mystery & Horror Loops",
  "UI Sound Effects Pack – 40 Game Interface Sounds (WAV + MP3)",
]);

const library = JSON.parse(readFileSync(LIBRARY, "utf8"));
const packs = library.filter((p) => ALLOW_LIST.has(p.title));
const missing = [...ALLOW_LIST].filter((t) => !packs.some((p) => p.title === t));
if (missing.length > 0) {
  console.error(`allow-list titles missing from library cache:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}
console.log(`Processing ${packs.length}/${library.length} allow-listed packs (dry=${DRY})`);

mkdirSync(ARCHIVES, { recursive: true });
mkdirSync(EXTRACTED, { recursive: true });

const ARCHIVE_RE = /\.(zip|rar|7z)$/i;
// Sprite packs often ship as a single loose sheet instead of an archive —
// those land directly in raw-assets/extracted/<pack-slug>/.
const LOOSE_RE = /\.(png|gif|webp|wav|mp3|ogg)$/i;
let downloaded = 0;
let skipped = 0;
let failed = 0;

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

for (const pack of packs) {
  const uploadsResp = await apiGet(
    `/api/1/key/game/${pack.gameId}/uploads?download_key_id=${pack.keyId}`,
  );
  const all = uploadsResp?.uploads ?? [];
  const archives = all.filter((u) => ARCHIVE_RE.test(u.filename ?? ""));
  // Archives carry the full pack (previews/samples ride alongside as loose
  // files) — only fall back to loose uploads when the pack ships no archive.
  const uploads =
    archives.length > 0 ? archives : all.filter((u) => LOOSE_RE.test(u.filename ?? ""));

  if (uploads.length === 0) {
    console.warn(`  [${pack.title}] no usable uploads found`);
    failed++;
    continue;
  }

  for (const upload of uploads) {
    const looseDir = join(EXTRACTED, slugify(pack.title));
    const isArchive = ARCHIVE_RE.test(upload.filename);
    if (!isArchive) mkdirSync(looseDir, { recursive: true });
    const dest = isArchive ? join(ARCHIVES, upload.filename) : join(looseDir, upload.filename);

    if (existsSync(dest) && statSync(dest).size === upload.size) {
      const md5 = createHash("md5").update(readFileSync(dest)).digest("hex");
      if (md5 === upload.md5_hash) {
        skipped++;
        continue;
      }
    }

    if (DRY) {
      console.log(`  WOULD DOWNLOAD: ${upload.filename} (${upload.size} bytes) ← ${pack.title}`);
      downloaded++;
      continue;
    }

    const dlInfo = await apiGet(
      `/api/1/key/upload/${upload.id}/download?download_key_id=${pack.keyId}`,
    );
    if (!dlInfo?.url) {
      console.error(`  [${pack.title}] no signed URL in response`);
      failed++;
      continue;
    }

    const result = spawnSync("curl", ["-sS", "-fL", "-o", dest, dlInfo.url], {
      stdio: "inherit",
    });
    if (result.status !== 0 || statSync(dest).size !== upload.size) {
      console.error(`  [${pack.title}] download failed or size mismatch for ${upload.filename}`);
      failed++;
      continue;
    }
    console.log(`  ✓ ${upload.filename} (${upload.size} bytes) ← ${pack.title}`);
    downloaded++;
  }
}

if (!DRY) {
  console.log("\nExtracting…");
  for (const f of readdirSync(ARCHIVES)) {
    if (!ARCHIVE_RE.test(f)) continue;
    const slug = slugify(f.replace(ARCHIVE_RE, ""));
    const target = join(EXTRACTED, slug);
    if (existsSync(target)) continue;
    mkdirSync(target, { recursive: true });
    try {
      if (/\.zip$/i.test(f)) {
        execFileSync("unzip", ["-q", join(ARCHIVES, f), "-d", target], { stdio: "inherit" });
      } else {
        // .rar / .7z — unar (brew install unar) handles both
        execFileSync("unar", ["-quiet", "-o", target, join(ARCHIVES, f)], { stdio: "inherit" });
      }
      console.log(`  ✓ extracted ${f} → ${slug}`);
    } catch {
      console.error(`  ✗ failed to extract ${f}`);
    }
  }
}

console.log(`\nDone. downloaded=${downloaded} skipped=${skipped} failed=${failed}`);

async function apiGet(path) {
  const result = spawnSync(
    "curl",
    ["-sS", "-fL", "-H", `Authorization: Bearer ${KEY}`, `https://itch.io${path}`],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    console.error(`  apiGet failed: ${path}`);
    return null;
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    console.error(`  apiGet: non-JSON response for ${path}`);
    return null;
  }
}
