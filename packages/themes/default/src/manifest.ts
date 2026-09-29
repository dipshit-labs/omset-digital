import { defineTheme } from "@repo/theme-core";
import type { ThemeManifestDefinition } from "@repo/theme-core";

import { brandingSettings } from "./branding";
import { heroSection } from "./sections/hero";
import { homeTemplate } from "./templates/home";

export const defaultTheme: ThemeManifestDefinition = defineTheme({
  description: "Official clean, modern storefront theme for Indonesian SMEs",
  name: "Default Theme",
  sections: [heroSection],
  settings: brandingSettings,
  slug: "default",
  templates: [homeTemplate],
  version: "1.0.0",
});
