/**
 * Quest engine: a reducer over the event stream. Stages advance when a
 * typed condition matches; effects are the ONLY place story mutates world
 * state (flags, tiles, spawns, map loads, endgame) — see
 * docs/CONTENT-ARCHITECTURE.md §story.
 */
import type { World } from "koota";
import { getQuest, quests } from "../lib/content/registry";
import type { QuestCondition, QuestStage } from "../lib/content/types";
import { spawnPickup } from "./factories";
import { applyIncrementalEventReward, grantRunReward } from "./incrementalProgress";
import {
  FlagState,
  type GameEvent,
  Health,
  IsPlayer,
  MapRuntime,
  Outbox,
  QuestLog,
} from "./traits";

export function startQuest(world: World, questId: string): void {
  const quest = getQuest(questId);
  const log = world.get(QuestLog);
  if (!log) throw new Error("world has no QuestLog");
  if (log.active[questId] || log.completed.includes(questId)) return;
  log.active[questId] = { stage: quest.start, counters: {} };
}

/** Quests with autoStart fire at world boot. */
export function autoStartQuests(world: World): void {
  for (const quest of quests.values()) {
    if (quest.autoStart) startQuest(world, quest.id);
  }
}

function stageOf(questId: string, stageId: string): QuestStage {
  const stage = getQuest(questId).stages.find((s) => s.id === stageId);
  if (!stage) throw new Error(`${questId}: unknown stage ${stageId}`);
  return stage;
}

function conditionMet(
  world: World,
  condition: QuestCondition,
  event: GameEvent,
  counters: Record<string, number>,
  stage: QuestStage,
): boolean {
  if (condition.dialogueEvent) {
    return event.type === "dlg" && event.event === condition.dialogueEvent;
  }
  if (condition.counterDone) {
    const spec = stage.counters?.[condition.counterDone];
    if (!spec) return false;
    return (counters[condition.counterDone] ?? 0) >= spec.target;
  }
  if (condition.enemyDefeated) {
    return event.type === "enemy:defeated" && event.archetypeId === condition.enemyDefeated;
  }
  if (condition.itemAcquired) {
    return event.type === "item:acquired" && event.itemId === condition.itemAcquired;
  }
  if (condition.shopTransaction) {
    const { verb, shop, listing, item } = condition.shopTransaction;
    return (
      event.type === `shop:${verb}` &&
      (!shop || event.shopId === shop) &&
      (!listing || event.listingId === listing) &&
      (!item || event.itemId === item)
    );
  }
  if (condition.enterZone) {
    return (
      event.type === "zone:entered" &&
      event.mapId === condition.enterZone.map &&
      event.triggerId === condition.enterZone.trigger
    );
  }
  if (condition.flag) {
    return world.get(FlagState)?.values[condition.flag] === true;
  }
  return false;
}

export interface EffectContext {
  eventPos?: { x: number; y: number };
}

export function applyEffects(
  world: World,
  effects: Record<string, unknown>[],
  ctx: EffectContext = {},
): void {
  const outbox = world.get(Outbox);
  for (const effect of effects) {
    if (typeof effect.setFlag === "string") {
      const flags = world.get(FlagState);
      if (flags) flags.values[effect.setFlag] = true;
    }
    if (typeof effect.clearFlag === "string") {
      const flags = world.get(FlagState);
      if (flags) flags.values[effect.clearFlag] = false;
    }
    if (typeof effect.healPlayer === "number") {
      const player = world.queryFirst(IsPlayer);
      const health = player?.get(Health);
      if (player && health) {
        player.set(Health, {
          hp: Math.min(health.maxHp, health.hp + effect.healPlayer),
          maxHp: health.maxHp,
        });
      }
    }
    if (effect.setTile) {
      const { map, at, tile } = effect.setTile as {
        map: string;
        at: [number, number];
        tile: string;
      };
      const runtime = world.get(MapRuntime);
      if (runtime && runtime.mapId === map) {
        runtime.grid[at[1]][at[0]] = tile;
        world.set(MapRuntime, { ...runtime, rev: runtime.rev + 1 });
      }
    }
    if (effect.spawnItem) {
      const { item, at } = effect.spawnItem as { item: string; at: string };
      const pos = at === "defeated-enemy" ? ctx.eventPos : undefined;
      if (pos) spawnPickup(world, item, pos.x, pos.y);
    }
    if (typeof effect.startQuest === "string") {
      startQuest(world, effect.startQuest);
    }
    if (effect.startDialogue && outbox) {
      const { bank, slot } = effect.startDialogue as { bank: string; slot: string };
      outbox.dialogue = { bank, slot };
    }
    if (typeof effect.loadMap === "string" && outbox) {
      outbox.mapLoad = { mapId: effect.loadMap };
    }
    if (effect.loadMap && typeof effect.loadMap === "object" && outbox) {
      const { mapId, spawnId } = effect.loadMap as { mapId: string; spawnId?: string };
      outbox.mapLoad = { mapId, spawnId };
    }
    if (typeof effect.sfx === "string" && outbox) {
      outbox.sfx.push(effect.sfx);
    }
    if (typeof effect.grantRunReward === "string") {
      grantRunReward(world, effect.grantRunReward);
    }
    if (typeof effect.endGame === "string" && outbox) {
      outbox.endGame = effect.endGame as "victory" | "gameover";
    }
  }
}

function counterMatches(
  spec: { event: string; match?: Record<string, unknown> },
  event: GameEvent,
): boolean {
  if (spec.event !== event.type) return false;
  const archetypes = spec.match?.archetypes as string[] | undefined;
  if (archetypes && (!event.archetypeId || !archetypes.includes(event.archetypeId))) return false;
  return true;
}

/** Reduce one event into every active quest. */
export function reduceEvent(world: World, event: GameEvent): void {
  const log = world.get(QuestLog);
  applyIncrementalEventReward(world, event.type, event.archetypeId, event.bounty ?? 0);
  if (!log) return;

  // startOn: quests that begin when a map is entered
  if (event.type === "map:entered") {
    for (const quest of quests.values()) {
      if (quest.startOn?.enterMap === event.mapId) startQuest(world, quest.id);
    }
  }

  for (const [questId, active] of Object.entries(log.active)) {
    const stage = stageOf(questId, active.stage);

    for (const [name, spec] of Object.entries(stage.counters ?? {})) {
      if (counterMatches(spec, event)) {
        active.counters[name] = (active.counters[name] ?? 0) + 1;
      }
    }

    for (const edge of stage.advance ?? []) {
      if (conditionMet(world, edge.when, event, active.counters, stage)) {
        applyEffects(world, edge.effects ?? [], {
          eventPos: event.x !== undefined ? { x: event.x, y: event.y as number } : undefined,
        });
        const next = stageOf(questId, edge.to);
        active.stage = edge.to;
        if (next.terminal) {
          delete log.active[questId];
          log.completed.push(questId);
        }
        break;
      }
    }
  }
}

/** Current quest-log line for the HUD ({counter} interpolation included). */
export function questLogLines(world: World): string[] {
  const log = world.get(QuestLog);
  if (!log) return [];
  const lines: string[] = [];
  for (const [questId, active] of Object.entries(log.active)) {
    const stage = stageOf(questId, active.stage);
    if (!stage.log) continue;
    lines.push(
      stage.log.replace(/\{(\w+)\}/g, (_, name: string) => String(active.counters[name] ?? 0)),
    );
  }
  return lines;
}
