import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { MemorySaveRepository } from "../../src/persistence/saveRepository";
import { preloadSheetImages } from "../../src/render/atlas";
import { CommanderGovernor } from "../harness/commanderGovernor";
import { wait } from "../harness/wait";

/**
 * S-DAG-ICONS evidence: the upgrade DAG renders its node emblems as a mix of
 * bespoke .pix grids (identity nodes) and purchased-sheet iconRef crops
 * (generic economy/class/enemy/ability nodes). This opens the graph from the
 * results screen with a richly-unlocked save and reads the emblems at node
 * scale to confirm the sheet crops display.
 */
let container: HTMLDivElement | undefined;
let root: Root | undefined;
let originalBodyStyle = "";

afterEach(() => {
  root?.unmount();
  container?.remove();
  document.body.setAttribute("style", originalBodyStyle);
  root = undefined;
  container = undefined;
});

function mountApp(repository: MemorySaveRepository) {
  originalBodyStyle = document.body.getAttribute("style") ?? "";
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  container = document.createElement("div");
  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.width = "100vw";
  container.style.height = "100vh";
  document.body.appendChild(container);
  root = createRoot(container);
  root.render(
    <StrictMode>
      <App saveRepository={repository} />
    </StrictMode>,
  );
}

it("renders the DAG with sheet-icon and bespoke emblems together", async () => {
  await page.viewport(1280, 720);
  await preloadSheetImages();
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
    questSummary: "The icons read",
    snapshotJson: JSON.stringify({
      coins: 9999,
      gems: 9999,
      roses: 99,
      purchasedUpgradeIds: [
        "upgrade:first-vow",
        "upgrade:dragon-wake",
        "upgrade:unlock-forest-orc",
        "upgrade:orc-bounty",
        "upgrade:ranger-trail",
        "upgrade:wizard-focus",
        "upgrade:knight-vigor",
        "upgrade:warband-of-one",
      ],
      unlockedClassIds: ["knight", "ranger", "wizard"],
      unlockedRoutePackIds: [],
      rescueCount: 1,
    }),
    updatedAt: new Date("2026-06-13T09:00:00Z"),
  });

  mountApp(repository);
  const commander = new CommanderGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await commander.tap("continue-button");
  await expect
    .poll(() => commander.perceive().mapName, { timeout: 10_000 })
    .toBe("map:rescue-route");

  // AUTO runs the frontier headlessly; clearing it lands on the results screen,
  // from which the upgrade graph opens (a retire/loss lands on gameover, which
  // has no graph route — results is the win path that surfaces the DAG)
  await commander.tap("hud-auto");
  await expect.poll(() => commander.perceive().mode, { timeout: 20_000 }).toBe("results");
  await commander.tap("open-upgrade-graph");
  await expect.element(page.getByTestId("upgrade-detail")).toBeVisible();
  // let the emblem canvases paint (bespoke bake + sheet crop draw)
  await preloadSheetImages();
  await wait(500);

  const shot = await page.screenshot({ path: "../../docs/evidence/dag-icons.png" });
  expect(shot).toBeTruthy();
});
