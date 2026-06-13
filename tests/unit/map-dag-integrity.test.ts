import { describe, expect, it } from "vitest";
import { incremental } from "../../src/lib/config";
import { maps } from "../../src/lib/content/registry";

/**
 * Map DAG integrity (docs/RAIL-COMMAND.md §Map DAG): the spine is a strict
 * ordered list of real maps; the start map is first; every later map belongs
 * to a route pack (so it gates behind an unlock); the castle map is the
 * spine's end and its node exists in the upgrade graph.
 */
const { order, castleNode, castleMap } = incremental.mapDag;
const nodeIds = new Set(incremental.upgradeGraph.nodes.map((n) => n.id));

describe("map DAG integrity", () => {
  it("every spine map is a real registered map", () => {
    for (const mapId of order) {
      expect(maps.has(mapId), `${mapId} is not a registered map`).toBe(true);
    }
  });

  it("the spine starts at the loop start map", () => {
    expect(order[0]).toBe(incremental.loop.startMap);
  });

  it("every non-start spine map belongs to a route pack (gateable)", () => {
    for (const mapId of order.slice(1)) {
      const pack = incremental.routePacks.find((p) => p.maps.includes(mapId));
      expect(pack, `${mapId} has no route pack — cannot gate its unlock`).toBeDefined();
    }
  });

  it("the castle map ends the spine and its node exists", () => {
    expect(order[order.length - 1]).toBe(castleMap);
    expect(nodeIds.has(castleNode), `${castleNode} not in the upgrade graph`).toBe(true);
  });
});
