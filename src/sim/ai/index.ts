/**
 * The personality roster: one mind per class, one file per mind
 * (directive S18.3). chooseGoal is the single entry the unit brain calls.
 */

import { barbarian } from "./classes/barbarian";
import { bard } from "./classes/bard";
import { dreadKnight } from "./classes/dread-knight";
import { knight } from "./classes/knight";
import { priest } from "./classes/priest";
import { ranger } from "./classes/ranger";
import { rogue } from "./classes/rogue";
import { shaman } from "./classes/shaman";
import { sorcerer } from "./classes/sorcerer";
import { stormcaller } from "./classes/stormcaller";
import { warlock } from "./classes/warlock";
import { wizard } from "./classes/wizard";
import { type Evaluator, engageNearest, type FieldView, type UnitGoal } from "./field";

const CLASS_GOALS: Record<string, Evaluator> = {
  knight,
  ranger,
  wizard,
  rogue,
  bard,
  sorcerer,
  priest,
  warlock,
  barbarian,
  "dread-knight": dreadKnight,
  shaman,
  stormcaller,
};

/** Pick a unit's combat goal from its class evaluator and field view. */
export function chooseGoal(classId: string, view: FieldView): UnitGoal {
  const evaluator = CLASS_GOALS[classId] ?? engageNearest;
  return evaluator(view);
}

export type { FieldAlly, FieldEnemy, FieldView, UnitGoal } from "./field";
