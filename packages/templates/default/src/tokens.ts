import type { TemplateTokens } from "@repo/template-contract";

export const defaultTokens: TemplateTokens = {
  accent: "#f1f5f9",
  accentForeground: "#0f172a",
  background: "#ffffff",
  border: "#e2e8f0",
  borderRadius: "md",
  card: "#ffffff",
  cardForeground: "#09090b",
  containerWidth: "normal",
  destructive: "#ef4444",
  destructiveForeground: "#f8fafc",
  foreground: "#09090b",
  input: "#e2e8f0",
  muted: "#f8fafc",
  mutedForeground: "#64748b",
  popover: "#ffffff",
  popoverForeground: "#09090b",
  primary: "#0f172a",
  primaryForeground: "#ffffff",
  ring: "#0f172a",
  secondary: "#f1f5f9",
  secondaryForeground: "#0f172a",
};

const borderRadiusMap: Record<TemplateTokens["borderRadius"], string> = {
  full: "9999px",
  lg: "0.75rem",
  md: "0.5rem",
  none: "0px",
  sm: "0.25rem",
};

const containerWidthMap: Record<TemplateTokens["containerWidth"], string> = {
  full: "100%",
  narrow: "48rem",
  normal: "64rem",
  wide: "80rem",
};

const TEMPLATE_DEFAULT_FONT =
  "var(--font-geist-sans, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)";

export function tokensToCssVars(
  tokens: TemplateTokens
): Record<string, string> {
  const vars: Record<string, string> = {
    "--accent": tokens.accent,
    "--accent-foreground": tokens.accentForeground,
    "--background": tokens.background,
    "--border": tokens.border,
    "--card": tokens.card,
    "--card-foreground": tokens.cardForeground,

    // 2. Compatibility aliases for --color-* in inline styles
    "--color-accent": tokens.accent,
    "--color-background": tokens.background,
    "--color-border": tokens.border,
    "--color-foreground": tokens.foreground,
    "--color-muted": tokens.muted,
    "--color-muted-foreground": tokens.mutedForeground,
    "--color-primary": tokens.primary,
    "--color-primary-foreground": tokens.primaryForeground,
    "--color-secondary": tokens.secondary,
    "--color-secondary-foreground": tokens.secondaryForeground,
    "--color-text": tokens.foreground,

    // 3. Layout & typography variables
    "--container-width": containerWidthMap[tokens.containerWidth] ?? "64rem",
    "--destructive": tokens.destructive,
    "--destructive-foreground": tokens.destructiveForeground,
    "--font-body": TEMPLATE_DEFAULT_FONT,
    "--font-heading": TEMPLATE_DEFAULT_FONT,
    "--foreground": tokens.foreground,
    "--input": tokens.input,
    "--muted": tokens.muted,
    "--muted-foreground": tokens.mutedForeground,
    "--popover": tokens.popover,
    "--popover-foreground": tokens.popoverForeground,
    "--primary": tokens.primary,
    "--primary-foreground": tokens.primaryForeground,
    "--radius": borderRadiusMap[tokens.borderRadius] ?? "0.5rem",
    "--ring": tokens.ring,
    "--secondary": tokens.secondary,
    "--secondary-foreground": tokens.secondaryForeground,
  };

  return vars;
}
