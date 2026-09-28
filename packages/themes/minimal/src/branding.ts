import type { SettingField } from "@repo/payload-plugin-themes/types";

export const brandingSettings: SettingField[] = [
  {
    cssVar: "--primary",
    defaultValue: "#18181b",
    label: "Primary Color",
    name: "primaryColor",
    type: "color",
  },
  {
    cssVar: "--accent",
    defaultValue: "#71717a",
    label: "Accent Color",
    name: "accentColor",
    type: "color",
  },
  {
    cssVar: "--background",
    defaultValue: "#fafafa",
    label: "Background Color",
    name: "backgroundColor",
    type: "color",
  },
  {
    cssVar: "--foreground",
    defaultValue: "#18181b",
    label: "Text Color",
    name: "textColor",
    type: "color",
  },
  {
    cssVar: "--font-template-heading",
    defaultValue: "var(--font-inter)",
    label: "Heading Font",
    name: "fontHeading",
    type: "select",
    options: [
      { label: "Inter", value: "var(--font-inter)" },
      { label: "Plus Jakarta Sans", value: "var(--font-plus-jakarta-sans)" },
      { label: "Outfit", value: "var(--font-outfit)" },
    ],
  },
  {
    cssVar: "--font-template-body",
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
