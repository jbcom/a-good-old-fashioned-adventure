import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// GPU-enabled Chromium: hardware acceleration stays on even in headless CI runs.
const gpuArgs = ["--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-webgpu"];

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
          browser: {
            enabled: true,
            // Headed locally (real GPU compositing); headless only when CI sets it.
            headless: !!process.env.CI,
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
