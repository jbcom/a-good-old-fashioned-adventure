/**
 * Event bus: gameplay systems push typed events; the quest engine reduces
 * them. Dialogue/combat/pickup code never mutates quest state directly.
 */
import type { World } from "koota";
import { EventQueue, type GameEvent } from "./traits";

/** Queue an event for quest-engine reduction. */
export function pushEvent(world: World, event: GameEvent): void {
  const queue = world.get(EventQueue);
  if (!queue) throw new Error("world has no EventQueue");
  queue.events.push(event);
}

/** Extract and clear the event queue. */
export function drainEvents(world: World): GameEvent[] {
  const queue = world.get(EventQueue);
  if (!queue) return [];
  const events = queue.events.slice();
  queue.events.length = 0;
  return events;
}
