import type { DeviceInfo } from "@capacitor/device";

export type DeviceProfile = "phone" | "tablet" | "desktop";

export interface ViewportInfo {
  width: number;
  height: number;
  devicePixelRatio: number;
  coarsePointer: boolean;
}

export type DeviceInfoLike = Pick<DeviceInfo, "model" | "platform">;

const TABLET_SHORT_EDGE = 700;
const TABLET_LONG_EDGE = 960;

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
