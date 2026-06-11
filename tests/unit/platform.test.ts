import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import capacitorConfig from "../../capacitor.config";
import { classifyDeviceProfile } from "../../src/platform/deviceProfile";

describe("Capacitor Android platform contract", () => {
  it("declares the Android app identity and Vite web bundle directory", () => {
    expect(capacitorConfig.appId).toBe("com.jbogaty.goodoldfashionedadventure");
    expect(capacitorConfig.appName).toBe("A Good Old-Fashioned Adventure");
    expect(capacitorConfig.webDir).toBe("dist");
  });

  it("keeps Capacitor sync scripts explicit", () => {
    const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));
    expect(packageJson.scripts["cap:sync"]).toBe("pnpm build && cap sync android");
    expect(packageJson.scripts["cap:run:android"]).toBe("pnpm cap:sync && cap run android");
    expect(packageJson.dependencies["@capacitor/android"]).toBe("8.4.0");
    expect(packageJson.dependencies["@capacitor/device"]).toBe("8.0.2");
    expect(packageJson.devDependencies["@capacitor/cli"]).toBe("8.4.0");
  });

  it("commits the native Android scaffold instead of relying on local generation", () => {
    for (const path of [
      "android/settings.gradle",
      "android/build.gradle",
      "android/app/build.gradle",
      "android/app/src/main/AndroidManifest.xml",
    ]) {
      expect(statSync(resolve(process.cwd(), path)).isFile()).toBe(true);
    }
  });

  it("links AppCompat resource AARs required by Capacitor BridgeActivity themes", () => {
    const appGradle = readFileSync(resolve(process.cwd(), "android/app/build.gradle"), "utf8");
    expect(appGradle).toContain("androidx.appcompat:appcompat:$androidxAppCompatVersion");
    expect(appGradle).toContain("androidx.appcompat:appcompat-resources:$androidxAppCompatVersion");
  });

  it("keeps production Android logging and backup surfaces closed", () => {
    const capacitorSource = readFileSync(resolve(process.cwd(), "capacitor.config.ts"), "utf8");
    const manifest = readFileSync(
      resolve(process.cwd(), "android/app/src/main/AndroidManifest.xml"),
      "utf8",
    );
    expect(capacitorSource).toContain('process.env.NODE_ENV === "production" ? "none" : "debug"');
    expect(capacitorConfig.android?.webContentsDebuggingEnabled).toBe(false);
    expect(manifest).toContain('android:allowBackup="false"');
  });
});

describe("Capacitor device profile", () => {
  it("classifies native phones as compact even when DPR is high", () => {
    expect(
      classifyDeviceProfile(
        { platform: "android", model: "Pixel" },
        { width: 412, height: 915, devicePixelRatio: 2.625, coarsePointer: true },
      ),
    ).toBe("phone");
  });

  it("classifies tablets and unfolded foldables as bar-capable", () => {
    expect(
      classifyDeviceProfile(
        { platform: "android", model: "Pixel Tablet" },
        { width: 900, height: 1400, devicePixelRatio: 2, coarsePointer: true },
      ),
    ).toBe("tablet");
    expect(
      classifyDeviceProfile(
        { platform: "android", model: "Foldable" },
        { width: 720, height: 980, devicePixelRatio: 2, coarsePointer: true },
      ),
    ).toBe("tablet");
  });

  it("keeps desktop browser validation on the full HUD profile", () => {
    expect(
      classifyDeviceProfile(
        { platform: "web", model: "Chromium" },
        { width: 1280, height: 720, devicePixelRatio: 1, coarsePointer: false },
      ),
    ).toBe("desktop");
  });
});
