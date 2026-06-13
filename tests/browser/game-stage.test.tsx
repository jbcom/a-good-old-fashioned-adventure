import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { preloadSheetImages } from "../../src/render/atlas";
import { GameStage } from "../../src/render/GameStage";
import { createGameWorld, instantiateMap, spawnEnemy } from "../../src/sim/factories";
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

it("renders the authored Sunken Road crossing and key-fight landmark", async () => {
  const world = createGameWorld(3);
  instantiateMap(world, "map:sunken-road", { classId: "ranger" });
  world.queryFirst(IsPlayer)?.set(Transform, { x: 500, y: 304 });
  world.set(CameraState, { x: 500, y: 304, shake: 0 });
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
  const path = await page.screenshot({ path: "game-stage-sunken-road.png" });
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

it("renders the High Dragon boss sheet in the candlelit hall", async () => {
  const world = createGameWorld(3);
  instantiateMap(world, "map:castle-hall", { classId: "knight" });
  // the route-pack gate normally controls this spawn; the render contract
  // under test is the purchased 96px sheet, so place the boss directly
  spawnEnemy(world, "dragon-guardian", 732, 268);
  // side-view row sheet beside the directional strips: one shot proves both
  // backends (and the mirror path — stalker placed right of the player)
  spawnEnemy(world, "bramble-stalker", 680, 300);
  world.queryFirst(IsPlayer)?.set(Transform, { x: 700, y: 290 });
  world.set(CameraState, { x: 716, y: 278, shake: 0 });
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
  // the purchased strips decode asynchronously — hold for the real frames
  await preloadSheetImages();
  await new Promise((resolve) => setTimeout(resolve, 600));
  const path = await page.screenshot({ path: "game-stage-boss-hall.png" });
  expect(path).toBeTruthy();
});

it("renders the five new region trash bodies in one lineup", async () => {
  const world = createGameWorld(3);
  instantiateMap(world, "map:sunken-road", { classId: "knight" });
  // lineup left-to-right beside the player spawn: every Elthen body crops
  // from its own sheet rows — one shot validates all five defs
  spawnEnemy(world, "dune-adder", 64, 260);
  spawnEnemy(world, "carrion-raven", 104, 256);
  spawnEnemy(world, "gatehouse-vulture", 148, 286);
  spawnEnemy(world, "crypt-bat", 76, 330);
  spawnEnemy(world, "cellar-rat", 132, 334);
  // direction-row humanoid beside the animals — third layout convention
  spawnEnemy(world, "forest-shaman", 168, 262);
  world.queryFirst(IsPlayer)?.set(Transform, { x: 180, y: 360 });
  world.set(CameraState, { x: 110, y: 300, shake: 0 });
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
  await preloadSheetImages();
  await new Promise((resolve) => setTimeout(resolve, 600));
  const path = await page.screenshot({ path: "game-stage-trash-menagerie.png" });
  expect(path).toBeTruthy();
});
