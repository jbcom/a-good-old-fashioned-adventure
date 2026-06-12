/**
 * The CommanderGovernor (docs/RAIL-COMMAND.md §testing shape): the test-side
 * player after the rail pivot. It never presses buttons — it places units by
 * the same drag gesture a finger makes and reads only the public dataset.
 */
import { page, userEvent } from "vitest/browser";
import { wait } from "./wait";

export interface CommandPerception {
  mode: string;
  mapName: string;
  units: number;
  enemies: number;
  coins: number;
  frontY: number;
}

function shell(): HTMLElement {
  const el = document.querySelector('[data-testid="game-shell"]');
  if (!el) throw new Error("no game shell");
  return el as HTMLElement;
}

function dispatch(target: Element, type: string, x = 0, y = 0): void {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      clientX: x,
      clientY: y,
      pointerId: 5,
      pointerType: "touch",
      isPrimary: true,
    }),
  );
}

export class CommanderGovernor {
  perceive(): CommandPerception {
    const data = shell().dataset;
    return {
      mode: data.mode ?? "",
      mapName: data.mapId ?? "",
      units: Number(data.units ?? 0),
      enemies: Number(data.enemies ?? 0),
      coins: Number(data.coins ?? 0),
      frontY: Number(data.frontY ?? 0),
    };
  }

  /** The single gameplay gesture: drag a toolbox panel onto the field. */
  async deploy(classId: string): Promise<void> {
    const panel = page.getByTestId(`toolbox-panel-${classId}`).element();
    const stage = page.getByTestId("world-stage-shell").element();
    const rect = stage.getBoundingClientRect();
    dispatch(panel, "pointerdown");
    dispatch(stage, "pointermove", rect.left + rect.width / 2, rect.top + rect.height * 0.7);
    dispatch(stage, "pointerup", rect.left + rect.width / 2, rect.top + rect.height * 0.7);
    await wait(120);
  }

  async tap(testId: string): Promise<void> {
    await userEvent.click(page.getByTestId(testId));
    await wait(100);
  }
}
