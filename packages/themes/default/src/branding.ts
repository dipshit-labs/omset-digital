import type { SettingField } from "@repo/theme-core";

import { MERCHANT_THEME_VARIABLES } from "@repo/theme-core";

export const brandingSettings: SettingField[] = [
  {
    name: "primaryColor",
    type: "color",
    cssVar: MERCHANT_THEME_VARIABLES.brand,
    defaultValue: "#0f122a",
    label: "Primary Color",
  },
  {
    name: "accentColor",
    type: "color",
    cssVar: MERCHANT_THEME_VARIABLES.muted,
    defaultValue: "#3b82f6",
    label: "Accent Color",
  },
  {
    name: "backgroundColor",
    type: "color",
    cssVar: MERCHANT_THEME_VARIABLES.background,
    defaultValue: "#ffffff",
    label: "Background Color",
  },
  {
    name: "textColor",
    type: "color",
    cssVar: MERCHANT_THEME_VARIABLES.foreground,
    defaultValue: "#0f172a",
    label: "Text Color",
  },
  {
    name: "fontHeading",
    type: "select",
    cssVar: MERCHANT_THEME_VARIABLES.fontHeading,
    defaultValue: "var(--font-plus-jakarta-sans)",
    label: "Heading Font",
    options: [
      { label: "Plus Jakarta Sans", value: "var(--font-plus-jakarta-sans)" },
      { label: "Inter", value: "var(--font-inter)" },
      { label: "Outfit", value: "var(--font-outfit)" },
    ],
  },
  {
    name: "fontBody",
    type: "select",
    cssVar: MERCHANT_THEME_VARIABLES.fontBody,
    defaultValue: "var(--font-inter)",
    label: "Body Font",
    options: [
      { label: "Inter", value: "var(--font-inter)" },
      { label: "Roboto", value: "var(--font-roboto)" },
    ],
  },
];
