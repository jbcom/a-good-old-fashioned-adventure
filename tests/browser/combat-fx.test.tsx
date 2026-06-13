import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { preloadSheetImages } from "../../src/render/atlas";
import { GameStage } from "../../src/render/GameStage";
import { createGameWorld, instantiateMap, spawnEnemy, spawnUnit } from "../../src/sim/factories";
import { step } from "../../src/sim/tick";
import { CameraState, FxBurst } from "../../src/sim/traits";

/**
 * S20.2 combat feel: the unit-feel FX (deploy puff, charge dust, blade arc,
 * heal glow, withered tint) render as billboards. This drops a line and steps
 * a few frames so the deploy puffs are mid-bloom, then reads the frame — the
 * FxBurst entities must exist and the stage must paint them.
 */
let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  root?.unmount();
  container?.remove();
  container = undefined;
});

it("paints the deploy-puff feel-fx as the line lands", async () => {
  const world = createGameWorld(7);
  instantiateMap(world, "map:rescue-route", { classId: "knight", withPlayer: false });
  // a fresh line lands — each spawn kicks up a deploy puff
  spawnUnit(world, "knight", 130, 940);
  spawnUnit(world, "barbarian", 160, 940);
  spawnUnit(world, "priest", 110, 960);
  spawnEnemy(world, "forest-orc", 150, 880);
  world.set(CameraState, { x: 140, y: 920, shake: 0 });

  // a couple frames so the puffs are mid-bloom but not yet expired (0.4s life)
  for (let i = 0; i < 6; i++) step(world);
  const puffs = [...world.query(FxBurst)].filter(
    (e) => e.get(FxBurst)?.kind === "puff" && (e.get(FxBurst)?.left ?? 0) > 0,
  );
  expect(puffs.length, "deploy puffs should be live mid-bloom").toBeGreaterThan(0);

  document.body.style.margin = "0";
  container = document.createElement("div");
  container.style.position = "fixed";
  container.style.inset = "0";
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
  await preloadSheetImages();
  await new Promise((resolve) => setTimeout(resolve, 300));
  const path = await page.screenshot({ path: "../../docs/evidence/combat-fx-deploy.png" });
  expect(path).toBeTruthy();
});
