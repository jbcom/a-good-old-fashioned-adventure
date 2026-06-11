export interface PlayerDiagnostics {
  mapId?: string;
  x?: number;
  y?: number;
  hp?: number;
  enemies?: number;
}

export interface PlayerPerception {
  mode: string;
  mapName: string;
  topHudText: string;
  dialogueText: string;
  questText: string;
  visibleButtons: string[];
  diagnostics?: PlayerDiagnostics;
}

export type GovernorGoal =
  | { kind: "modeIs"; mode: string }
  | { kind: "mapNameIncludes"; text: string }
  | { kind: "hudIncludes"; text: string }
  | { kind: "dialogueIncludes"; text: string }
  | { kind: "questIncludes"; text: string }
  | { kind: "buttonVisible"; id: string };

interface GovernorActionBase {
  id: string;
  cost: number;
  when?: (perception: PlayerPerception) => boolean;
}

export type GovernorAction =
  | (GovernorActionBase & {
      kind: "hold";
      button: "up" | "down" | "left" | "right";
      durationMs?: number;
    })
  | (GovernorActionBase & {
      kind: "press" | "click";
      button: "a" | "b" | string;
    })
  | (GovernorActionBase & {
      kind: "reachPoint";
      x: number;
      y: number;
      tolerance?: number;
      maxSteps?: number;
    });

export interface GovernorPlanStep {
  id: string;
  goal: GovernorGoal;
  actions: GovernorAction[];
  maxSteps?: number;
}

export interface GovernorPlanDecision {
  step: GovernorPlanStep;
  action: GovernorAction;
}

function includesText(value: string, needle: string): boolean {
  return value.toLowerCase().includes(needle.toLowerCase());
}

export function goalSatisfied(goal: GovernorGoal, perception: PlayerPerception): boolean {
  switch (goal.kind) {
    case "modeIs":
      return perception.mode === goal.mode;
    case "mapNameIncludes":
      return includesText(perception.mapName, goal.text);
    case "hudIncludes":
      return includesText(perception.topHudText, goal.text);
    case "dialogueIncludes":
      return includesText(perception.dialogueText, goal.text);
    case "questIncludes":
      return includesText(perception.questText, goal.text);
    case "buttonVisible":
      return perception.visibleButtons.includes(goal.id);
  }
}

export function chooseGovernorAction(
  perception: PlayerPerception,
  actions: GovernorAction[],
): GovernorAction {
  const available = actions.filter((action) => action.when?.(perception) ?? true);
  const [chosen] = available.sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id));
  if (!chosen) throw new Error("player governor has no available action");
  return chosen;
}

export function chooseGovernorPlanAction(
  perception: PlayerPerception,
  plan: GovernorPlanStep[],
): GovernorPlanDecision | null {
  const step = plan.find((candidate) => !goalSatisfied(candidate.goal, perception));
  if (!step) return null;
  return { step, action: chooseGovernorAction(perception, step.actions) };
}
