import type {
  SettingField,
  ThemeManifestDefinition,
  ThemeSettingsRecord,
} from "../types";

export interface EvaluateThemeCssVarsOptions {
  baseTokens?: Record<string, string>;
  manifest?: Pick<ThemeManifestDefinition, "cssVars" | "settings"> | null;
  settings?: ThemeSettingsRecord | null;
}

export const evaluateFieldCssValue = (
  field: SettingField,
  value: unknown
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
  baseTokens,
  manifest,
  settings,
}: EvaluateThemeCssVarsOptions) => {
  const result = { ...baseTokens };
  const fieldList = manifest?.settings ?? [];
  const safeSettings = settings ?? {};

  for (const field of fieldList) {
    if (!field.cssVar) {
      continue;
    }

    const rawValue =
      safeSettings[field.name] ??
      ("defaultValue" in field ? field.defaultValue : undefined);
    const cssValue = evaluateFieldCssValue(field, rawValue);
    if (cssValue !== null) {
      result[field.cssVar] = cssValue;
    }
  }

  if (typeof manifest?.cssVars === "function") {
    const custom = manifest.cssVars(safeSettings);
    Object.assign(result, custom);
  }

  return result;
};
