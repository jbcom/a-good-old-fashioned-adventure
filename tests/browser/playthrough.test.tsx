import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { App } from "../../src/app/App";
import { MemorySaveRepository } from "../../src/persistence/saveRepository";

let container: HTMLDivElement | undefined;
let root: Root | undefined;
let originalBodyStyle = "";
const journeyRepository = new MemorySaveRepository();

afterEach(() => {
  root?.unmount();
  container?.remove();
  document.body.setAttribute("style", originalBodyStyle);
  root = undefined;
  container = undefined;
});

function mountApp() {
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
      <App saveRepository={journeyRepository} />
    </StrictMode>,
  );
}

function shell() {
  const el = page.getByTestId("game-shell").element() as HTMLElement;
  return {
    el,
    mapId: el.dataset.mapId ?? "",
    classId: el.dataset.classId ?? "",
    mode: el.dataset.mode ?? "",
    x: Number(el.dataset.playerX ?? 0),
    y: Number(el.dataset.playerY ?? 0),
    enemies: Number(el.dataset.enemies ?? 0),
    projectiles: Number(el.dataset.projectiles ?? 0),
    hp: Number(el.dataset.hp ?? 0),
  };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function pressA(input = userEvent.setup()) {
  await input.keyboard("j");
  await wait(90);
}

async function hold(input: ReturnType<typeof userEvent.setup>, key: string, ms: number) {
  await input.keyboard(`{${key}>}`);
  await wait(ms);
  await input.keyboard(`{/${key}}`);
  await wait(45);
}

async function walkTo(
  input: ReturnType<typeof userEvent.setup>,
  targetX: number,
  targetY: number,
  tolerance = 18,
) {
  for (let i = 0; i < 55; i++) {
    const pos = shell();
    if (pos.mode !== "playing") {
      throw new Error(
        `walk left play mode=${pos.mode}; target=${targetX},${targetY}; map=${pos.mapId}; x=${pos.x}; y=${pos.y}; hp=${pos.hp}; enemies=${pos.enemies}`,
      );
    }
    const dx = targetX - pos.x;
    const dy = targetY - pos.y;
    if (Math.abs(dx) <= tolerance && Math.abs(dy) <= tolerance) return;
    if (Math.abs(dx) > tolerance) {
      await hold(
        input,
        dx > 0 ? "ArrowRight" : "ArrowLeft",
        Math.min(700, Math.max(100, Math.abs(dx) * 8)),
      );
    }
    if (Math.abs(dy) > tolerance) {
      await hold(
        input,
        dy > 0 ? "ArrowDown" : "ArrowUp",
        Math.min(700, Math.max(100, Math.abs(dy) * 8)),
      );
    }
  }
  const pos = shell();
  throw new Error(
    `failed to walk to ${targetX},${targetY}; ended at ${pos.x},${pos.y}; mode=${pos.mode}; class=${pos.classId}; hp=${pos.hp}; enemies=${pos.enemies}`,
  );
}

async function walkToOrMap(
  input: ReturnType<typeof userEvent.setup>,
  targetX: number,
  targetY: number,
  mapId: string,
  tolerance = 18,
) {
  for (let i = 0; i < 55; i++) {
    const pos = shell();
    if (pos.mode !== "playing") {
      throw new Error(
        `walk-to-map left play mode=${pos.mode}; target=${targetX},${targetY}; wanted=${mapId}; map=${pos.mapId}; x=${pos.x}; y=${pos.y}; hp=${pos.hp}; enemies=${pos.enemies}`,
      );
    }
    if (pos.mapId === mapId) return;
    const dx = targetX - pos.x;
    const dy = targetY - pos.y;
    if (Math.abs(dx) <= tolerance && Math.abs(dy) <= tolerance) {
      await hold(input, "ArrowRight", 180);
      continue;
    }
    if (Math.abs(dx) > tolerance) {
      await hold(
        input,
        dx > 0 ? "ArrowRight" : "ArrowLeft",
        Math.min(700, Math.max(100, Math.abs(dx) * 8)),
      );
    }
    if (Math.abs(dy) > tolerance) {
      await hold(
        input,
        dy > 0 ? "ArrowDown" : "ArrowUp",
        Math.min(700, Math.max(100, Math.abs(dy) * 8)),
      );
    }
  }
  const pos = shell();
  throw new Error(
    `failed to walk to ${targetX},${targetY} or load ${mapId}; ended at ${pos.x},${pos.y}; map=${pos.mapId}; hp=${pos.hp}`,
  );
}

async function holdRightUntilMap(
  input: ReturnType<typeof userEvent.setup>,
  mapId: string,
  maxSteps: number,
  durationMs = 700,
) {
  for (let i = 0; i < maxSteps; i++) {
    const pos = shell();
    if (pos.mode !== "playing") {
      throw new Error(
        `hold-right left play mode=${pos.mode}; wanted=${mapId}; map=${pos.mapId}; x=${pos.x}; y=${pos.y}; hp=${pos.hp}; enemies=${pos.enemies}`,
      );
    }
    if (pos.mapId === mapId) return;
    await hold(input, "ArrowRight", durationMs);
  }
  const pos = shell();
  throw new Error(
    `failed to hold right into ${mapId}; ended at ${pos.x},${pos.y}; map=${pos.mapId}; hp=${pos.hp}`,
  );
}

async function castUntilEnemyDrops(
  input: ReturnType<typeof userEvent.setup>,
  before: number,
  attempts: number,
) {
  await hold(input, "ArrowRight", 90);
  for (let i = 0; i < attempts; i++) {
    await pressA(input);
    await wait(340);
    const state = shell();
    if (state.enemies < before) return;
    if (state.mode !== "playing") {
      throw new Error(
        `combat left play mode=${state.mode}; class=${state.classId}; hp=${state.hp}; enemies=${state.enemies}`,
      );
    }
  }
  const state = shell();
  throw new Error(
    `enemy count did not drop from ${before}; class=${state.classId}; hp=${state.hp}; enemies=${state.enemies}; projectiles=${state.projectiles}`,
  );
}

async function defeatAt(
  input: ReturnType<typeof userEvent.setup>,
  standX: number,
  standY: number,
  corpseX: number,
  corpseY: number,
  casts: number,
) {
  const before = shell().enemies;
  await walkTo(input, standX, standY);
  await castUntilEnemyDrops(input, before, casts);
  await walkTo(input, corpseX, corpseY, 24);
}

it("plays the expanded road from title to the dungeon gate through public controls", async () => {
  mountApp();
  const input = userEvent.setup();

  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await userEvent.click(page.getByTestId("new-game-button"));
  await expect.element(page.getByTestId("title-screen")).toBeVisible();
  await input.keyboard("{ArrowRight}");
  await wait(80);
  await input.keyboard("j");
  await expect.element(page.getByTestId("world-stage-shell")).toBeVisible();
  await expect.poll(() => shell().mapId, { timeout: 10_000 }).toBe("map:village");

  await walkTo(input, 620, 304, 24);
  await pressA(input);
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Page Pip");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Keeper Brindle");
  await pressA(input);

  await walkToOrMap(input, 448, 220, "map:village-shop", 24);
  await expect.poll(() => shell().mapId, { timeout: 10_000 }).toBe("map:village-shop");
  await walkTo(input, 192, 160, 20);
  await pressA(input);
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Keeper Brindle");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("travel cake");
  await pressA(input);

  await walkToOrMap(input, 192, 250, "map:village", 24);
  await expect.poll(() => shell().mapId, { timeout: 10_000 }).toBe("map:village");
  await walkTo(input, 620, 304, 24);
  await pressA(input);
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("proper morning");
  await pressA(input);

  await walkToOrMap(input, 864, 304, "map:oldwood-forest", 24);
  await expect.poll(() => shell().mapId, { timeout: 10_000 }).toBe("map:oldwood-forest");
  await walkTo(input, 392, 292, 20);
  await pressA(input);
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Oldwood Hermit");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("drive two raiders");
  await pressA(input);

  await defeatAt(input, 330, 190, 470, 210, 12);
  await defeatAt(input, 480, 390, 620, 390, 12);
  await expect
    .element(page.getByTestId("quest-log"))
    .toHaveTextContent("Return to the Oldwood Hermit");
  await walkTo(input, 392, 292, 20);
  await pressA(input);
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("branches are quieter");
  await pressA(input);

  await walkToOrMap(input, 1000, 304, "map:deep-forest", 24);
  await expect.poll(() => shell().mapId, { timeout: 10_000 }).toBe("map:deep-forest");
  await walkToOrMap(input, 1068, 304, "map:sunken-road", 24);
  await expect.poll(() => shell().mapId, { timeout: 10_000 }).toBe("map:sunken-road");
  await expect.element(page.getByTestId("quest-log")).toHaveTextContent("Sunken Road");

  await hold(input, "ArrowRight", 1200);
  await castUntilEnemyDrops(input, shell().enemies, 30);
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Dungeon Key");
  await pressA(input);
  await hold(input, "ArrowRight", 1600);
  await expect.element(page.getByTestId("quest-log")).toHaveTextContent("Castle dungeon gates");

  await holdRightUntilMap(input, "map:castle-approach", 10);
  await expect.poll(() => shell().mapId, { timeout: 10_000 }).toBe("map:castle-approach");
  await walkToOrMap(input, 930, 210, "map:castle-yard", 28);
  await expect.poll(() => shell().mapId, { timeout: 10_000 }).toBe("map:castle-yard");
  await expect.element(page.getByTestId("quest-log")).toHaveTextContent("castle scribe");

  await walkToOrMap(input, 744, 272, "map:castle-hall", 28);
  await expect.poll(() => shell().mapId, { timeout: 10_000 }).toBe("map:castle-hall");
  await walkTo(input, 220, 272, 20);
  expect(await page.screenshot({ path: "playthrough-castle-hall.png" })).toBeTruthy();
  await pressA(input);
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Castle Scribe");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("library");
  await pressA(input);
  await expect.element(page.getByTestId("quest-log")).toHaveTextContent("library archive");

  await walkToOrMap(input, 320, 118, "map:castle-library", 26);
  await expect.poll(() => shell().mapId, { timeout: 10_000 }).toBe("map:castle-library");
  expect(await page.screenshot({ path: "playthrough-castle-library.png" })).toBeTruthy();
  await walkTo(input, 320, 132, 20);
  await expect.element(page.getByTestId("quest-log")).toHaveTextContent("armory standard");
  await walkToOrMap(input, 320, 350, "map:castle-hall", 26);
  await expect.poll(() => shell().mapId, { timeout: 10_000 }).toBe("map:castle-hall");

  await walkToOrMap(input, 500, 430, "map:castle-armory", 26);
  await expect.poll(() => shell().mapId, { timeout: 10_000 }).toBe("map:castle-armory");
  await walkTo(input, 256, 232, 20);
  await expect
    .element(page.getByTestId("quest-log"))
    .toHaveTextContent("Return to the castle scribe");
  await walkToOrMap(input, 256, 40, "map:castle-hall", 26);
  await expect.poll(() => shell().mapId, { timeout: 10_000 }).toBe("map:castle-hall");

  await walkTo(input, 220, 272, 20);
  await pressA(input);
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("seal is remembered");
  await pressA(input);
  await walkToOrMap(input, 860, 272, "map:castle-dungeon", 28);
  await expect.poll(() => shell().mapId, { timeout: 10_000 }).toBe("map:castle-dungeon");
  await expect.element(page.getByTestId("dialogue-box")).toBeVisible();
  await pressA(input);

  await expect
    .poll(async () => (await journeyRepository.latestSlot())?.mapId, { timeout: 5_000 })
    .toBe("map:castle-dungeon");
}, 210_000);

it("continues the expanded journey through dungeon victory through public controls", async () => {
  mountApp();
  const input = userEvent.setup();

  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await userEvent.click(page.getByTestId("continue-button"));
  await expect.poll(() => shell().mapId, { timeout: 10_000 }).toBe("map:castle-dungeon");
  await expect.element(page.getByTestId("dialogue-box")).toBeVisible();
  await pressA(input);

  await castUntilEnemyDrops(input, shell().enemies, 16);
  await castUntilEnemyDrops(input, shell().enemies, 16);
  await walkTo(input, 250, 266, 8);
  await castUntilEnemyDrops(input, shell().enemies, 16);
  if (shell().enemies > 1) {
    await walkTo(input, 305, 266, 12);
    await castUntilEnemyDrops(input, shell().enemies, 18);
  }
  await walkTo(input, 305, 300, 12);
  await walkTo(input, 500, 250, 12);
  await castUntilEnemyDrops(input, shell().enemies, 34);
  await expect.element(page.getByTestId("quest-log")).toHaveTextContent("Free Princess Amber");
  await userEvent.click(page.getByTestId("hud-menu"));
  await expect.element(page.getByTestId("minimap")).toBeVisible();
  await walkTo(input, 740, 250, 20);
  await pressA(input);
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("kingdom is saved");
  await pressA(input);

  await expect.element(page.getByTestId("victory-screen")).toBeVisible();
  await expect.element(page.getByTestId("audio-state")).toHaveTextContent("Tone");
  const path = await page.screenshot({ path: "playthrough-victory.png" });
  expect(path).toBeTruthy();
}, 210_000);
