export const THEME_CSS_VARIABLES = {
  accent: "--accent",
  background: "--background",
  fontBody: "--font-template-body",
  fontHeading: "--font-template-heading",
  foreground: "--foreground",
  primary: "--primary",
} as const;

export const THEME_CSS_VARIABLE_KEYS = [
  THEME_CSS_VARIABLES.background,
  THEME_CSS_VARIABLES.foreground,
  THEME_CSS_VARIABLES.primary,
  THEME_CSS_VARIABLES.accent,
  THEME_CSS_VARIABLES.fontHeading,
  THEME_CSS_VARIABLES.fontBody,
] as const;

export type ThemeCssVariable = (typeof THEME_CSS_VARIABLE_KEYS)[number];

export type ThemeCssVars = Record<ThemeCssVariable, string>;

export const DEFAULT_THEME_SETTING_MAPPINGS = {
  accentColor: THEME_CSS_VARIABLES.accent,
  backgroundColor: THEME_CSS_VARIABLES.background,
  fontBody: THEME_CSS_VARIABLES.fontBody,
  fontHeading: THEME_CSS_VARIABLES.fontHeading,
  primaryColor: THEME_CSS_VARIABLES.primary,
  textColor: THEME_CSS_VARIABLES.foreground,
} as const;

export type ThemeSettingKey = keyof typeof DEFAULT_THEME_SETTING_MAPPINGS;

export const DEFAULT_THEME_TOKENS: ThemeCssVars = {
  [THEME_CSS_VARIABLES.accent]: "oklch(0.949 0 0)",
  [THEME_CSS_VARIABLES.background]: "oklch(1 0 0)",
  [THEME_CSS_VARIABLES.fontBody]: "sans-serif",
  [THEME_CSS_VARIABLES.fontHeading]: "sans-serif",
  [THEME_CSS_VARIABLES.foreground]: "oklch(0.21 0.031 264.664)",
  [THEME_CSS_VARIABLES.primary]: "oklch(0.671 0.136 48.513)",
};
