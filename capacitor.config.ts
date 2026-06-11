import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jbogaty.goodoldfashionedadventure",
  appName: "A Good Old-Fashioned Adventure",
  webDir: "dist",
  backgroundColor: "#17110b",
  loggingBehavior: "debug",
  android: {
    path: "android",
    backgroundColor: "#17110b",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
