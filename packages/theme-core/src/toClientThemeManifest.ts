import type { ThemeClientManifest, ThemeManifestDefinition } from "./types";

export const toClientThemeManifest = (
  manifest?: ThemeManifestDefinition | null
): ThemeClientManifest | undefined => {
  if (!manifest) {
    return undefined;
  }

  return {
    name: manifest.name,
    settings: manifest.settings,
    slug: manifest.slug,
  };
};
