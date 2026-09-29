import { DEFAULT_THEME_TOKENS } from "../tokens";
import type { ThemeCssVars } from "../tokens";
import type {
  SettingField,
  ThemeManifestDefinition,
  ThemeSettingsRecord,
} from "../types";
import { deriveBrandRamp } from "./color";

export type ThemeMode = "light" | "dark";

export interface EvaluateThemeCssVarsOptions {
  baseTokens?: Record<string, string>;
  manifest?: Pick<ThemeManifestDefinition, "settings"> | null;
  mode?: ThemeMode;
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

const hasValue = (val: unknown): boolean =>
  val !== undefined && val !== null && val !== "";

const getExplicitBrandForeground = (
  safeSettings: ThemeSettingsRecord,
  fieldList: SettingField[]
): string | null => {
  if (hasValue(safeSettings.brandForeground)) {
    return String(safeSettings.brandForeground);
  }

  const brandFgField = fieldList.find(
    (f) => f.cssVar === "--theme-brand-foreground"
  );
  if (brandFgField) {
    const val = safeSettings[brandFgField.name];
    if (hasValue(val)) {
      return String(val);
    }
  }

  return null;
};

const applyBrandRamp = (
  result: ThemeCssVars,
  rawBrand: string,
  mode: ThemeMode,
  safeSettings: ThemeSettingsRecord,
  fieldList: SettingField[]
): void => {
  const ramp = deriveBrandRamp(rawBrand, { mode });

  result["--theme-brand"] = ramp.brand;
  result["--theme-brand-hover"] = ramp.brandHover;
  result["--theme-brand-subtle"] = ramp.brandSubtle;
  result["--theme-brand-subtle-foreground"] = ramp.brandSubtleForeground;
  result["--theme-brand-srgb"] = ramp.brandSrgb;

  const explicitForeground = getExplicitBrandForeground(
    safeSettings,
    fieldList
  );
  result["--theme-brand-foreground"] =
    explicitForeground ?? ramp.brandForeground;
};

export const evaluateThemeCssVars = ({
  baseTokens = DEFAULT_THEME_TOKENS,
  manifest,
  mode: explicitMode,
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
    const hasSettingValue = hasValue(settingValue);

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

  const mode: ThemeMode =
    explicitMode ??
    (safeSettings.mode === "dark" || safeSettings.storeMode === "dark"
      ? "dark"
      : "light");

  const rawBrand = hasValue(safeSettings.brand)
    ? String(safeSettings.brand)
    : result["--theme-brand"];

  if (rawBrand) {
    applyBrandRamp(result, rawBrand, mode, safeSettings, fieldList);
  }

  return result;
};
