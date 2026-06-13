import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { preloadSheetImages } from "../../src/render/atlas";
import { GameStage } from "../../src/render/GameStage";
import { createGameWorld, instantiateMap, spawnEnemy } from "../../src/sim/factories";
import { step } from "../../src/sim/tick";
import { CameraState, IsPlayer, SpriteRef, Transform } from "../../src/sim/traits";

/**
 * The dragon's kin render from BAKED recolored sheets (scripts/bake-dragon-kin.mjs):
 * one source High Dragon reads as a whole family, each kin a distinct hue
 * (docs/RAIL-COMMAND.md §dragon's kin). Its own file — a WebGL mount is heavy
 * and game-stage already holds the browser's context budget.
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

it("renders the baked dragon-kin sheets (the Mario nod)", async () => {
  const world = createGameWorld(4);
  instantiateMap(world, "map:castle-hall", { classId: "knight" });
  // three kin from their baked recolored sheets: the brother (gold), the
  // great-aunt (red), the sister (violet) — real art, one source dragon
  const brother = spawnEnemy(world, "dragon-guardian", 660, 268);
  brother.set(SpriteRef, { spriteId: "sprite:high-dragon-brother", paletteId: "palette:boss" });
  const greatAunt = spawnEnemy(world, "dragon-guardian", 732, 268);
  greatAunt.set(SpriteRef, {
    spriteId: "sprite:high-dragon-great-aunt",
    paletteId: "palette:boss",
  });
  const sister = spawnEnemy(world, "dragon-guardian", 804, 268);
  sister.set(SpriteRef, { spriteId: "sprite:high-dragon-sister", paletteId: "palette:boss" });
  world.queryFirst(IsPlayer)?.set(Transform, { x: 732, y: 300 });
  world.set(CameraState, { x: 732, y: 278, shake: 0 });
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
  const path = await page.screenshot({ path: "dragon-kin-lineup.png" });
  expect(path).toBeTruthy();
});
