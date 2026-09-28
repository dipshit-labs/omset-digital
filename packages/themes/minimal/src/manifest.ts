import { defineTheme } from "@repo/payload-plugin-themes/types";
import type { ThemeManifestDefinition } from "@repo/payload-plugin-themes/types";

import { brandingSettings } from "./branding";
import { heroSection } from "./sections/hero";
import { homeTemplate } from "./templates/home";

export const minimalTheme: ThemeManifestDefinition = defineTheme({
  name: "Minimal Theme",
  sections: [heroSection],
  settings: brandingSettings,
  slug: "minimal",
  templates: [homeTemplate],
  version: "1.0.0",
  description:
    "Minimalist, typography-focused storefront theme for curated brands",
});
