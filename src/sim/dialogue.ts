/**
 * Dialogue slot resolution + event emission. Dialogue NEVER mutates state:
 * finishing a node (or taking a choice) pushes a dlg event that the quest
 * engine reduces. Slot precedence: top-down, first match; `default` last;
 * slots with an `id` only resolve when invoked directly by name.
 */
import type { World } from "koota";
import { getDialogueBank } from "../lib/content/registry";
import type { DialogueNode, DialogueSlot } from "../lib/content/types";
import { pushEvent } from "./events";
import { FlagState, QuestLog } from "./traits";

function slotMatches(world: World, slot: DialogueSlot): boolean {
  if (slot.default) return true;
  const when = slot.when;
  if (!when) return false;
  if (when.quest) {
    const active = world.get(QuestLog)?.active[when.quest];
    if (!active) return false;
    if (when.stage && active.stage !== when.stage) return false;
    if (when.stageIn && !when.stageIn.includes(active.stage)) return false;
  }
  const flags = world.get(FlagState)?.values ?? {};
  if (when.flag && !flags[when.flag]) return false;
  if (when.notFlag && flags[when.notFlag]) return false;
  return true;
}

export interface ResolvedDialogue {
  bankId: string;
  nodeKey: string;
  node: DialogueNode;
}

/** State-driven resolution (talking to an NPC). */
export function resolveDialogue(world: World, bankId: string): ResolvedDialogue {
  const bank = getDialogueBank(bankId);
  for (const slot of bank.slots) {
    if (slot.id) continue; // addressable-only
    if (slotMatches(world, slot)) {
      return { bankId, nodeKey: slot.node, node: bank.nodes[slot.node] };
    }
  }
  throw new Error(`${bankId}: no slot matched (add a default slot)`);
}

/** Direct invocation by slot name (map onEnter, quest startDialogue). */
export function resolveDialogueSlot(bankId: string, slotId: string): ResolvedDialogue {
  const bank = getDialogueBank(bankId);
  const slot = bank.slots.find((s) => s.id === slotId);
  if (!slot) throw new Error(`${bankId}: no slot named ${slotId}`);
  return { bankId, nodeKey: slot.node, node: bank.nodes[slot.node] };
}

/** The node finished without a choice — emit "<event>:seen". */
export function emitDialogueSeen(world: World, node: DialogueNode): void {
  pushEvent(world, { type: "dlg", event: `${node.emits}:seen` });
}

/** A choice was taken — emit "<event>:<choiceId>". */
export function emitDialogueChoice(world: World, node: DialogueNode, choiceId: string): void {
  pushEvent(world, { type: "dlg", event: `${node.emits}:${choiceId}` });
}
