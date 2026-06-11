import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { Stage } from "../../src/render/Stage";
import { buildDemoActors, composeMapSliceCanvas, SLICE_H, SLICE_W } from "../harness/demoScene";

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  root?.unmount();
  container?.remove();
  container = undefined;
});

it("stage renders the HD-2D overworld slice with the full cast", async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  root.render(
    <StrictMode>
      <Stage
        groundCanvas={composeMapSliceCanvas()}
        worldW={SLICE_W}
        worldH={SLICE_H}
        actors={buildDemoActors()}
      />
    </StrictMode>,
  );
  await expect
    .poll(() => container?.querySelector<HTMLCanvasElement>("canvas[data-ready='1']"), {
      timeout: 10_000,
    })
    .toBeTruthy();
  await new Promise((resolve) => setTimeout(resolve, 400));
  const path = await page.screenshot({ path: "stage.png" });
  expect(path).toBeTruthy();
});
