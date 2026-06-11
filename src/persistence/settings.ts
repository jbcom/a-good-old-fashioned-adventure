import { Preferences } from "@capacitor/preferences";

const SETTINGS_KEY = "agofa:settings";

export interface GameSettings {
  muted: boolean;
  textSpeed: "quick" | "measured";
}

export const DEFAULT_SETTINGS: GameSettings = {
  muted: false,
  textSpeed: "measured",
};

export async function loadSettings(): Promise<GameSettings> {
  const result = await Preferences.get({ key: SETTINGS_KEY });
  if (!result.value) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(result.value) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: GameSettings): Promise<void> {
  await Preferences.set({ key: SETTINGS_KEY, value: JSON.stringify(settings) });
}
