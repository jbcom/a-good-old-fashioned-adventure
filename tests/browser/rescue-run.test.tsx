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
  for (let round = 0; round < 12; round++) {
    await fightNearby(governor, 6);
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
  await expect.poll(() => governor.perceive().mode, { timeout: 60_000 }).toBe("gameover");
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
