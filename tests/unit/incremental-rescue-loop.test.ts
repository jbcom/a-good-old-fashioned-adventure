import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { classes, incremental } from "../../src/lib/config";
import { maps } from "../../src/lib/content/registry";

const loopDoc = readFileSync(resolve(process.cwd(), "docs/INCREMENTAL-RESCUE-LOOP.md"), "utf8");
const designDoc = readFileSync(resolve(process.cwd(), "docs/DESIGN.md"), "utf8");
const worldDoc = readFileSync(resolve(process.cwd(), "docs/WORLD.md"), "utf8");
const agentsDoc = readFileSync(resolve(process.cwd(), "AGENTS.md"), "utf8");
const claudeDoc = readFileSync(resolve(process.cwd(), "CLAUDE.md"), "utf8");
const contentArchitectureDoc = readFileSync(
  resolve(process.cwd(), "docs/CONTENT-ARCHITECTURE.md"),
  "utf8",
);
const persistenceDoc = readFileSync(resolve(process.cwd(), "docs/PERSISTENCE.md"), "utf8");
const playerGovernorDoc = readFileSync(resolve(process.cwd(), "docs/PLAYER-GOVERNOR.md"), "utf8");

function upgradeIds() {
  return new Set(incremental.upgradeWeb.nodes.map((node) => node.id));
}

describe("incremental rescue loop contract", () => {
  it("documents the bottom-to-top princess rescue as the product loop", () => {
    expect(loopDoc).toContain("player starts at the bottom");
    expect(loopDoc).toContain("princess waits at the top");
    expect(loopDoc).toContain("dragon guards the princess");
    expect(loopDoc).toContain("no required castle interior navigation");
    expect(loopDoc).toContain("coins");
    expect(loopDoc).toContain("roses");
    expect(loopDoc).toContain("spiderweb map");
    expect(loopDoc).toContain("80% gameplay-area rule");
    expect(loopDoc).toContain("reachable by A/B and directional");
  });

  it("repositions current world content as route packs instead of a mandatory linear campaign", () => {
    expect(designDoc).toContain("incremental rescue loop");
    expect(designDoc).toContain("coins, roses");
    expect(designDoc).toContain("A opens the upgrade web");
    expect(designDoc).toContain("A buys the selected connected node");
    expect(designDoc).toContain("returns to results");
    expect(worldDoc).toContain("Incremental Positioning");
    expect(worldDoc).toContain("unlockable route packs");
    expect(worldDoc).toContain("Castle interiors become rose-gated side loops");
  });

  it("keeps agent handoff docs pointed at the incremental pivot", () => {
    expect(agentsDoc).toContain("mobile incremental storybook rescue game");
    expect(agentsDoc).toContain("south-to-north princess rescue route");
    expect(agentsDoc).toContain("connected spiderweb");
    expect(agentsDoc).toContain("Work order remains docs > tests > code");
    expect(claudeDoc).toContain("Use `AGENTS.md` as the authoritative repository instruction file");
    expect(claudeDoc).toContain("docs/INCREMENTAL-RESCUE-LOOP.md");
    expect(claudeDoc).not.toContain("pre-scaffold");
  });

  it("documents persistence and validation obligations for second-run progression", () => {
    expect(contentArchitectureDoc).toContain("incremental");
    expect(contentArchitectureDoc).toContain("route-pack material");
    expect(persistenceDoc).toContain("coins");
    expect(persistenceDoc).toContain("roses");
    expect(persistenceDoc).toContain("purchased upgrade node ids");
    expect(persistenceDoc).toContain("Continue restores the same incremental fields");
    expect(playerGovernorDoc).toContain("results panel with coins and roses");
    expect(playerGovernorDoc).toContain("buy a connected node with A");
    expect(playerGovernorDoc).toContain("second-run proof");
  });

  it("defines the rescue run anchors and mobile gameplay-area target in config", () => {
    expect(incremental.loop.startClass).toBe("knight");
    expect(incremental.loop.routeShape).toBe("south-to-north");
    expect(incremental.loop.playerAnchor).toBe("south");
    expect(incremental.loop.princessAnchor).toBe("north");
    expect(incremental.loop.guardian).toBe("dragon");
    expect(incremental.loop.coreRunRequiresCastleInterior).toBe(false);
    expect(incremental.loop.resultsMode).toBe("upgrade-web");
    expect(incremental.loop.targetGameplayAreaPercentPhone).toBeGreaterThanOrEqual(80);
    expect(classes.classes.knight.attack.reach).toBeGreaterThanOrEqual(40);
    expect(classes.classes.knight.ability.moveSpeedMultiplier).toBeGreaterThanOrEqual(0.6);
  });

  it("keeps coins common and roses rare with distinct reward sources", () => {
    const { coins, roses } = incremental.currencies;
    expect(coins.relativeVolume).toBe("common");
    expect(roses.relativeVolume).toBe("rare");
    expect(roses.rarityRatioAgainstCoins).toBeLessThan(0.25);
    expect(coins.primarySources).toContain("enemy-defeated");
    expect(roses.primarySources).toContain("princess-rescued");
    expect(incremental.runRewards.enemyDefeated.currency).toBe("coins");
    expect(incremental.runRewards.princessRescued.currency).toBe("roses");
  });

  it("defines a connected spiderweb upgrade graph with coin and rose spending", () => {
    const ids = upgradeIds();
    expect(ids).toContain(incremental.upgradeWeb.root);

    let roseNodes = 0;
    let coinNodes = 0;
    for (const node of incremental.upgradeWeb.nodes) {
      expect(node.id).toMatch(/^upgrade:/);
      for (const prerequisite of node.prerequisites) expect(ids).toContain(prerequisite);
      for (const unlocked of node.unlocks) expect(ids).toContain(unlocked);
      if (node.id !== incremental.upgradeWeb.root) {
        expect(node.prerequisites.length, node.id).toBeGreaterThan(0);
        expect(Object.keys(node.cost).length, node.id).toBeGreaterThan(0);
      }
      if ((node.cost.roses ?? 0) > 0) roseNodes += 1;
      if ((node.cost.coins ?? 0) > 0) coinNodes += 1;
    }

    expect(coinNodes).toBeGreaterThan(roseNodes);
    expect(roseNodes).toBeGreaterThanOrEqual(5);
  });

  it("locks new classes behind upgrade nodes without putting them on the opening roster", () => {
    expect(incremental.classes.starting).toBe("knight");
    expect(incremental.classes.unlockable).toEqual(
      expect.arrayContaining(["ranger", "rogue", "bard", "sorcerer"]),
    );

    for (const classId of incremental.classes.unlockable) {
      expect(classes.classes, classId).toHaveProperty(classId);
      expect(classes.roster, `${classId} should require upgrade unlock`).not.toContain(classId);
      const unlockNode = incremental.upgradeWeb.nodes.find((node) => node.classId === classId);
      expect(unlockNode?.category, `${classId} needs class node`).toBe("class");
    }
  });

  it("maps route packs to existing bespoke content slices", () => {
    const packs = new Set(incremental.routePacks.map((pack) => pack.id));
    expect(packs).toEqual(
      new Set(["oldwood", "deep-forest", "sunken-road", "castle-approach", "castle-interior"]),
    );

    for (const pack of incremental.routePacks) {
      expect(pack.role.length, pack.id).toBeGreaterThan(24);
      for (const mapId of pack.maps) expect(maps.has(mapId), `${pack.id} ${mapId}`).toBe(true);
      const unlockNode = incremental.upgradeWeb.nodes.find((node) => node.routePack === pack.id);
      expect(unlockNode, `${pack.id} needs upgrade node`).toBeTruthy();
    }
  });
});
