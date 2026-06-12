import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { characters, getDialogueBank, getMap, props } from "../../src/lib/content/registry";
import type { MapDef, PropDef, PropState } from "../../src/lib/content/types";

const stableProps = [
  "prop:village-stable",
  "prop:hay-bale",
  "prop:tack-rack",
  "prop:oat-bin",
  "prop:stable-stall",
];

interface PortalTrigger {
  id: string;
  kind?: string;
  toMap?: string;
  toSpawn?: string;
  zone?: { x0: number; y0: number; x1: number; y1: number };
}

function doc(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function map(id: string): MapDef {
  return getMap(id) as MapDef;
}

function portals(mapId: string): PortalTrigger[] {
  return ((map(mapId).triggers ?? []) as PortalTrigger[]).filter(
    (trigger) => trigger.kind === "portal",
  );
}

function propRefs(mapId: string): string[] {
  return map(mapId)
    .entities.map((entity) => entity.ref)
    .filter((ref): ref is string => !!ref && ref.startsWith("prop:"));
}

function inside(zone: PortalTrigger["zone"], pos: { x: number; y: number }): boolean {
  return !!zone && pos.x >= zone.x0 && pos.x <= zone.x1 && pos.y >= zone.y0 && pos.y <= zone.y1;
}

function visibleChannels(prop: PropDef): Set<string> {
  const state = (prop.states.default ?? Object.values(prop.states)[0]) as PropState;
  return new Set((state.rows ?? []).join("").replaceAll(".", "").split(""));
}

describe("S8.13 Hearthwake stable yard", () => {
  it("documents the stable-yard slice before content implementation", () => {
    const worldDoc = doc("docs/WORLD.md");
    expect(worldDoc).toContain("Seventeenth Content-Depth Slice");
    expect(worldDoc).toContain("map:village-stable");
    expect(worldDoc).toContain("saddle-bells");
    expect(worldDoc).toContain("captures desktop plus phone evidence");
  });

  it("adds detailed stable props that are not flat-color boxes", () => {
    for (const propId of stableProps) {
      const prop = props.get(propId) as PropDef | undefined;
      expect(prop, propId).toBeDefined();
      expect(prop?.recolorChannels?.length, propId).toBeGreaterThanOrEqual(5);
      expect(visibleChannels(prop as PropDef).size, propId).toBeGreaterThanOrEqual(5);
    }
  });

  it("adds a reversible stable interior with safe village return spawns", () => {
    const stablePortal = portals("map:village").find(
      (portal) => portal.toMap === "map:village-stable",
    );
    expect(stablePortal?.id).toBe("trigger:enter-stable");
    expect(stablePortal?.toSpawn).toBe("entry");
    expect(map("map:village-stable").spawns.entry).toBeTruthy();

    const returnPortal = portals("map:village-stable").find(
      (portal) => portal.toMap === "map:village",
    );
    expect(returnPortal?.toSpawn).toBe("from-stable");
    expect(map("map:village").spawns["from-stable"]).toBeTruthy();
    expect(
      inside(stablePortal?.zone, map("map:village").spawns["from-stable"]),
      "village return spawn must not re-enter stable immediately",
    ).toBe(false);
    expect(
      inside(returnPortal?.zone, map("map:village-stable").spawns.entry),
      "stable entry spawn must not exit immediately",
    ).toBe(false);
  });

  it("places the stable facade, stable detail props, and named stablehand", () => {
    expect(propRefs("map:village")).toContain("prop:village-stable");
    expect(propRefs("map:village-stable")).toEqual(
      expect.arrayContaining(stableProps.filter((propId) => propId !== "prop:village-stable")),
    );
    expect(map("map:village-stable").entities.map((entity) => entity.ref)).toContain(
      "char:oswin-hayward",
    );

    const oswin = characters.get("char:oswin-hayward");
    expect(oswin?.name).toBe("Oswin Hayward");
    expect(oswin?.dialogue).toBe("dlgbank:oswin-hayward");
    expect(
      getDialogueBank("dlgbank:oswin-hayward").nodes["morning-stable"].lines.join(" "),
    ).toContain("saddle-bells");
  });
});
