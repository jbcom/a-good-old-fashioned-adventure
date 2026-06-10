import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { GameStage } from "../../src/render/GameStage";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { autoStartQuests } from "../../src/sim/quests";
import { step } from "../../src/sim/tick";

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  root?.unmount();
  container?.remove();
  container = undefined;
});

it("renders the live overworld from a running world", async () => {
  const world = createGameWorld(3);
  instantiateMap(world, "map:overworld", { classId: "knight" });
  autoStartQuests(world);
  for (let i = 0; i < 30; i++) step(world);

  container = document.createElement("div");
  container.style.width = "720px";
  container.style.height = "480px";
  document.body.appendChild(container);
  root = createRoot(container);
  root.render(
    <StrictMode>
      <GameStage world={world} />
    </StrictMode>,
  );

  await expect
    .poll(() => container?.querySelector<HTMLCanvasElement>("canvas[data-ready='1']"), {
      timeout: 10_000,
    })
    .toBeTruthy();
  // let several frames render the reconciled scene
  await new Promise((resolve) => setTimeout(resolve, 600));
  const path = await page.screenshot({ path: "game-stage-overworld.png" });
  expect(path).toBeTruthy();
});

it("renders the dungeon after a map transition", async () => {
  const world = createGameWorld(3);
  instantiateMap(world, "map:overworld", { classId: "ranger" });
  instantiateMap(world, "map:castle-dungeon", { classId: "ranger" });
  for (let i = 0; i < 30; i++) step(world);

  container = document.createElement("div");
  container.style.width = "720px";
  container.style.height = "480px";
  document.body.appendChild(container);
  root = createRoot(container);
  root.render(
    <StrictMode>
      <GameStage world={world} />
    </StrictMode>,
  );

  await expect
    .poll(() => container?.querySelector<HTMLCanvasElement>("canvas[data-ready='1']"), {
      timeout: 10_000,
    })
    .toBeTruthy();
  await new Promise((resolve) => setTimeout(resolve, 600));
  const path = await page.screenshot({ path: "game-stage-dungeon.png" });
  expect(path).toBeTruthy();
});
