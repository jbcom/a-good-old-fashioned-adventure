import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  characters,
  dialogueBanks,
  getDialogueBank,
  getItem,
  getMap,
  getProp,
  getShop,
} from "../../src/lib/content/registry";
import type { MapDef, PropDef, PropState } from "../../src/lib/content/types";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { buyShopListing, sellShopListing } from "../../src/sim/shop";
import { step } from "../../src/sim/tick";
import { Inventory, IsNpc, NpcPatrol, PlayerGold, Transform } from "../../src/sim/traits";

const storefrontProps = [
  "prop:shop-awning",
  "prop:road-goods-cart",
  "prop:chalk-price-board",
] as const;

function doc(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function stateRows(prop: PropDef): string[] {
  const state = (prop.states.default ?? Object.values(prop.states)[0]) as PropState;
  return state.rows ?? [];
}

function channels(rows: string[]): Set<string> {
  return new Set(rows.join("").replaceAll(".", "").split(""));
}

function propRefs(map: MapDef): Set<string> {
  return new Set(
    map.entities
      .map((entity) => entity.ref)
      .filter((ref): ref is string => !!ref && ref.startsWith("prop:")),
  );
}

function bootVillageWorld() {
  const world = createGameWorld(118);
  instantiateMap(world, "map:village", { classId: "knight" });
  return world;
}

function findNpc(world: ReturnType<typeof createGameWorld>, charId: string) {
  return [...world.query(IsNpc)].find((entity) => entity.get(IsNpc)?.charId === charId);
}

function seconds(world: ReturnType<typeof createGameWorld>, amount: number) {
  for (let i = 0; i < Math.round(amount * 60); i++) step(world);
}

describe("S8.18 Hearthwake shop-and-street depth", () => {
  it("documents the exterior storefront pass before content implementation", () => {
    const worldDoc = doc("docs/WORLD.md");
    expect(worldDoc).toContain("Twenty-Second Content-Depth Slice");
    expect(worldDoc).toContain("shop:road-cart-counter");
    expect(worldDoc).toContain("item:wayfarer-ribbon");
    expect(worldDoc).toContain("A-buy/B-sell storefront verbs");
  });

  it("registers rich storefront props, a moving trader, and a content shop counter", () => {
    const village = getMap("map:village");
    expect([...propRefs(village)]).toEqual(expect.arrayContaining([...storefrontProps]));

    for (const propId of storefrontProps) {
      const prop = getProp(propId);
      expect(prop.recolorChannels?.length, propId).toBeGreaterThanOrEqual(5);
      const rows = stateRows(prop);
      expect(rows.length, propId).toBeGreaterThan(0);
      for (const row of rows) expect(row, propId).toHaveLength(prop.grid.w);
      expect(channels(rows).size, propId).toBeGreaterThanOrEqual(5);
    }

    expect(characters.get("char:road-cart-trader")?.dialogue).toBe("dlgbank:road-cart-trader");
    expect(dialogueBanks.has("dlgbank:road-cart-trader")).toBe(true);
    expect(getDialogueBank("dlgbank:road-cart-trader").nodes["morning-counter"].opensShop).toBe(
      "shop:road-cart-counter",
    );

    const shop = getShop("shop:road-cart-counter");
    expect(shop).toMatchObject({
      id: "shop:road-cart-counter",
      keeper: "char:road-cart-trader",
      name: "Penny's Road Cart",
    });
    expect(shop.listings.map((listing) => listing.item)).toEqual([
      "item:wayfarer-ribbon",
      "item:mending-plaster",
    ]);
    expect(getItem("item:wayfarer-ribbon").name).toBe("Wayfarer Ribbon");
  });

  it("breaks the shop crossroad with a shopfront paving pocket and trader patrol", () => {
    const village = getMap("map:village");
    expect(
      village.generation.some(
        (op) =>
          op.op === "region" && op.tile === "tile:village-cobble" && op.note?.includes("shopfront"),
      ),
    ).toBe(true);
    expect(
      village.generation.filter(
        (op) =>
          op.op === "set" && op.tile === "tile:village-cobble" && op.note?.includes("shopfront"),
      ),
    ).toHaveLength(4);

    const trader = village.entities.find((entity) => entity.ref === "char:road-cart-trader");
    expect(trader?.patrol?.points).toEqual([
      { x: 512, y: 248 },
      { x: 544, y: 248 },
      { x: 544, y: 272 },
      { x: 512, y: 272 },
    ]);
    expect(trader?.patrol?.speed).toBe(24);
  });

  it("buys and sells the road-cart ribbon through the generic shop reducer", () => {
    const world = bootVillageWorld();
    const player = world.queryFirst(PlayerGold);
    if (!player) throw new Error("expected player with gold");

    const bought = buyShopListing(world, "shop:road-cart-counter", "wayfarer-ribbon");
    expect(bought).toMatchObject({
      ok: true,
      verb: "buy",
      itemId: "item:wayfarer-ribbon",
      gold: 10,
      inventoryCount: 1,
    });
    expect(player.get(PlayerGold)?.value).toBe(10);
    expect(player.get(Inventory)?.items["item:wayfarer-ribbon"]).toBe(1);

    const sold = sellShopListing(world, "shop:road-cart-counter", "wayfarer-ribbon");
    expect(sold).toMatchObject({
      ok: true,
      verb: "sell",
      itemId: "item:wayfarer-ribbon",
      gold: 11,
      inventoryCount: 0,
    });
    expect(player.get(PlayerGold)?.value).toBe(11);
    expect(player.get(Inventory)?.items["item:wayfarer-ribbon"]).toBeUndefined();
  });

  it("moves the road-cart trader through Yuka steering", () => {
    const world = bootVillageWorld();
    const trader = findNpc(world, "char:road-cart-trader");
    const start = trader?.get(Transform);

    expect(trader?.get(NpcPatrol)?.points).toHaveLength(4);
    seconds(world, 1);

    const after = trader?.get(Transform);
    expect((after?.x ?? 0) - (start?.x ?? 0)).toBeGreaterThan(10);
    expect(Math.abs((after?.y ?? 0) - (start?.y ?? 0))).toBeLessThan(2);
  });
});
