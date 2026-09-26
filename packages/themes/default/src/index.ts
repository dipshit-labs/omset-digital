import { defineTheme } from "@repo/payload-plugin-themes/types";
import type {
  SettingField,
  TemplatePresetDefinition,
  ThemeManifestDefinition,
  ThemeSettingsRecord,
} from "@repo/payload-plugin-themes/types";
import { THEME_CSS_VARIABLES } from "@repo/ui/tokens";
import type { ThemeCssVars } from "@repo/ui/tokens";

import { heroSection } from "./sections/hero";

export { Hero, heroSection, heroSettings } from "./sections/hero";
export type { HeroBulletBlock, HeroSettings } from "./sections/hero";
export type { ThemeCssVars } from "@repo/ui/tokens";

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

export const cssVars = (settings: ThemeSettingsRecord): ThemeCssVars => ({
  [THEME_CSS_VARIABLES.accent]:
    typeof settings.accentColor === "string" ? settings.accentColor : "#3b82f6",
  [THEME_CSS_VARIABLES.background]:
    typeof settings.backgroundColor === "string"
      ? settings.backgroundColor
      : "#ffffff",
  [THEME_CSS_VARIABLES.fontBody]:
    typeof settings.fontBody === "string"
      ? settings.fontBody
      : "var(--font-inter)",
  [THEME_CSS_VARIABLES.fontHeading]:
    typeof settings.fontHeading === "string"
      ? settings.fontHeading
      : "var(--font-plus-jakarta-sans)",
  [THEME_CSS_VARIABLES.foreground]:
    typeof settings.textColor === "string" ? settings.textColor : "#0f172a",
  [THEME_CSS_VARIABLES.primary]:
    typeof settings.primaryColor === "string"
      ? settings.primaryColor
      : "#0f172a",
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
