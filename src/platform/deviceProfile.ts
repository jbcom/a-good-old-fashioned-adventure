import type { DeviceInfo } from "@capacitor/device";

/** Categorization of render budget tier based on device and viewport. */
export type DeviceProfile = "phone" | "tablet" | "desktop";

/** Viewport dimensions and pointer capability. */
export interface ViewportInfo {
  width: number;
  height: number;
  devicePixelRatio: number;
  coarsePointer: boolean;
}

/** Subset of Capacitor DeviceInfo needed for profile classification. */
export type DeviceInfoLike = Pick<DeviceInfo, "model" | "platform">;

const TABLET_SHORT_EDGE = 700;
const TABLET_LONG_EDGE = 960;

/** Extracts viewport dimensions and pointer mode from window; defaults to 1280×720 desktop. */
export function readViewport(win: Window | undefined = globalThis.window): ViewportInfo {
  if (!win) {
    return { width: 1280, height: 720, devicePixelRatio: 1, coarsePointer: false };
  }
  return {
    width: win.innerWidth,
    height: win.innerHeight,
    devicePixelRatio: win.devicePixelRatio || 1,
    coarsePointer: win.matchMedia?.("(pointer: coarse)").matches ?? false,
  };
}

/** Classifies device tier by native platform, viewport size, and pointer capability. */
export function classifyDeviceProfile(
  device: DeviceInfoLike,
  viewport: ViewportInfo,
): DeviceProfile {
  const shortEdge = Math.min(viewport.width, viewport.height);
  const longEdge = Math.max(viewport.width, viewport.height);
  const barCapable = shortEdge >= TABLET_SHORT_EDGE && longEdge >= TABLET_LONG_EDGE;

  if (device.platform === "android" || device.platform === "ios") {
    return barCapable ? "tablet" : "phone";
  }

  if (viewport.coarsePointer) return barCapable ? "tablet" : "phone";
  return shortEdge < 600 ? "phone" : "desktop";
}

/** Queries Capacitor Device API and classifies the profile; falls back to "web" platform on error. */
export async function resolveDeviceProfile(): Promise<DeviceProfile> {
  const viewport = readViewport();
  try {
    const { Device } = await import("@capacitor/device");
    const device = await Device.getInfo();
    return classifyDeviceProfile(device, viewport);
  } catch {
    return classifyDeviceProfile({ platform: "web", model: "browser" }, viewport);
  }
}
