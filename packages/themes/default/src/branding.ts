import { MERCHANT_THEME_VARIABLES } from "@repo/theme-core";
import type { SettingField } from "@repo/theme-core";

export const brandingSettings: SettingField[] = [
  {
    cssVar: MERCHANT_THEME_VARIABLES.brand,
    defaultValue: "#0f122a",
    label: "Primary Color",
    name: "primaryColor",
    type: "color",
  },
  {
    cssVar: MERCHANT_THEME_VARIABLES.muted,
    defaultValue: "#3b82f6",
    label: "Accent Color",
    name: "accentColor",
    type: "color",
  },
  {
    cssVar: MERCHANT_THEME_VARIABLES.background,
    defaultValue: "#ffffff",
    label: "Background Color",
    name: "backgroundColor",
    type: "color",
  },
  {
    cssVar: MERCHANT_THEME_VARIABLES.foreground,
    defaultValue: "#0f172a",
    label: "Text Color",
    name: "textColor",
    type: "color",
  },
  {
    cssVar: MERCHANT_THEME_VARIABLES.fontHeading,
    defaultValue: "var(--font-plus-jakarta-sans)",
    label: "Heading Font",
    name: "fontHeading",
    type: "select",
    options: [
      { label: "Plus Jakarta Sans", value: "var(--font-plus-jakarta-sans)" },
      { label: "Inter", value: "var(--font-inter)" },
      { label: "Outfit", value: "var(--font-outfit)" },
    ],
  },
  {
    cssVar: MERCHANT_THEME_VARIABLES.fontBody,
    defaultValue: "var(--font-inter)",
    label: "Body Font",
    name: "fontBody",
    type: "select",
    options: [
      { label: "Inter", value: "var(--font-inter)" },
      { label: "Roboto", value: "var(--font-roboto)" },
    ],
  },
];
