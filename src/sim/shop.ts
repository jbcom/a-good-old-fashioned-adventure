import type { Entity, World } from "koota";
import { getShop } from "../lib/content/registry";
import type { ShopDef, ShopListingDef } from "../lib/content/types";
import { pushEvent } from "./events";
import { adjustCoins, currentProgress } from "./incrementalProgress";
import { Inventory, IsPlayer, Outbox } from "./traits";

/** Result of a buy/sell transaction including status, item info, and ledger impact. */
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

/** Purchase one item from a listing, spending incremental coins. */
export function buyShopListing(
  world: World,
  shopId: string,
  listingId: string,
): ShopTransactionResult {
  const shop = getShop(shopId);
  const listing = listingOf(shop, listingId);
  const player = playerOf(world);
  const owned = countOf(player, listing.item);

  // the shop spends the single incremental wallet: a mid-run purchase
  // draws on real savings (docs/INCREMENTAL-RESCUE-LOOP.md §currencies)
  const nextGold = adjustCoins(world, -listing.buyPrice);
  if (nextGold === null) {
    emitSfx(world, shop.denySfx ?? "interact");
    return result(
      false,
      "buy",
      shop,
      listing,
      currentProgress(world).coins,
      owned,
      `Need ${listing.buyPrice} coins for ${listing.label}.`,
    );
  }

  const nextCount = owned + 1;
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

/** Sell one item to a listing, gaining coins. */
export function sellShopListing(
  world: World,
  shopId: string,
  listingId: string,
): ShopTransactionResult {
  const shop = getShop(shopId);
  const listing = listingOf(shop, listingId);
  const player = playerOf(world);
  const owned = countOf(player, listing.item);

  if (owned <= 0) {
    emitSfx(world, shop.denySfx ?? "interact");
    return result(
      false,
      "sell",
      shop,
      listing,
      currentProgress(world).coins,
      0,
      `No ${listing.label} in the pack.`,
    );
  }

  // a sale is conversion, not income: it skips the earned-this-run ledger
  const nextGold = adjustCoins(world, listing.sellPrice) ?? currentProgress(world).coins;
  const nextCount = owned - 1;
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
