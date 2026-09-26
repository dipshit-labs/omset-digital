import type { ThemeManifestDefinition, ThemeSettingsRecord } from "../types.js";

export const extractDefaultSettings = (
  manifest: ThemeManifestDefinition
): ThemeSettingsRecord => {
  const defaultSettings: ThemeSettingsRecord = {};

  if (manifest.settings) {
    for (const s of manifest.settings) {
      if ("defaultValue" in s && s.defaultValue !== undefined) {
        // SAFETY: Invariant guaranteed by SettingField definition where defaultValue matches field type.
        defaultSettings[s.name] = s.defaultValue as never;
      }
    }
  }

  return defaultSettings;
};
