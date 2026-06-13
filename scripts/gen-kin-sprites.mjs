/**
 * Generate per-kin sheet-sprite defs that point at the baked dragon-kin PNG
 * sets (scripts/bake-dragon-kin.mjs). Each kin gets sprite:high-dragon-<slug>
 * identical to sprite:high-dragon but reading from
 * bosses/dragon-kin/<slug>/*.png — so the recolored dragon is real, baked art
 * (QC by reading the PNG), not a runtime hue-rotate.
 *
 * Run: node scripts/gen-kin-sprites.mjs
 */
import fs from "node:fs";
import path from "node:path";

const BASE = "src/content/sprites/high-dragon.json";
const OUT_DIR = "src/content/sprites";
const UPGRADE_DIR = "src/config/upgrades";

const base = JSON.parse(fs.readFileSync(BASE, "utf8"));

function kinSlugs() {
  const slugs = [];
  for (const file of fs.readdirSync(UPGRADE_DIR).sort()) {
    const node = JSON.parse(fs.readFileSync(path.join(UPGRADE_DIR, file), "utf8"));
    if (node.dragonKin) {
      slugs.push({
        relation: node.dragonKin.relation,
        slug: node.dragonKin.relation.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
      });
    }
  }
  return slugs;
}

for (const { relation, slug } of kinSlugs()) {
  const def = JSON.parse(JSON.stringify(base));
  def.id = `sprite:high-dragon-${slug}`;
  def.description = `Dragon-kin (${relation}) — the High Dragon recolored offline to its kin hue (scripts/bake-dragon-kin.mjs). Reads the baked PNG set under bosses/dragon-kin/${slug}/. docs/RAIL-COMMAND.md §dragon's kin.`;
  for (const anim of Object.values(def.animations)) {
    anim.image = anim.image.replace("bosses/dragon/", `bosses/dragon-kin/${slug}/`);
  }
  const outPath = path.join(OUT_DIR, `high-dragon-${slug}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(def, null, 2)}\n`);
  console.log(`wrote ${outPath}`);
}
