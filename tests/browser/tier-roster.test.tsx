import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { MemorySaveRepository } from "../../src/persistence/saveRepository";
import { CommanderGovernor } from "../harness/commanderGovernor";
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

it("fields the tier ladder: medium and composite units fight by their own minds", async () => {
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
    questSummary: "The ladder marches",
    snapshotJson: JSON.stringify({
      coins: 0,
      roses: 0,
      purchasedUpgradeIds: [
        "upgrade:first-vow",
        "upgrade:bard-road-song",
        "upgrade:sorcerer-cinder",
        "upgrade:knight-vigor",
        "upgrade:priest-vows",
        "upgrade:warlock-pact",
        "upgrade:barbarian-storm",
        "upgrade:dread-knight",
        // Zone model (docs/RAIL-COMMAND.md §maps are zones, not enemies): a
        // map's waves are region.archetypes ∩ the player's UNLOCKED enemy set.
        // Without an enemy-DAG unlock no trash spawns — only the boss holds —
        // so the warlock's withering field would have nothing to mark. Unlock
        // forest-orc (region:oldwood pool) so the muster waves actually field.
        "upgrade:dragon-wake",
        "upgrade:unlock-forest-orc",
      ],
      unlockedClassIds: [
        "knight",
        "bard",
        "sorcerer",
        "priest",
        "warlock",
        "barbarian",
        "dread-knight",
      ],
      unlockedRoutePackIds: [],
    }),
    updatedAt: new Date("2026-06-12T18:00:00Z"),
  });

  mountApp(repository);
  const commander = new CommanderGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await commander.tap("continue-button");
  await expect
    .poll(() => commander.perceive().mapName, { timeout: 10_000 })
    .toBe("map:rescue-route");

  // the toolbox shows the whole unlocked ladder
  for (const classId of ["knight", "priest", "warlock", "barbarian", "dread-knight"]) {
    await expect
      .element(page.getByTestId(`toolbox-panel-${classId}`))
      .toHaveAttribute("data-remaining", "1");
  }

  // field a tiered line: wall, wither, whirl
  await commander.deploy("knight");
  await commander.deploy("warlock");
  await commander.deploy("barbarian");
  await commander.deploy("priest");
  await expect.poll(() => commander.perceive().units, { timeout: 5000 }).toBe(4);

  // the waves answer and the warlock's field marks them: withered enemies
  // are public state
  const shell = () => page.getByTestId("game-shell").element() as HTMLElement;
  await expect.poll(() => commander.perceive().enemies, { timeout: 8000 }).toBeGreaterThan(0);
  await expect
    .poll(() => Number(shell().dataset.withered ?? 0), { timeout: 30_000 })
    .toBeGreaterThan(0);

  const tierShot = await page.screenshot({
    path: "../../docs/evidence/tier-roster-field.png",
  });
  expect(tierShot).toBeTruthy();

  await page.viewport(390, 844);
  await wait(250);
  const tierPhone = await page.screenshot({
    path: "../../docs/evidence/tier-roster-phone.png",
  });
  expect(tierPhone).toBeTruthy();
  await page.viewport(1280, 720);
}, 240_000);
