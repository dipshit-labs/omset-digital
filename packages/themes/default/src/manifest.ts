import type { ThemeManifestDefinition } from "@repo/theme-core";

import { defineTheme } from "@repo/theme-core";
import { brandingSettings } from "./branding";
import { heroSection } from "./sections/hero";
import { homeTemplate } from "./templates/home";

export const defaultTheme: ThemeManifestDefinition = defineTheme({
  name: "Default Theme",
  description: "Official clean, modern storefront theme for Indonesian SMEs",
  sections: [heroSection],
  settings: brandingSettings,
  slug: "default",
  templates: [homeTemplate],
  version: "1.0.0",
});
