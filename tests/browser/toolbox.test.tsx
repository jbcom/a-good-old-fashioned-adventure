import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { MemorySaveRepository } from "../../src/persistence/saveRepository";
import { PlayerGovernor } from "../harness/playerGovernor";
import { wait } from "../harness/wait";

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  root?.unmount();
  container?.remove();
  root = undefined;
  container = undefined;
});

function mountApp(repository: MemorySaveRepository) {
  container = document.createElement("div");
  container.style.position = "fixed";
  container.style.inset = "0";
  document.body.appendChild(container);
  root = createRoot(container);
  root.render(
    <StrictMode>
      <App saveRepository={repository} />
    </StrictMode>,
  );
}

function pointer(target: Element, type: string, x: number, y: number) {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      clientX: x,
      clientY: y,
      pointerId: 3,
      pointerType: "touch",
      isPrimary: true,
    }),
  );
}

it("drags a knight from the toolbox onto the field", async () => {
  await page.viewport(1280, 720);
  await wait(100);

  const repository = new MemorySaveRepository();
  await repository.upsertSlot({
    id: 1,
    classId: "knight",
    mapId: "map:rescue-route",
    playerX: 136,
    playerY: 976,
    level: 1,
    hp: 100,
    maxHp: 100,
    questSummary: "Hold the road",
    snapshotJson: JSON.stringify({
      coins: 0,
      roses: 0,
      purchasedUpgradeIds: ["upgrade:first-vow"],
      unlockedClassIds: ["knight"],
      unlockedRoutePackIds: [],
    }),
    updatedAt: new Date("2026-06-12T16:00:00Z"),
  });

  mountApp(repository);
  const governor = new PlayerGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await governor.click("continue-button");
  await expect.poll(() => governor.perceive().mapName, { timeout: 10_000 }).toBe("Rescue Road");

  await expect.element(page.getByTestId("unit-toolbox")).toBeVisible();
  await expect
    .element(page.getByTestId("toolbox-panel-knight"))
    .toHaveAttribute("data-remaining", "1");

  // the single gameplay gesture: drag the panel onto the stage
  const stage = page.getByTestId("world-stage-shell").element();
  const rect = stage.getBoundingClientRect();
  const dropX = rect.left + rect.width / 2;
  const dropY = rect.top + rect.height * 0.7;
  pointer(page.getByTestId("toolbox-panel-knight").element(), "pointerdown", 0, 0);
  pointer(stage, "pointermove", dropX, dropY);
  pointer(stage, "pointerup", dropX, dropY);

  const shell = () => page.getByTestId("game-shell").element() as HTMLElement;
  await expect
    .poll(
      () =>
        `${shell().dataset.dragArms}/${shell().dataset.drops}/${shell().dataset.deploys}/${shell().dataset.units}`,
      { timeout: 5000 },
    )
    .toBe("1/1/1/1");
  await expect
    .element(page.getByTestId("toolbox-panel-knight"))
    .toHaveAttribute("data-remaining", "0");

  const toolboxShot = await page.screenshot({
    path: "../../docs/evidence/toolbox-deploy.png",
  });
  expect(toolboxShot).toBeTruthy();
});
