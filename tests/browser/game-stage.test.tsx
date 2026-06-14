import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { clearAtlas, preloadSheetImages, resetSheetPreloadForTest } from "../../src/render/atlas";
import { composeGround, GameStage } from "../../src/render/GameStage";
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

it("re-bakes a NON-BLACK ground when sheet images load after the first compose", async () => {
  // The deployed-build black-terrain bug: composeGround bakes ONCE per (map,
  // rev) and caches it; if that first bake runs before the sheet images decode
  // (slow GitHub Pages network), every PNG ground tile is a transparent
  // placeholder and the ground renders black forever. Locally assets load
  // instantly so the bug is invisible — this reproduces the race directly on
  // composeGround and proves the ground must (and does) heal once sheets load.
  const world = createGameWorld(3);
  instantiateMap(world, "map:overworld", { classId: "knight" });
  for (let i = 0; i < 5; i++) step(world);

  const opaqueFraction = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let opaque = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 240) opaque++;
    return opaque / (data.length / 4);
  };

  // COLD: sheets not loaded → the PNG ground tiles bake transparent (the bug).
  clearAtlas();
  resetSheetPreloadForTest();
  const cold = composeGround(world);
  expect(
    opaqueFraction(cold),
    "expected the cold (pre-load) ground to be mostly transparent — that IS the bug being guarded",
  ).toBeLessThan(0.5);

  // HOT: load the sheets, clear the stale cache, re-bake → opaque ground. The
  // renderer's syncGround does exactly this recompose once sheetsAreReady().
  await preloadSheetImages();
  clearAtlas();
  const hot = composeGround(world);
  expect(
    opaqueFraction(hot),
    "the ground rendered black after sheets loaded — the deployed-build fix regressed",
  ).toBeGreaterThan(0.95);
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
  instantiateMap(world, "map:sunken-road", { classId: "wizard" });
  // lineup left-to-right beside the player spawn: every Elthen body crops
  // from its own sheet rows — one shot validates all five defs
  spawnEnemy(world, "dune-adder", 64, 260);
  spawnEnemy(world, "carrion-raven", 104, 256);
  spawnEnemy(world, "gatehouse-vulture", 148, 286);
  spawnEnemy(world, "crypt-bat", 76, 330);
  spawnEnemy(world, "cellar-rat", 132, 334);
  // direction-row humanoid beside the animals — third layout convention
  spawnEnemy(world, "forest-shaman", 168, 262);
  spawnEnemy(world, "gate-sentry", 40, 300);
  spawnEnemy(world, "orc-scout", 210, 280);
  spawnEnemy(world, "oldwood-raider", 240, 320);
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
