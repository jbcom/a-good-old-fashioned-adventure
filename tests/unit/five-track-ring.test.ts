import { describe, expect, it } from "vitest";
import { incremental } from "../../src/lib/config";

const { ringOrder, trackEntries, lockedTracks, nodes, root } = incremental.upgradeGraph;

describe("S9.11 five-track ring", () => {
  it("arranges exactly five named tracks around the root vow", () => {
    expect(ringOrder).toEqual(["vows", "characters", "encounters", "roads", "castle"]);
    for (const track of ringOrder) {
      const members = nodes.filter((node) => node.track === track);
      expect(members.length, `${track} track must not be empty`).toBeGreaterThan(0);
    }
  });

  it("tags every node with a ring track", () => {
    for (const node of nodes) {
      expect(ringOrder, `${node.id} has unknown track ${node.track}`).toContain(node.track);
    }
  });

  it("gives every track a matching entry node", () => {
    for (const track of ringOrder) {
      const entryId = trackEntries[track];
      const entry = nodes.find((node) => node.id === entryId);
      expect(entry, `${track} entry ${entryId} must exist`).toBeTruthy();
      expect(entry?.track, `${track} entry belongs to its own track`).toBe(track);
    }
    expect(trackEntries.vows).toBe(root);
  });

  it("starts three tracks owned-or-open and keeps the castle locked deep", () => {
    // vows entry is the root itself; characters/encounters/roads open straight
    // off the root vow
    for (const track of ["characters", "encounters", "roads"] as const) {
      const entry = nodes.find((node) => node.id === trackEntries[track]);
      expect(entry?.prerequisites, `${track} entry hangs off the root`).toEqual([root]);
    }

    expect(lockedTracks).toEqual(["castle"]);
    const castleEntry = nodes.find((node) => node.id === trackEntries.castle);
    expect(castleEntry?.cost.roses ?? 0, "castle gate is a rose major").toBeGreaterThan(0);
    expect(
      castleEntry?.prerequisites.every((id) => id !== root),
      "castle gate sits deeper than the root",
    ).toBe(true);
    expect(castleEntry?.routePack).toBe("castle-interior");
  });
});
