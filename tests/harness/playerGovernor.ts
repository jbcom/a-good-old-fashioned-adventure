import { page, userEvent } from "vitest/browser";
import {
  chooseGovernorAction,
  type GovernorAction,
  type GovernorGoal,
  goalSatisfied,
  type PlayerPerception,
} from "./playerGovernorModel";

type BrowserInput = ReturnType<typeof userEvent.setup>;
type DirectionButton = "up" | "down" | "left" | "right";

interface PursueOptions {
  maxSteps?: number;
}

interface DirectionOptions extends PursueOptions {
  durationMs?: number;
}

interface PointOptions extends PursueOptions {
  tolerance?: number;
}

const keyByButton: Record<string, string> = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  a: "j",
  b: "k",
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function byTestId(testId: string): HTMLElement | null {
  return document.querySelector(`[data-testid="${testId}"]`);
}

function textOf(testId: string): string {
  return byTestId(testId)?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function isVisible(element: HTMLElement | null): boolean {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return (
    style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0
  );
}

function inferMode(): string {
  if (isVisible(byTestId("landing-screen"))) return "landing";
  if (isVisible(byTestId("title-screen"))) return "title";
  if (isVisible(byTestId("victory-screen"))) return "victory";
  if (isVisible(byTestId("gameover-screen"))) return "gameover";
  if (isVisible(byTestId("world-stage-shell")) || isVisible(byTestId("top-hud"))) return "playing";
  return "unknown";
}

function visibleButtons(): string[] {
  return [...document.querySelectorAll<HTMLElement>("[data-testid]")]
    .filter((element) => element instanceof HTMLButtonElement && isVisible(element))
    .map((element) => element.dataset.testid ?? "")
    .filter(Boolean);
}

function numberData(element: HTMLElement | null, key: string): number {
  return Number(element?.dataset[key] ?? 0);
}

function describePerception(perception: PlayerPerception): string {
  const diagnostics = perception.diagnostics ?? {};
  return [
    `mode=${perception.mode}`,
    `map=${perception.mapName || "<none>"}`,
    `dialogue=${perception.dialogueText || "<none>"}`,
    `quest=${perception.questText || "<none>"}`,
    `diag.map=${diagnostics.mapId ?? "<none>"}`,
    `diag.x=${diagnostics.x ?? 0}`,
    `diag.y=${diagnostics.y ?? 0}`,
    `diag.hp=${diagnostics.hp ?? 0}`,
    `diag.enemies=${diagnostics.enemies ?? 0}`,
  ].join("; ");
}

export class PlayerGovernor {
  readonly input: BrowserInput;

  constructor(input: BrowserInput = userEvent.setup()) {
    this.input = input;
  }

  perceive(): PlayerPerception {
    const shell = byTestId("game-shell");
    return {
      mode: inferMode(),
      mapName: shell?.querySelector(".map-token")?.textContent?.trim() ?? "",
      topHudText: textOf("top-hud"),
      dialogueText: textOf("dialogue-box"),
      questText: textOf("quest-log"),
      visibleButtons: visibleButtons(),
      diagnostics: {
        mapId: shell?.dataset.mapId ?? "",
        x: numberData(shell, "playerX"),
        y: numberData(shell, "playerY"),
        hp: numberData(shell, "hp"),
        enemies: numberData(shell, "enemies"),
      },
    };
  }

  async click(testId: string): Promise<void> {
    await userEvent.click(page.getByTestId(testId));
    await wait(100);
  }

  async press(button: string): Promise<void> {
    const key = keyByButton[button] ?? button;
    await this.input.keyboard(key.startsWith("Arrow") ? `{${key}}` : key);
    await wait(100);
  }

  async hold(button: DirectionButton, durationMs: number): Promise<void> {
    const key = keyByButton[button];
    await this.input.keyboard(`{${key}>}`);
    await wait(durationMs);
    await this.input.keyboard(`{/${key}}`);
    await wait(100);
  }

  async act(action: GovernorAction): Promise<void> {
    if (action.kind === "click") {
      await this.click(action.button);
      return;
    }
    if (action.kind === "hold") {
      await this.hold(action.button as DirectionButton, action.durationMs ?? 260);
      return;
    }
    await this.press(action.button);
  }

  async pursue(
    goal: GovernorGoal,
    actions: GovernorAction[],
    options: PursueOptions = {},
  ): Promise<PlayerPerception> {
    const history: string[] = [];
    for (let step = 0; step < (options.maxSteps ?? 12); step++) {
      const perception = this.perceive();
      if (goalSatisfied(goal, perception)) return perception;
      history.push(describePerception(perception));
      await this.act(chooseGovernorAction(perception, actions));
    }
    const finalPerception = this.perceive();
    history.push(describePerception(finalPerception));
    throw new Error(
      `player governor failed goal ${JSON.stringify(goal)}\n${history
        .map((entry, index) => `${index + 1}. ${entry}`)
        .join("\n")}`,
    );
  }

  async reachByDirection(
    goal: GovernorGoal,
    button: DirectionButton,
    options: DirectionOptions = {},
  ): Promise<PlayerPerception> {
    return this.pursue(
      goal,
      [
        {
          id: `hold-${button}`,
          kind: "hold",
          button,
          durationMs: options.durationMs ?? 260,
          cost: 1,
        },
      ],
      { maxSteps: options.maxSteps },
    );
  }

  async reachPoint(
    targetX: number,
    targetY: number,
    options: PointOptions = {},
  ): Promise<PlayerPerception> {
    const tolerance = options.tolerance ?? 18;
    const maxSteps = options.maxSteps ?? 40;
    const history: string[] = [];

    for (let step = 0; step < maxSteps; step++) {
      const perception = this.perceive();
      const x = perception.diagnostics?.x ?? 0;
      const y = perception.diagnostics?.y ?? 0;
      const dx = targetX - x;
      const dy = targetY - y;
      if (perception.mode !== "playing") {
        throw new Error(
          `player governor left play mode while walking to ${targetX},${targetY}: ${describePerception(
            perception,
          )}`,
        );
      }
      if (Math.abs(dx) <= tolerance && Math.abs(dy) <= tolerance) return perception;
      history.push(describePerception(perception));
      if (Math.abs(dx) > tolerance) {
        await this.hold(dx > 0 ? "right" : "left", Math.min(700, Math.max(100, Math.abs(dx) * 8)));
      }
      if (Math.abs(dy) > tolerance) {
        await this.hold(dy > 0 ? "down" : "up", Math.min(700, Math.max(100, Math.abs(dy) * 8)));
      }
    }

    const finalPerception = this.perceive();
    history.push(describePerception(finalPerception));
    throw new Error(
      `player governor failed to reach ${targetX},${targetY}\n${history
        .map((entry, index) => `${index + 1}. ${entry}`)
        .join("\n")}`,
    );
  }
}
