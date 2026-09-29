import type { ThemeManifestDefinition } from "@repo/theme-core/types";
import { defaultTheme } from "@repo/theme-default";
import { minimalTheme } from "@repo/theme-minimal";

const THEME_MANIFESTS = {
  [defaultTheme.slug]: defaultTheme,
  [minimalTheme.slug]: minimalTheme,
} satisfies Record<string, ThemeManifestDefinition>;

export const getThemeManifest = (
  slug: string
): ThemeManifestDefinition | undefined => THEME_MANIFESTS[slug];
