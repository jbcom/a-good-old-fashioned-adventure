import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// GPU-enabled Chromium: hardware acceleration stays on; CI can force headed
// mode on runners with a real compositor via VITEST_BROWSER_HEADLESS=false.
const gpuArgs = ["--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-webgpu"];
const browserHeadless = process.env.VITEST_BROWSER_HEADLESS === "false" ? false : !!process.env.CI;

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        plugins: [react()],
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        plugins: [react()],
        test: {
          name: "browser",
          include: ["tests/browser/**/*.test.{ts,tsx}"],
          // Public-control browser specs share global keyboard/audio/browser state.
          // Keep files serialized even when the provider supports parallel pages.
          fileParallelism: false,
          browser: {
            enabled: true,
            // Headed locally and in macOS CI; Linux headless runners can fall back to SwiftShader.
            headless: browserHeadless,
            fileParallelism: false,
            provider: playwright({
              launchOptions: { args: gpuArgs },
            }),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
