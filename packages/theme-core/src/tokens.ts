export const MERCHANT_THEME_VARIABLES = {
  background: "--theme-background",
  border: "--theme-border",
  brand: "--theme-brand",
  brandForeground: "--theme-brand-foreground",
  fontBody: "--theme-font-body",
  fontHeading: "--theme-font-heading",
  foreground: "--theme-foreground",
  muted: "--theme-muted",
  mutedForeground: "--theme-muted-foreground",
  radius: "--theme-radius",
  surface: "--theme-surface",
} as const;

export const FIXED_THEME_VARIABLES = {
  error: "--theme-error",
  errorForeground: "--theme-error-foreground",
  radiusFull: "--theme-radius-full",
  radiusLg: "--theme-radius-lg",
  radiusMd: "--theme-radius-md",
  radiusSm: "--theme-radius-sm",
  success: "--theme-success",
  successForeground: "--theme-success-foreground",
  warning: "--theme-warning",
  warningForeground: "--theme-warning-foreground",
} as const;

export const THEME_VARIABLES = {
  ...MERCHANT_THEME_VARIABLES,
  ...FIXED_THEME_VARIABLES,
} as const;

export const THEME_CSS_VARIABLES = THEME_VARIABLES;

export type MerchantThemeVariable =
  (typeof MERCHANT_THEME_VARIABLES)[keyof typeof MERCHANT_THEME_VARIABLES];

export type FixedThemeVariable =
  (typeof FIXED_THEME_VARIABLES)[keyof typeof FIXED_THEME_VARIABLES];

export type ThemeVariable = MerchantThemeVariable | FixedThemeVariable;

export type ThemeCssVariable = ThemeVariable;

export type ThemeCssVars = Record<string, string>;

export const calculateDerivedRadii = (
  baseRadius = "var(--theme-radius)"
): Record<
  | typeof FIXED_THEME_VARIABLES.radiusFull
  | typeof FIXED_THEME_VARIABLES.radiusLg
  | typeof FIXED_THEME_VARIABLES.radiusMd
  | typeof FIXED_THEME_VARIABLES.radiusSm,
  string
> => ({
  "--theme-radius-full": "9999px",
  "--theme-radius-lg": `calc(${baseRadius} * 1.5)`,
  "--theme-radius-md": baseRadius,
  "--theme-radius-sm": `calc(${baseRadius} * 0.75)`,
});

export const DEFAULT_MERCHANT_TOKENS = {
  "--theme-background": "#ffffff",
  "--theme-border": "#e2e8f0",
  "--theme-brand": "#0f172a",
  "--theme-brand-foreground": "#ffffff",
  "--theme-font-body": "sans-serif",
  "--theme-font-heading": "sans-serif",
  "--theme-foreground": "#0f172a",
  "--theme-muted": "#f1f5f9",
  "--theme-muted-foreground": "#64748b",
  "--theme-radius": "0.5rem",
  "--theme-surface": "#ffffff",
} as const satisfies Record<MerchantThemeVariable, string>;

export const FIXED_THEME_TOKENS = {
  "--theme-error": "oklch(0.636 0.207 25.3)",
  "--theme-error-foreground": "#ffffff",
  "--theme-success": "oklch(0.623 0.188 145.2)",
  "--theme-success-foreground": "#ffffff",
  "--theme-warning": "oklch(0.769 0.188 70.1)",
  "--theme-warning-foreground": "#0f172a",
  ...calculateDerivedRadii("var(--theme-radius)"),
} as const satisfies Record<FixedThemeVariable, string>;

export const DEFAULT_THEME_TOKENS = {
  ...DEFAULT_MERCHANT_TOKENS,
  ...FIXED_THEME_TOKENS,
} as const satisfies Record<ThemeVariable, string>;

export type ThemeTokens = typeof DEFAULT_THEME_TOKENS;
