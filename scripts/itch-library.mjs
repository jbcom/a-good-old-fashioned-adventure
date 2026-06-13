#!/usr/bin/env node
/**
 * SA.0 exploratory pass (pattern: voxel-realms/scripts/fetch-itch-audio.mjs):
 * paginate the itch.io owned-keys library into .itch-cache/library.json and
 * print a classification summary, so the curation allow-list can be built
 * from real titles. Reads ITCH_API_KEY from .env (gitignored). The cache is
 * gitignored too — only the curated manifest under public/assets/ ships.
 *
 * Usage: node scripts/itch-library.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = join(ROOT, ".itch-cache");
const CACHE = join(CACHE_DIR, "library.json");

const KEY = readFileSync(join(ROOT, ".env"), "utf8").match(/ITCH_API_KEY=(\S+)/)?.[1];
if (!KEY) {
  console.error("ITCH_API_KEY missing from .env");
  process.exit(1);
}

const all = [];
for (let page = 1; page < 40; page++) {
  const res = await fetch(`https://itch.io/api/1/${KEY}/my-owned-keys?page=${page}`);
  const data = await res.json();
  const keys = Array.isArray(data.owned_keys) ? data.owned_keys : [];
  if (keys.length === 0) break;
  for (const k of keys) {
    all.push({
      keyId: k.id,
      gameId: k.game?.id,
      title: k.game?.title ?? "?",
      classification: k.game?.classification ?? "?",
      shortText: k.game?.short_text ?? "",
      url: k.game?.url ?? "",
    });
  }
}

mkdirSync(CACHE_DIR, { recursive: true });
writeFileSync(CACHE, JSON.stringify(all, null, 2));

const buckets = new Map();
for (const pack of all) {
  const text = `${pack.title} ${pack.shortText}`.toLowerCase();
  const bucket = /audio|sfx|music|sound|bgm|ost/.test(text)
    ? "audio"
    : /pixel|16x16|16-bit|32x32|sprite|tileset|tile set|top-down|topdown|rpg/.test(text)
      ? "pixel-2d"
      : /psx|3d|voxel|low.?poly|glb|model/.test(text)
        ? "3d-psx"
        : pack.classification === "tool"
          ? "tool"
          : "other";
  buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
}
console.log(`library: ${all.length} packs → ${CACHE}`);
for (const [bucket, count] of [...buckets.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${bucket}: ${count}`);
}
