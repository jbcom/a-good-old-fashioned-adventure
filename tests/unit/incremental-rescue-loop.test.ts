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
  return new Set(incremental.upgradeGraph.nodes.map((node) => node.id));
}

describe("incremental rescue loop contract", () => {
  it("documents the bottom-to-top princess rescue as the product loop", () => {
    expect(loopDoc).toContain("player starts at the bottom");
    expect(loopDoc).toContain("princess waits at the top");
    expect(loopDoc).toContain("dragon guards the princess");
    expect(loopDoc).toContain("no required castle interior navigation");
    expect(loopDoc).toContain("coins");
    expect(loopDoc).toContain("roses");
    const compactLoopDoc = loopDoc.replace(/\s+/g, " ");
    expect(compactLoopDoc).toContain("directed acyclic graph");
    expect(compactLoopDoc).toContain("all** of its prerequisites");
    expect(compactLoopDoc).toContain("Death pays out");
    expect(compactLoopDoc).toContain("never has to finish");
    expect(compactLoopDoc).toContain("classes unlock with roses");
    expect(compactLoopDoc).toContain("miniboss before the dragon");
    expect(compactLoopDoc).toContain("princess is in another castle");
    expect(compactLoopDoc).toContain("No Sharp Edges");
    expect(loopDoc).toContain("80% gameplay-area rule");
    expect(loopDoc).toContain("reachable by A/B and directional");
  });

  it("repositions current world content as route packs instead of a mandatory linear campaign", () => {
    expect(designDoc).toContain("incremental rescue loop");
    expect(designDoc).toContain("coins, roses");
    expect(designDoc).toContain("A opens the upgrade graph");
    expect(designDoc).toContain("A buys the selected connected node");
    expect(designDoc).toContain("returns to results");
    expect(worldDoc).toContain("Incremental Positioning");
    expect(worldDoc).toContain("unlockable route packs");
    expect(worldDoc).toContain("Castle interiors become rose-gated side loops");
  });

  it("keeps agent handoff docs pointed at the incremental pivot", () => {
    expect(agentsDoc).toContain("mobile incremental storybook rescue game");
    expect(agentsDoc).toContain("south-to-north princess rescue route");
    expect(agentsDoc).toContain("directed acyclic");
    expect(agentsDoc).toContain("proper DAG");
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
    expect(incremental.loop.resultsMode).toBe("upgrade-graph");
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

  it("defines a connected upgrade DAG with coin and rose spending", () => {
    const ids = upgradeIds();
    expect(ids).toContain(incremental.upgradeGraph.root);

    let roseNodes = 0;
    let coinNodes = 0;
    for (const node of incremental.upgradeGraph.nodes) {
      expect(node.id).toMatch(/^upgrade:/);
      for (const prerequisite of node.prerequisites) expect(ids).toContain(prerequisite);
      for (const unlocked of node.unlocks) expect(ids).toContain(unlocked);
      if (node.id !== incremental.upgradeGraph.root) {
        expect(node.prerequisites.length, node.id).toBeGreaterThan(0);
        expect(Object.keys(node.cost).length, node.id).toBeGreaterThan(0);
      }
      if ((node.cost.roses ?? 0) > 0) roseNodes += 1;
      if ((node.cost.coins ?? 0) > 0) coinNodes += 1;
    }

    expect(roseNodes).toBeGreaterThanOrEqual(5);
    expect(coinNodes).toBeGreaterThanOrEqual(5);
  });

  it("prices by the three-currency model: majors in gems, connectors in coins, dragon track rose-OR-gem", () => {
    // docs/RAIL-COMMAND.md §Three currencies: new things (maps/classes/enemies)
    // cost GEMS; multi-rank connectors cost COINS; the dragon track is an
    // OR-cost (roses AND gems both listed — pay either).
    const nodes = incremental.upgradeGraph.nodes;
    let coinRankTotal = 0;
    let gemMajors = 0;
    for (const node of nodes) {
      if (node.id === incremental.upgradeGraph.root) continue;
      const ranks = node.ranks ?? 1;
      const isOrCost = (node.cost.roses ?? 0) > 0 && (node.cost.gems ?? 0) > 0;
      if (isOrCost) {
        // the dragon track: rose shortcut OR gem fallback — both listed
        continue;
      }
      if (ranks > 1) {
        // multi-rank connectors are pure coin tracks with growing per-rank cost
        expect(node.cost.coins ?? 0, `${node.id} ranks need coin pricing`).toBeGreaterThan(0);
        expect(node.cost.roses ?? 0, `${node.id} ranks must not cost roses`).toBe(0);
        expect(node.rankCostGrowth ?? 1, `${node.id} needs growing rank cost`).toBeGreaterThan(1);
        coinRankTotal += ranks;
      } else if (["enemy", "map", "route", "class"].includes(node.category)) {
        // new-thing majors unlock with gems, not coins
        expect(node.cost.gems ?? 0, `${node.id} majors unlock with gems`).toBeGreaterThan(0);
        expect(node.cost.coins ?? 0, `${node.id} majors must not cost coins`).toBe(0);
        gemMajors += 1;
      }
    }
    // significantly more coin-based incremental steps than gem majors
    expect(coinRankTotal).toBeGreaterThanOrEqual(Math.ceil(gemMajors * 1.5));
  });

  it("gives every class including the knight its own coin-funded ranked track", () => {
    const nodes = incremental.upgradeGraph.nodes;
    const allClasses = [incremental.classes.starting, ...incremental.classes.unlockable];
    for (const classId of allClasses) {
      const track = nodes.find(
        (node) =>
          node.classId === classId &&
          (node.ranks ?? 1) > 1 &&
          (node.cost.coins ?? 0) > 0 &&
          (node.cost.roses ?? 0) === 0,
      );
      expect(track, `${classId} needs a coin-ranked class track`).toBeTruthy();
    }
  });

  it("includes at least one adversarial enemy-count coin track", () => {
    const adversarial = incremental.upgradeGraph.nodes.find(
      (node) =>
        node.category === "enemy" &&
        (node.ranks ?? 1) > 1 &&
        (node.cost.coins ?? 0) > 0 &&
        node.enemyFamily !== undefined,
    );
    expect(adversarial, "an enemy-count rank track must exist").toBeTruthy();
    expect(adversarial?.note ?? "").toContain("more");
  });

  it("keeps the upgrade graph a proper DAG with consistent reverse edges", () => {
    const nodes = incremental.upgradeGraph.nodes;
    const byId = new Map(nodes.map((node) => [node.id, node]));

    // unlocks must be the exact reverse edges of prerequisites
    for (const node of nodes) {
      for (const unlocked of node.unlocks) {
        expect(
          byId.get(unlocked)?.prerequisites,
          `${node.id} unlocks ${unlocked} but is not its prerequisite`,
        ).toContain(node.id);
      }
      for (const prerequisite of node.prerequisites) {
        expect(
          byId.get(prerequisite)?.unlocks,
          `${node.id} requires ${prerequisite} but is missing from its unlocks`,
        ).toContain(node.id);
      }
    }

    // single source: only the root has no prerequisites
    const sources = nodes.filter((node) => node.prerequisites.length === 0);
    expect(sources.map((node) => node.id)).toEqual([incremental.upgradeGraph.root]);

    // acyclic: Kahn's algorithm visits every node
    const indegree = new Map(nodes.map((node) => [node.id, node.prerequisites.length]));
    const queue = [incremental.upgradeGraph.root];
    let visited = 0;
    while (queue.length > 0) {
      const id = queue.shift() as string;
      visited += 1;
      for (const dependent of byId.get(id)?.unlocks ?? []) {
        const remaining = (indegree.get(dependent) ?? 0) - 1;
        indegree.set(dependent, remaining);
        if (remaining === 0) queue.push(dependent);
      }
    }
    expect(visited, "upgrade graph contains a cycle or unreachable node").toBe(nodes.length);
  });

  it("locks new classes behind upgrade nodes without putting them on the opening roster", () => {
    expect(incremental.classes.starting).toBe("knight");
    expect(incremental.classes.unlockable).toEqual(
      expect.arrayContaining(["ranger", "rogue", "bard", "sorcerer"]),
    );

    for (const classId of incremental.classes.unlockable) {
      expect(classes.classes, classId).toHaveProperty(classId);
      expect(classes.roster, `${classId} should require upgrade unlock`).not.toContain(classId);
      // the class-GRANTING node (category:class), not just any node tagged with
      // the classId — order-independent now nodes glob from per-file dir
      const grantingNode = incremental.upgradeGraph.nodes.find(
        (node) => node.classId === classId && node.category === "class",
      );
      expect(grantingNode, `${classId} needs exactly one class-granting node`).toBeDefined();
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
      const unlockNode = incremental.upgradeGraph.nodes.find((node) => node.routePack === pack.id);
      expect(unlockNode, `${pack.id} needs upgrade node`).toBeTruthy();
    }
  });
});
