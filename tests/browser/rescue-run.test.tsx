import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { MemorySaveRepository } from "../../src/persistence/saveRepository";
import { PlayerGovernor } from "../harness/playerGovernor";

let container: HTMLDivElement | undefined;
let root: Root | undefined;
let originalBodyStyle = "";
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function fightNearby(governor: PlayerGovernor, presses: number) {
  for (let i = 0; i < presses; i++) {
    await governor.press("a");
    await wait(80);
  }
}

it("plays a new game bottom-to-top rescue run through public controls", async () => {
  await page.viewport(1280, 720);
  await wait(100);

  mountApp(new MemorySaveRepository());
  const governor = new PlayerGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await governor.click("new-game-button");
  await expect.element(page.getByTestId("title-screen")).toBeVisible();
  await governor.press("a");
  await expect.poll(() => governor.perceive().mapName, { timeout: 10_000 }).toBe("Rescue Road");
  await expect.element(page.getByTestId("quest-log")).toHaveTextContent("route dragon");
  await expect.element(page.getByTestId("top-hud")).toHaveTextContent("C");
  await expect.element(page.getByTestId("top-hud")).toHaveTextContent("R");

  const startShot = await page.screenshot({
    path: "../../docs/evidence/rescue-route-start.png",
  });
  expect(startShot).toBeTruthy();

  // pose frames are public state: the walk cycle shows while moving
  const shellPose = () =>
    (page.getByTestId("game-shell").element() as HTMLElement).dataset.playerPose ?? "";
  const holdWalk = governor.hold("up", 900);
  await expect.poll(shellPose, { timeout: 800 }).toMatch(/walk-/);
  await holdWalk;

  // serpentine climb: fight the path trash as it engages, then take the bends
  const waypoints: Array<[number, number, number]> = [
    [136, 896, 8],
    [136, 728, 8],
    [264, 712, 6],
    [280, 488, 8],
    [152, 424, 8],
    [136, 168, 8],
  ];
  for (const [x, y, presses] of waypoints) {
    await governor.reachPoint(x, y, { tolerance: 26, maxSteps: 48 });
    await fightNearby(governor, presses);
  }

  // the route dragon holds the pass below the plateau
  await governor.reachPoint(192, 152, { tolerance: 28, maxSteps: 48 });
  let combatBursts = 0;
  for (let round = 0; round < 12; round++) {
    await fightNearby(governor, 6);
    if (combatBursts < 3) {
      await page.screenshot({
        path: `../../docs/evidence/combat-frame-${combatBursts}.png`,
      });
      combatBursts += 1;
    }
    if (governor.perceive().questText.includes("Free Princess Amber")) break;
    await governor.reachPoint(206, 140, { tolerance: 30, maxSteps: 12 });
  }
  await expect
    .poll(() => governor.perceive().questText, { timeout: 10_000 })
    .toContain("Free Princess Amber");

  // combat motion fired: swing streaks and death dissolves were spawned
  const shellEl = page.getByTestId("game-shell").element() as HTMLElement;
  expect(Number(shellEl.dataset.fxSpawned ?? 0)).toBeGreaterThan(5);

  await governor.reachPoint(216, 96, { tolerance: 26, maxSteps: 32 });
  await governor.press("a");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("kingdom is saved");
  const rescueShot = await page.screenshot({
    path: "../../docs/evidence/rescue-route-rescue.png",
  });
  expect(rescueShot).toBeTruthy();

  await governor.press("a");
  await expect.element(page.getByTestId("results-screen")).toBeVisible();
  await expect.element(page.getByTestId("result-ledger")).toHaveTextContent("Earned");
  await expect.element(page.getByTestId("next-vow")).toHaveTextContent("Next vow:");

  await page.viewport(390, 844);
  await wait(250);
  const phoneShot = await page.screenshot({
    path: "../../docs/evidence/rescue-route-results-phone.png",
  });
  expect(phoneShot).toBeTruthy();
  await page.viewport(1280, 720);

  await governor.press("a");
  await expect.element(page.getByTestId("upgrade-screen")).toBeVisible();
  await expect.element(page.getByTestId("upgrade-purse")).toHaveTextContent("Coins");
  const upgradeGraphShot = await page.screenshot({
    path: "../../docs/evidence/upgrade-graph-ranked.png",
  });
  expect(upgradeGraphShot).toBeTruthy();

  // spend the run's coins on a connected rank, then return to results
  await governor.press("a");
  await expect.element(page.getByTestId("upgrade-detail")).toHaveTextContent("joins the road");
  await governor.press("b");
  await expect.element(page.getByTestId("results-screen")).toBeVisible();

  // second-run proof: the purchased rank visibly changes the next run
  await governor.click("result-new-run");
  await expect.poll(() => governor.perceive().mapName, { timeout: 10_000 }).toBe("Rescue Road");
  const shell = () => page.getByTestId("game-shell").element() as HTMLElement;
  expect(shell().dataset.purchasedUpgrades).toContain("upgrade:knight-vigor");
  await expect.poll(() => Number(shell().dataset.maxHp ?? 0)).toBe(110);
}, 240_000);

it("walks through the castle gate to the relocated princess", async () => {
  await page.viewport(1280, 720);
  await wait(100);

  const repository = new MemorySaveRepository();
  await repository.upsertSlot({
    id: 1,
    classId: "knight",
    mapId: "map:rescue-route",
    playerX: 136,
    playerY: 220,
    level: 3,
    hp: 120,
    maxHp: 120,
    questSummary: "The princess is in another castle",
    snapshotJson: JSON.stringify({
      coins: 60,
      roses: 5,
      purchasedUpgradeIds: ["upgrade:first-vow"],
      unlockedClassIds: ["knight"],
      unlockedRoutePackIds: ["castle-interior"],
    }),
    updatedAt: new Date("2026-06-12T08:00:00Z"),
  });

  mountApp(repository);
  const governor = new PlayerGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await governor.click("continue-button");
  await expect.poll(() => governor.perceive().mapName, { timeout: 10_000 }).toBe("Rescue Road");

  // the summit champion guards the gate where the princess once waited
  await governor.reachPoint(200, 176, { tolerance: 26, maxSteps: 40 });
  await fightNearby(governor, 14);
  const gateShot = await page.screenshot({
    path: "../../docs/evidence/rescue-route-castle-gate.png",
  });
  expect(gateShot).toBeTruthy();

  await governor.reachPoint(216, 60, { tolerance: 16, maxSteps: 40 });
  await expect.poll(() => governor.perceive().mapName, { timeout: 10_000 }).toBe("Castle Hall");

  // the dragon followed her into the candlelit hall — take the south lane,
  // clear of the library door (y<=144) and the armory door (x468-532, y>=404)
  const hallWaypoints: Array<[number, number, number]> = [
    [300, 330, 0],
    [620, 330, 0],
    [660, 280, 6],
  ];
  for (const [x, y, presses] of hallWaypoints) {
    await governor.reachPoint(x, y, { tolerance: 28, maxSteps: 48 });
    if (presses > 0) await fightNearby(governor, presses);
  }
  for (let round = 0; round < 12; round++) {
    await fightNearby(governor, 6);
    if (governor.perceive().questText.includes("Free Princess Amber")) break;
    await governor.reachPoint(716, 268, { tolerance: 30, maxSteps: 12 });
  }
  await expect
    .poll(() => governor.perceive().questText, { timeout: 10_000 })
    .toContain("Free Princess Amber");

  await governor.reachPoint(788, 264, { tolerance: 26, maxSteps: 32 });
  await governor.press("a");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("kingdom is saved");
  const hallShot = await page.screenshot({
    path: "../../docs/evidence/castle-hall-rescue.png",
  });
  expect(hallShot).toBeTruthy();

  await governor.press("a");
  await expect.element(page.getByTestId("results-screen")).toBeVisible();
}, 240_000);

it("banks coins through death and into the next run", async () => {
  await page.viewport(1280, 720);
  await wait(100);

  mountApp(new MemorySaveRepository());
  const governor = new PlayerGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await governor.click("new-game-button");
  await expect.element(page.getByTestId("title-screen")).toBeVisible();
  await governor.press("a");
  await expect.poll(() => governor.perceive().mapName, { timeout: 10_000 }).toBe("Rescue Road");

  // earn coins from the first orc on the road
  await governor.reachPoint(136, 896, { tolerance: 26, maxSteps: 48 });
  await fightNearby(governor, 10);
  const shell = () => page.getByTestId("game-shell").element() as HTMLElement;
  await expect
    .poll(() => Number(shell().dataset.coins ?? 0), { timeout: 15_000 })
    .toBeGreaterThan(0);

  // march into the dragon's bolts and fall — dying on the way also counts
  try {
    await governor.reachPoint(200, 168, { tolerance: 28, maxSteps: 60 });
  } catch {
    // left play mode mid-walk: the road claimed the knight early
  }
  // bolts in flight: capture the projectile trails before the fall
  await wait(1200);
  const trailShot = await page.screenshot({
    path: "../../docs/evidence/projectile-trails.png",
  });
  expect(trailShot).toBeTruthy();
  await expect.poll(() => governor.perceive().mode, { timeout: 60_000 }).toBe("gameover");
  await expect
    .element(page.getByTestId("gameover-screen"))
    .toHaveTextContent("Carried Back to Hearthwake");
  await expect.element(page.getByTestId("gameover-screen")).toHaveTextContent("banked");
  const banked = Number(shell().dataset.coins ?? 0);
  expect(banked).toBeGreaterThan(0);
  const deathShot = await page.screenshot({
    path: "../../docs/evidence/rescue-route-death-payout.png",
  });
  expect(deathShot).toBeTruthy();

  // A starts another run with the wallet intact
  await governor.press("a");
  await expect.poll(() => governor.perceive().mapName, { timeout: 10_000 }).toBe("Rescue Road");
  await expect.poll(() => governor.perceive().mode, { timeout: 10_000 }).toBe("playing");
  expect(Number(shell().dataset.coins ?? 0)).toBe(banked);
}, 240_000);
