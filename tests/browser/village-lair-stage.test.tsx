import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { preloadSheetImages } from "../../src/render/atlas";
import { GameStage } from "../../src/render/GameStage";
import { createGameWorld, instantiateMap, spawnUnit } from "../../src/sim/factories";
import { step } from "../../src/sim/tick";
import { CameraState, IsPlayer, Transform } from "../../src/sim/traits";

/**
 * Visual evidence for the captured-village Dragon's Lair (S-CONTENT): the
 * repurposed village rooms render as real dungeon rails with the dragon's
 * warband. Own-the-visuals: this screenshot is READ at authoring time.
 */
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
  document.body.appendChild(container);
  return container;
}

it("renders the captured-village nest-tavern lair room", async () => {
  const world = createGameWorld(7);
  instantiateMap(world, "map:village-tavern", { classId: "knight" });
  // drop a small line so the room reads as an active rail fight
  spawnUnit(world, "knight", 120, 176);
  spawnUnit(world, "ranger", 90, 200);
  world.queryFirst(IsPlayer)?.set(Transform, { x: 110, y: 188 });
  world.set(CameraState, { x: 300, y: 176, shake: 0 });
  for (let i = 0; i < 40; i++) step(world);

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
  const path = await page.screenshot({ path: "village-lair-tavern.png" });
  expect(path).toBeTruthy();
});
