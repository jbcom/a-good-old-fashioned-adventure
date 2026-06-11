import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { GameStage } from "../../src/render/GameStage";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { autoStartQuests } from "../../src/sim/quests";
import { step } from "../../src/sim/tick";
import { CameraState, IsPlayer, Transform } from "../../src/sim/traits";

let container: HTMLDivElement | undefined;
let root: Root | undefined;
let originalBodyStyle = "";

afterEach(() => {
  root?.unmount();
  container?.remove();
  document.body.setAttribute("style", originalBodyStyle);
  container = undefined;
});

function mountStageContainer() {
  originalBodyStyle = document.body.getAttribute("style") ?? "";
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#0c0912";
  container = document.createElement("div");
  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.width = "100vw";
  container.style.height = "100vh";
  document.body.appendChild(container);
  return container;
}

it("renders the live overworld from a running world", async () => {
  const world = createGameWorld(3);
  instantiateMap(world, "map:overworld", { classId: "knight" });
  autoStartQuests(world);
  for (let i = 0; i < 30; i++) step(world);

  container = mountStageContainer();
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

  container = mountStageContainer();
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

it("renders the authored village props and richer terrain", async () => {
  const world = createGameWorld(3);
  instantiateMap(world, "map:village", { classId: "knight" });
  world.queryFirst(IsPlayer)?.set(Transform, { x: 364, y: 296 });
  world.set(CameraState, { x: 364, y: 296, shake: 0 });
  for (let i = 0; i < 30; i++) step(world);

  container = mountStageContainer();
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
  const path = await page.screenshot({ path: "game-stage-village.png" });
  expect(path).toBeTruthy();
});

it("renders the authored castle approach road landmarks", async () => {
  const world = createGameWorld(3);
  instantiateMap(world, "map:castle-approach", { classId: "ranger" });
  world.queryFirst(IsPlayer)?.set(Transform, { x: 720, y: 304 });
  world.set(CameraState, { x: 720, y: 304, shake: 0 });
  for (let i = 0; i < 30; i++) step(world);

  container = mountStageContainer();
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
  const path = await page.screenshot({ path: "game-stage-castle-approach.png" });
  expect(path).toBeTruthy();
});

it("renders the S6 castle approach exterior staging", async () => {
  const world = createGameWorld(3);
  instantiateMap(world, "map:castle-approach", { classId: "knight" });
  world.queryFirst(IsPlayer)?.set(Transform, { x: 900, y: 304 });
  world.set(CameraState, { x: 900, y: 304, shake: 0 });
  for (let i = 0; i < 30; i++) step(world);

  container = mountStageContainer();
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
  const path = await page.screenshot({ path: "game-stage-castle-approach.png" });
  expect(path).toBeTruthy();
});
