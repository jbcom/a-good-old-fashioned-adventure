import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { App } from "../../src/app/App";
import { MemorySaveRepository } from "../../src/persistence/saveRepository";

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
      <App saveRepository={new MemorySaveRepository()} />
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
  await wait(120);
}

async function hold(input: ReturnType<typeof userEvent.setup>, key: string, ms: number) {
  await input.keyboard(`{${key}>}`);
  await wait(ms);
  await input.keyboard(`{/${key}}`);
  await wait(80);
}

async function walkTo(
  input: ReturnType<typeof userEvent.setup>,
  targetX: number,
  targetY: number,
  tolerance = 18,
) {
  for (let i = 0; i < 90; i++) {
    const pos = shell();
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
  for (let i = 0; i < 90; i++) {
    const pos = shell();
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

async function castUntilEnemyDrops(
  input: ReturnType<typeof userEvent.setup>,
  before: number,
  attempts: number,
) {
  await hold(input, "ArrowRight", 90);
  for (let i = 0; i < attempts; i++) {
    await pressA(input);
    await wait(430);
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

async function defeatIfQuestStillNeedsOrcs(
  input: ReturnType<typeof userEvent.setup>,
  standX: number,
  standY: number,
  corpseX: number,
  corpseY: number,
  casts: number,
) {
  if (questText().includes("Return to the Woodcutter")) return;
  await defeatAt(input, standX, standY, corpseX, corpseY, casts);
}

function questText() {
  return page.getByTestId("quest-log").element().textContent ?? "";
}

async function walkRightUntilQuestContains(
  input: ReturnType<typeof userEvent.setup>,
  text: string,
  attempts: number,
) {
  for (let i = 0; i < attempts; i++) {
    if (questText().includes(text)) return;
    await hold(input, "ArrowRight", 450);
    await wait(100);
  }
  const state = shell();
  throw new Error(
    `quest text never reached "${text}"; got "${questText()}"; x=${state.x}; y=${state.y}; hp=${state.hp}`,
  );
}

it("plays the original journey from title to victory through public controls", async () => {
  mountApp();
  const input = userEvent.setup();

  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await userEvent.click(page.getByTestId("new-game-button"));
  await expect.element(page.getByTestId("title-screen")).toBeVisible();
  await input.keyboard("{ArrowRight}");
  await wait(80);
  await input.keyboard("{ArrowRight}");
  await wait(80);
  await input.keyboard("j");
  await expect.element(page.getByTestId("world-stage-shell")).toBeVisible();
  await expect.element(page.getByTestId("dialogue-box")).toBeVisible();
  await pressA(input);

  await walkTo(input, 256, 180);
  await pressA(input);
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Forest Orcs");
  await pressA(input);
  await expect.element(page.getByTestId("quest-log")).toHaveTextContent("Defeat Forest Orcs");

  await defeatIfQuestStillNeedsOrcs(input, 305, 160, 410, 160, 10);
  await defeatIfQuestStillNeedsOrcs(input, 270, 260, 440, 260, 10);
  await defeatIfQuestStillNeedsOrcs(input, 310, 100, 480, 100, 10);
  await defeatIfQuestStillNeedsOrcs(input, 205, 380, 340, 380, 24);
  await expect.element(page.getByTestId("quest-log")).toHaveTextContent("Return to the Woodcutter");

  await walkTo(input, 256, 180);
  await pressA(input);
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("repaired");
  await pressA(input);
  await expect.element(page.getByTestId("quest-log")).toHaveTextContent("Golden Dungeon Key");

  await walkTo(input, 500, 458, 8);
  await walkTo(input, 540, 458, 8);
  await walkTo(input, 575, 640, 22);
  await castUntilEnemyDrops(input, shell().enemies, 18);
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Dungeon Key");
  await pressA(input);
  await walkTo(input, 680, 640, 6);
  await walkRightUntilQuestContains(input, "Castle dungeon gates", 18);

  await walkTo(input, 1040, 392, 22);
  await walkToOrMap(input, 1282, 164, "map:castle-dungeon", 24);
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
  await walkTo(input, 510, 300, 12);
  await castUntilEnemyDrops(input, shell().enemies, 24);
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
}, 300_000);
