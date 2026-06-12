import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const asepriteBin =
  process.env.ASEPRITE_BIN ?? "/Applications/Aseprite.app/Contents/MacOS/Aseprite";
const importerLua = resolve(repoRoot, "scripts/aseprite/import-pixel-sheet.lua");
const palette = JSON.parse(
  readFileSync(resolve(repoRoot, "src/content/palettes/base.json"), "utf8"),
).colors;

function parsePix(file) {
  const source = readFileSync(file, "utf8");
  const assets = [];
  let current = null;
  let readingRows = false;
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || (!readingRows && line.startsWith("#"))) continue;
    if (line === "@pixel-sheet v1") continue;

    const block = line.match(/^@(tile|sprite|prop) (.+)$/);
    if (block) {
      current = { kind: block[1], id: block[2], grid: null, rows: [] };
      assets.push(current);
      readingRows = false;
      continue;
    }
    if (line === "@end") {
      current = null;
      readingRows = false;
      continue;
    }
    if (!current) continue;
    if (readingRows) {
      current.rows.push(line);
      continue;
    }
    if (line === "rows") {
      readingRows = true;
      continue;
    }
    if (line.startsWith("grid ")) {
      const [w, h] = line.slice(5).split("x").map(Number);
      current.grid = { w, h };
    }
  }
  return assets;
}

function sizeOf(asset) {
  return {
    w: asset.grid?.w ?? asset.rows[0]?.length ?? 0,
    h: asset.grid?.h ?? asset.rows.length,
  };
}

function layoutAssets(assets) {
  if (assets.every((asset) => asset.kind === "tile")) {
    const columns = 8;
    return {
      width: columns * 16,
      height: Math.ceil(assets.length / columns) * 16,
      positions: new Map(
        assets.map((asset, index) => [
          asset.id,
          { x: (index % columns) * 16, y: Math.floor(index / columns) * 16 },
        ]),
      ),
    };
  }

  let x = 0;
  let height = 0;
  const positions = new Map();
  for (const asset of assets) {
    positions.set(asset.id, { x, y: 0 });
    const size = sizeOf(asset);
    x += size.w + 2;
    height = Math.max(height, size.h);
  }
  return { width: Math.max(1, x - 2), height, positions };
}

function pixelLines(assets, positions) {
  const pixels = [];
  for (const asset of assets) {
    const origin = positions.get(asset.id);
    for (let y = 0; y < asset.rows.length; y++) {
      for (let x = 0; x < asset.rows[y].length; x++) {
        const ch = asset.rows[y][x];
        if (ch === ".") continue;
        const color = palette[ch]?.hex;
        if (!color || color === "transparent") throw new Error(`${asset.id}: unknown color ${ch}`);
        const r = Number.parseInt(color.slice(1, 3), 16);
        const g = Number.parseInt(color.slice(3, 5), 16);
        const b = Number.parseInt(color.slice(5, 7), 16);
        pixels.push({ x: origin.x + x, y: origin.y + y, r, g, b, a: 255 });
      }
    }
  }
  return pixels;
}

function exportSheet(file) {
  const assets = parsePix(file);
  const { width, height, positions } = layoutAssets(assets);
  const outputBase = resolve(dirname(file), basename(file, ".pix"));
  const asepriteFile = `${outputBase}.aseprite`;
  const pngFile = `${outputBase}.png`;
  const payload = {
    width,
    height,
    layerName: "pixels",
    asepriteFile,
    pngFile,
    pixels: pixelLines(assets, positions),
  };

  const dir = mkdtempSync(join(tmpdir(), "agofa-pixelart-"));
  const payloadPath = join(dir, `${basename(file)}.json`);
  writeFileSync(payloadPath, JSON.stringify(payload));
  try {
    execFileSync(
      asepriteBin,
      ["--batch", "--script-param", `input=${payloadPath}`, "--script", importerLua],
      { stdio: "inherit" },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return { file, asepriteFile, pngFile, width, height, assets: assets.length };
}

const files =
  process.argv.length > 2
    ? process.argv.slice(2).map((file) => resolve(file))
    : [
        resolve(repoRoot, "src/content/pixelart/terrain.pix"),
        resolve(repoRoot, "src/content/pixelart/characters.pix"),
        resolve(repoRoot, "src/content/pixelart/route-props.pix"),
      ];

for (const result of files.map(exportSheet)) {
  console.log(
    `${result.file} -> ${result.asepriteFile}, ${result.pngFile} (${result.width}x${result.height}, ${result.assets} assets)`,
  );
}
