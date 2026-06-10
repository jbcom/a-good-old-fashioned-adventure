import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { App } from "../../src/app/App";

let container: HTMLDivElement | undefined;

afterEach(() => {
  container?.remove();
  container = undefined;
});

it("boots the app shell in a real browser", async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  await expect.poll(() => container?.textContent).toContain("A GOOD OLD FASHIONED ADVENTURE");
});

it("runs with GPU-backed WebGL2 (not software fallback)", () => {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2");
  expect(gl, "webgl2 context must exist").toBeTruthy();
  const debugInfo = gl?.getExtension("WEBGL_debug_renderer_info");
  const renderer = debugInfo
    ? (gl?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string)
    : "unknown";
  // SwiftShader is Chrome's software rasterizer — its presence means no GPU.
  expect(renderer.toLowerCase()).not.toContain("swiftshader");
});
