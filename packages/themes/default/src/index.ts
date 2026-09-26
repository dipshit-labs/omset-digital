import { defineTheme } from "@repo/payload-plugin-themes/types";
import type {
  SettingField,
  TemplatePresetDefinition,
  ThemeManifestDefinition,
  ThemeSettingsRecord,
} from "@repo/payload-plugin-themes/types";

import { heroSection } from "./sections/hero";

export { Hero, heroSection, heroSettings } from "./sections/hero";
export type { HeroBulletBlock, HeroSettings } from "./sections/hero";

export const brandingSettings: SettingField[] = [
  {
    defaultValue: "#0f172a",
    label: "Primary Color",
    name: "primaryColor",
    type: "color",
  },
  {
    defaultValue: "#3b82f6",
    label: "Accent Color",
    name: "accentColor",
    type: "color",
  },
  {
    defaultValue: "#ffffff",
    label: "Background Color",
    name: "backgroundColor",
    type: "color",
  },
  {
    defaultValue: "#0f172a",
    label: "Text Color",
    name: "textColor",
    type: "color",
  },
  {
    defaultValue: "plus-jakarta-sans",
    label: "Heading Font",
    name: "fontHeading",
    type: "select",
    options: [
      { label: "Plus Jakarta Sans", value: "plus-jakarta-sans" },
      { label: "Inter", value: "inter" },
      { label: "Outfit", value: "outfit" },
    ],
  },
  {
    defaultValue: "inter",
    label: "Body Font",
    name: "fontBody",
    type: "select",
    options: [
      { label: "Inter", value: "inter" },
      { label: "Roboto", value: "roboto" },
    ],
  },
];

export const homePreset: TemplatePresetDefinition = {
  name: "Home",
  type: "home",
  sections: [
    {
      alignment: "center",
      blockType: "hero",
      heading: "Empower Your Business",
      subheading: "Discover high-quality products curated just for you.",
      blocks: [
        {
          blockType: "bullet",
          icon: "check",
          text: "Verified Indonesian Merchants",
        },
        {
          blockType: "bullet",
          icon: "check",
          text: "Instant WhatsApp Support",
        },
      ],
      cta: {
        label: "Shop Now",
        newTab: false,
        url: "/products",
      },
    },
  ],
};

export type ThemeCssVars = Record<
  | "--color-accent"
  | "--color-background"
  | "--color-primary"
  | "--color-text"
  | "--font-body"
  | "--font-heading",
  string
>;

export const cssVars = (settings: ThemeSettingsRecord): ThemeCssVars => ({
  "--color-accent":
    typeof settings.accentColor === "string" ? settings.accentColor : "#3b82f6",
  "--color-background":
    typeof settings.backgroundColor === "string"
      ? settings.backgroundColor
      : "#ffffff",
  "--color-primary":
    typeof settings.primaryColor === "string"
      ? settings.primaryColor
      : "#0f172a",
  "--color-text":
    typeof settings.textColor === "string" ? settings.textColor : "#0f172a",
  "--font-body":
    typeof settings.fontBody === "string"
      ? settings.fontBody
      : "var(--font-inter)",
  "--font-heading":
    typeof settings.fontHeading === "string"
      ? settings.fontHeading
      : "var(--font-plus-jakarta-sans)",
});

export const defaultTheme: ThemeManifestDefinition = defineTheme({
  cssVars,
  description: "Official clean, modern storefront theme for Indonesian SMEs",
  name: "Default Theme",
  sections: [heroSection],
  settings: brandingSettings,
  slug: "default",
  templates: [homePreset],
  version: "1.0.0",
});

export default defaultTheme;
