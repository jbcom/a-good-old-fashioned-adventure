import type { Entity, World } from "koota";
import { getShop } from "../lib/content/registry";
import type { ShopDef, ShopListingDef } from "../lib/content/types";
import { pushEvent } from "./events";
import { Inventory, IsPlayer, Outbox, PlayerGold } from "./traits";

export interface ShopTransactionResult {
  ok: boolean;
  verb: "buy" | "sell";
  shopId: string;
  listingId: string;
  itemId: string;
  label: string;
  message: string;
  gold: number;
  inventoryCount: number;
}

function playerOf(world: World): Entity {
  const player = world.queryFirst(IsPlayer);
  if (!player) throw new Error("shop transaction requires a player");
  return player;
}

function listingOf(shop: ShopDef, listingId: string): ShopListingDef {
  const listing = shop.listings.find((entry) => entry.id === listingId);
  if (!listing) throw new Error(`${shop.id}: unknown listing ${listingId}`);
  return listing;
}

function inventoryOf(player: Entity): Record<string, number> {
  return player.get(Inventory)?.items ?? {};
}

function countOf(player: Entity, itemId: string): number {
  return inventoryOf(player)[itemId] ?? 0;
}

function setCount(player: Entity, itemId: string, count: number): void {
  const next = { ...inventoryOf(player) };
  if (count <= 0) delete next[itemId];
  else next[itemId] = count;
  player.set(Inventory, { items: next });
}

function emitSfx(world: World, sfx: string): void {
  world.get(Outbox)?.sfx.push(sfx);
}

function result(
  ok: boolean,
  verb: "buy" | "sell",
  shop: ShopDef,
  listing: ShopListingDef,
  gold: number,
  inventoryCount: number,
  message: string,
): ShopTransactionResult {
  return {
    ok,
    verb,
    shopId: shop.id,
    listingId: listing.id,
    itemId: listing.item,
    label: listing.label,
    message,
    gold,
    inventoryCount,
  };
}

export function buyShopListing(
  world: World,
  shopId: string,
  listingId: string,
): ShopTransactionResult {
  const shop = getShop(shopId);
  const listing = listingOf(shop, listingId);
  const player = playerOf(world);
  const gold = player.get(PlayerGold);
  if (!gold) throw new Error("shop transaction requires PlayerGold");
  const owned = countOf(player, listing.item);

  if (gold.value < listing.buyPrice) {
    emitSfx(world, shop.denySfx ?? "interact");
    return result(
      false,
      "buy",
      shop,
      listing,
      gold.value,
      owned,
      `Need ${listing.buyPrice} gold for ${listing.label}.`,
    );
  }

  const nextGold = gold.value - listing.buyPrice;
  const nextCount = owned + 1;
  player.set(PlayerGold, { value: nextGold });
  setCount(player, listing.item, nextCount);
  emitSfx(world, shop.buySfx ?? "pickup");
  pushEvent(world, {
    type: "shop:buy",
    shopId: shop.id,
    listingId: listing.id,
    itemId: listing.item,
  });
  return result(true, "buy", shop, listing, nextGold, nextCount, `Bought ${listing.label}.`);
}

export function sellShopListing(
  world: World,
  shopId: string,
  listingId: string,
): ShopTransactionResult {
  const shop = getShop(shopId);
  const listing = listingOf(shop, listingId);
  const player = playerOf(world);
  const gold = player.get(PlayerGold);
  if (!gold) throw new Error("shop transaction requires PlayerGold");
  const owned = countOf(player, listing.item);

  if (owned <= 0) {
    emitSfx(world, shop.denySfx ?? "interact");
    return result(false, "sell", shop, listing, gold.value, 0, `No ${listing.label} in the pack.`);
  }

  const nextGold = gold.value + listing.sellPrice;
  const nextCount = owned - 1;
  player.set(PlayerGold, { value: nextGold });
  setCount(player, listing.item, nextCount);
  emitSfx(world, shop.sellSfx ?? "pickup");
  pushEvent(world, {
    type: "shop:sell",
    shopId: shop.id,
    listingId: listing.id,
    itemId: listing.item,
  });
  return result(true, "sell", shop, listing, nextGold, nextCount, `Sold ${listing.label}.`);
}
