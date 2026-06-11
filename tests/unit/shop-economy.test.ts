import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  characters,
  dialogueBanks,
  getDialogueBank,
  getItem,
  getMap,
  getShop,
} from "../../src/lib/content/registry";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { buyShopListing, sellShopListing } from "../../src/sim/shop";
import { Inventory, IsPlayer, Outbox, PlayerGold } from "../../src/sim/traits";

function docs(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function playerState(mapId = "map:village-shop") {
  const world = createGameWorld(37);
  instantiateMap(world, mapId, { classId: "knight" });
  const player = world.queryFirst(IsPlayer);
  if (!player) throw new Error("expected player");
  return { world, player };
}

describe("S8.2 shop economy contract", () => {
  it("documents the counter, inventory, and public A/B controls before code", () => {
    expect(docs("docs/WORLD.md")).toContain("Hearthwake Shop Economy");
    expect(docs("docs/WORLD.md")).toContain("A buys the selected");
    expect(docs("docs/WORLD.md")).toContain("B sells one owned copy");
    expect(docs("docs/CONTENT-ARCHITECTURE.md")).toContain("src/content/shops/");
    expect(docs("docs/DESIGN.md")).toContain("Shop counter: up/down");
  });

  it("registers Brindle's content-authored shop, goods, props, and customer", () => {
    const shop = getShop("shop:brindle-counter");
    expect(shop).toMatchObject({
      id: "shop:brindle-counter",
      keeper: "char:shopkeeper",
      name: "Brindle's Counter",
    });
    expect(shop.listings.map((listing) => listing.item)).toEqual([
      "item:travel-cake",
      "item:mending-plaster",
    ]);
    expect(getItem("item:travel-cake").name).toBe("Travel Cake");
    expect(getItem("item:mending-plaster").name).toBe("Mending Plaster");

    expect(characters.get("char:threadseller")?.dialogue).toBe("dlgbank:threadseller");
    expect(dialogueBanks.has("dlgbank:threadseller")).toBe(true);
    const shopRefs = getMap("map:village-shop").entities.map((entity) => entity.ref);
    expect(shopRefs).toEqual(
      expect.arrayContaining(["prop:shop-shelf", "prop:shop-ledger", "char:threadseller"]),
    );
  });
});

describe("S8.14 stable service loop contract", () => {
  it("documents the second service counter before content implementation", () => {
    expect(docs("docs/WORLD.md")).toContain("Eighteenth Content-Depth Slice");
    expect(docs("docs/WORLD.md")).toContain("shop:oswin-stable-counter");
    expect(docs("docs/WORLD.md")).toContain("A-buy/B-sell public control contract");
  });

  it("registers Oswin's content-authored stable counter and stable goods", () => {
    const shop = getShop("shop:oswin-stable-counter");
    expect(shop).toMatchObject({
      id: "shop:oswin-stable-counter",
      keeper: "char:oswin-hayward",
      name: "Oswin's Feed Pail",
    });
    expect(shop.listings.map((listing) => listing.item)).toEqual([
      "item:oat-bundle",
      "item:mending-plaster",
    ]);
    expect(getItem("item:oat-bundle").name).toBe("Oat Bundle");
    expect(getDialogueBank("dlgbank:oswin-hayward").nodes["morning-stable"].opensShop).toBe(
      "shop:oswin-stable-counter",
    );
  });
});

describe("shop runtime", () => {
  it("buys and sells through player gold and inventory traits", () => {
    const { world, player } = playerState();

    expect(player.get(PlayerGold)?.value).toBe(12);
    expect(player.get(Inventory)?.items).toEqual({});

    const bought = buyShopListing(world, "shop:brindle-counter", "travel-cake");
    expect(bought).toMatchObject({
      ok: true,
      verb: "buy",
      itemId: "item:travel-cake",
      gold: 6,
      inventoryCount: 1,
    });
    expect(player.get(PlayerGold)?.value).toBe(6);
    expect(player.get(Inventory)?.items["item:travel-cake"]).toBe(1);
    expect(world.get(Outbox)?.sfx).toContain("coin");

    const sold = sellShopListing(world, "shop:brindle-counter", "travel-cake");
    expect(sold).toMatchObject({
      ok: true,
      verb: "sell",
      itemId: "item:travel-cake",
      gold: 9,
      inventoryCount: 0,
    });
    expect(player.get(PlayerGold)?.value).toBe(9);
    expect(player.get(Inventory)?.items["item:travel-cake"]).toBeUndefined();
  });

  it("refuses purchases without enough gold and does not mint inventory", () => {
    const { world, player } = playerState();
    player.set(PlayerGold, { value: 0 });

    const result = buyShopListing(world, "shop:brindle-counter", "mending-plaster");

    expect(result).toMatchObject({
      ok: false,
      verb: "buy",
      itemId: "item:mending-plaster",
      gold: 0,
      inventoryCount: 0,
    });
    expect(player.get(Inventory)?.items).toEqual({});
    expect(world.get(Outbox)?.sfx).toContain("interact");
  });

  it("buys and sells Oswin's stable goods through the generic shop reducer", () => {
    const { world, player } = playerState("map:village-stable");

    const bought = buyShopListing(world, "shop:oswin-stable-counter", "oat-bundle");
    expect(bought).toMatchObject({
      ok: true,
      verb: "buy",
      itemId: "item:oat-bundle",
      gold: 8,
      inventoryCount: 1,
    });
    expect(player.get(PlayerGold)?.value).toBe(8);
    expect(player.get(Inventory)?.items["item:oat-bundle"]).toBe(1);

    const sold = sellShopListing(world, "shop:oswin-stable-counter", "oat-bundle");
    expect(sold).toMatchObject({
      ok: true,
      verb: "sell",
      itemId: "item:oat-bundle",
      gold: 10,
      inventoryCount: 0,
    });
    expect(player.get(PlayerGold)?.value).toBe(10);
    expect(player.get(Inventory)?.items["item:oat-bundle"]).toBeUndefined();
  });
});
