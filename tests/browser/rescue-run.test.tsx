import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { MemorySaveRepository } from "../../src/persistence/saveRepository";
import { PlayerGovernor } from "../harness/playerGovernor";
import { wait } from "../harness/wait";

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
    await governor.pressAttack(presses);
  }

  // the route dragon holds the pass below the plateau
  await governor.reachPoint(192, 152, { tolerance: 28, maxSteps: 48 });

  // the dragon fights in readable phases, exposed through the public dataset:
  // engagement starts a roar/volley/lull cycle, and the vulnerable lull
  // arrives on its config timer
  const bossPhase = () =>
    (page.getByTestId("game-shell").element() as HTMLElement).dataset.bossPhase ?? "";
  await expect.poll(bossPhase, { timeout: 8000 }).toMatch(/^(roar|volley|lull)$/);
  await expect.poll(bossPhase, { timeout: 8000 }).toBe("lull");

  let combatBursts = 0;
  for (let round = 0; round < 12; round++) {
    await governor.pressAttack(6);
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
}, 360_000);

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
  await governor.pressAttack(14);
  const gateShot = await page.screenshot({
    path: "../../docs/evidence/rescue-route-castle-gate.png",
  });
  expect(gateShot).toBeTruthy();

  await governor.reachPoint(216, 60, { tolerance: 16, maxSteps: 40 });
  await expect.poll(() => governor.perceive().mapName, { timeout: 10_000 }).toBe("Castle Hall");

  // detour: the library branch must outpay the straight lane — face the
  // Lectern Shade, crack the royal strongbox, bank it all before the rescue
  const shell2 = () => page.getByTestId("game-shell").element() as HTMLElement;
  const coinsBeforeBranch = Number(shell2().dataset.coins ?? 0);
  const rosesBeforeBranch = Number(shell2().dataset.roses ?? 0);
  await governor.reachPoint(320, 116, { tolerance: 28, maxSteps: 48 });
  await expect.poll(() => governor.perceive().mapName, { timeout: 10_000 }).toBe("Castle Library");
  const enemiesAtEntry = Number(shell2().dataset.enemies ?? 0);
  const fxAtEntry = Number(shell2().dataset.fxSpawned ?? 0);
  await governor.fightUntil(
    (perception) => (perception.diagnostics?.enemies ?? enemiesAtEntry) < enemiesAtEntry,
    { maxRounds: 16, reanchor: { x: 250, y: 208 } },
  );
  const duelState = {
    mode: governor.perceive().mode,
    map: governor.perceive().mapName,
    hp: shell2().dataset.hp,
    enemies: shell2().dataset.enemies,
    enemiesAtEntry,
    swingsFired: Number(shell2().dataset.fxSpawned ?? 0) - fxAtEntry,
    aPresses: shell2().dataset.aPresses,
    attackCalls: shell2().dataset.attackCalls,
    dialogueOpen: !!document.querySelector('[data-testid="dialogue-box"]'),
    dialogueText: document.querySelector('[data-testid="dialogue-box"]')?.textContent ?? "",
    pose: shell2().dataset.playerPose,
    x: shell2().dataset.playerX,
    y: shell2().dataset.playerY,
  };
  await page.screenshot({ path: "../../docs/evidence/library-duel-state.png" });
  expect(duelState.mode, `duel state: ${JSON.stringify(duelState)}`).toBe("playing");
  expect(duelState.map, `duel state: ${JSON.stringify(duelState)}`).toBe("Castle Library");
  // first clean clear of a placed miniboss pays a rose
  await expect
    .poll(() => Number(shell2().dataset.roses ?? 0), { timeout: 15_000 })
    .toBeGreaterThan(rosesBeforeBranch);
  // crack the strongbox from the side so the horizontal swing arc covers it
  for (let round = 0; round < 8; round++) {
    await governor.reachPoint(224, 128, { tolerance: 12, maxSteps: 24 }).catch(() => {});
    await governor.hold("right", 200);
    await governor.pressAttack(3);
    if (Number(shell2().dataset.coins ?? 0) >= coinsBeforeBranch + 150) break;
  }
  await expect
    .poll(() => Number(shell2().dataset.coins ?? 0), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(coinsBeforeBranch + 150);
  const libraryShot = await page.screenshot({
    path: "../../docs/evidence/castle-library-shade.png",
  });
  expect(libraryShot).toBeTruthy();

  // back to the hall through the south door — aim deep into the portal zone
  // so reach tolerance can't stop short of its edge
  await governor.reachPoint(320, 368, { tolerance: 10, maxSteps: 56 }).catch(() => {});
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
    if (presses > 0) await governor.pressAttack(presses);
  }
  for (let round = 0; round < 12; round++) {
    await governor.pressAttack(6);
    if (governor.perceive().questText.includes("Free Princess Amber")) break;
    await governor.reachPoint(716, 268, { tolerance: 30, maxSteps: 12 });
  }
  await expect
    .poll(() => governor.perceive().questText, { timeout: 10_000 })
    .toContain("Free Princess Amber");

  // close to within the princess's speak radius before pressing — a loose
  // stop leaves A as a sword swing instead of a greeting
  await governor.convergeAndInteract(788, 264, "kingdom");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("kingdom is saved");
  const hallShot = await page.screenshot({
    path: "../../docs/evidence/castle-hall-rescue.png",
  });
  expect(hallShot).toBeTruthy();

  await governor.press("a");
  await expect.element(page.getByTestId("results-screen")).toBeVisible();
}, 360_000);

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
  await governor.pressAttack(10);
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

it("fields one more orc per warband rank and the bounty pays", async () => {
  await page.viewport(1280, 720);
  await wait(100);

  const { getMap } = await import("../../src/lib/content/registry");
  const { incremental } = await import("../../src/lib/config");
  const authoredEnemies = getMap("map:rescue-route").entities.filter(
    (entity) => entity.enemy && !entity.requiresRoutePack,
  ).length;

  const repository = new MemorySaveRepository();
  await repository.upsertSlot({
    id: 1,
    classId: "knight",
    mapId: "map:rescue-route",
    playerX: 136,
    playerY: 976,
    level: 2,
    hp: 110,
    maxHp: 110,
    questSummary: "The road grows teeth",
    snapshotJson: JSON.stringify({
      coins: 30,
      roses: 0,
      purchasedUpgradeIds: ["upgrade:first-vow", "upgrade:dragon-wake", "upgrade:orc-warband"],
      upgradeRanks: { "upgrade:orc-warband": 1 },
      unlockedClassIds: ["knight"],
      unlockedRoutePackIds: [],
    }),
    updatedAt: new Date("2026-06-12T12:00:00Z"),
  });

  mountApp(repository);
  const governor = new PlayerGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await governor.click("continue-button");
  await expect.poll(() => governor.perceive().mapName, { timeout: 10_000 }).toBe("Rescue Road");

  // the rank survived the save round-trip and the field grew by exactly one
  const shell = () => page.getByTestId("game-shell").element() as HTMLElement;
  expect(shell().dataset.upgradeRanks).toContain("upgrade:orc-warband:1");
  await expect
    .poll(() => Number(shell().dataset.enemies ?? 0), { timeout: 10_000 })
    .toBe(authoredEnemies + 1);

  // the reinforcement spawns beside the first orc on the road: clearing the
  // doubled camp pays the standard kill twice plus the bounty on top
  const coins0 = Number(shell().dataset.coins ?? 0);
  await governor.reachPoint(136, 880, { tolerance: 30, maxSteps: 48 });
  const warbandShot = await page.screenshot({
    path: "../../docs/evidence/warband-reinforced-road.png",
  });
  expect(warbandShot).toBeTruthy();
  // the pair may drift while chasing: re-close on both camp spots each round
  for (let round = 0; round < 12; round++) {
    const target: [number, number] = round % 2 === 0 ? [136, 880] : [156, 880];
    await governor
      .reachPoint(target[0], target[1], { tolerance: 22, maxSteps: 20 })
      .catch(() => {});
    await governor.pressAttack(6);
    if (Number(shell().dataset.enemies ?? 0) <= authoredEnemies - 1) break;
    if (governor.perceive().mode !== "playing") break;
  }
  await expect
    .poll(() => Number(shell().dataset.enemies ?? 0), { timeout: 15_000 })
    .toBeLessThanOrEqual(authoredEnemies - 1);
  const killReward = incremental.runRewards.enemyDefeated.base ?? 0;
  const warbandNode = incremental.upgradeGraph.nodes.find(
    (node) => node.id === "upgrade:orc-warband",
  );
  expect(Number(shell().dataset.coins ?? 0)).toBeGreaterThanOrEqual(
    coins0 + killReward * 2 + (warbandNode?.spawnBounty ?? 0),
  );
}, 240_000);
