import type { ThemeCssVars } from "../tokens";
import type {
  SettingField,
  ThemeManifestDefinition,
  ThemeSettingsRecord,
} from "../types";

import { DEFAULT_THEME_TOKENS } from "../tokens";

export interface EvaluateThemeCssVarsOptions {
  baseTokens?: Record<string, string>;
  manifest?: Pick<ThemeManifestDefinition, "settings"> | null;
  settings?: ThemeSettingsRecord | null;
}

export const evaluateFieldCssValue = (
  field: SettingField,
  value?: unknown
): string | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (field.type === "number" && field.unit) {
    return `${value}${field.unit}`;
  }

  return String(value);
};

export const evaluateThemeCssVars = ({
  baseTokens = DEFAULT_THEME_TOKENS,
  manifest,
  settings,
}: EvaluateThemeCssVarsOptions = {}): ThemeCssVars => {
  const result: ThemeCssVars = { ...baseTokens };
  const fieldList = manifest?.settings ?? [];
  const safeSettings = settings ?? {};

  for (const field of fieldList) {
    if (!field.cssVar) {
      continue;
    }

    const settingValue = safeSettings[field.name];
    const hasSettingValue =
      settingValue !== undefined &&
      settingValue !== null &&
      settingValue !== "";

    let rawValue: unknown;
    if (hasSettingValue) {
      rawValue = settingValue;
    } else if ("defaultValue" in field) {
      rawValue = field.defaultValue;
    }

    const cssValue = evaluateFieldCssValue(field, rawValue);
    if (cssValue !== null) {
      result[field.cssVar] = cssValue;
    }
  }

  return result;
};
