import type {
  SanitizedThemesPluginOptions,
  ThemesPluginOptions,
} from "./types";

export const defaultPluginOptions = {
  autoSync: true,
  defaultMediaSlug: "media",
  enabled: true,
  slugs: {
    templates: "templates",
    themes: "themes",
  },
} as const;

export const sanitizePluginConfig = (
  options: ThemesPluginOptions
): SanitizedThemesPluginOptions => {
  const defaultMediaSlug =
    options.defaultMediaSlug ?? defaultPluginOptions.defaultMediaSlug;
  const templatesSlug =
    options.slugs?.templates ?? defaultPluginOptions.slugs.templates;
  const themesSlug = options.slugs?.themes ?? defaultPluginOptions.slugs.themes;

  return {
    autoSync: options.autoSync ?? defaultPluginOptions.autoSync,
    defaultMediaSlug,
    enabled: options.enabled ?? defaultPluginOptions.enabled,
    manifests: options.manifests ?? [],
    overrides: options.overrides ?? {},
    previewSecret: options.previewSecret,
    tenantField: options.tenantField,
    tenantsSlug: options.tenantsSlug,
    slugs: {
      templates: templatesSlug,
      themes: themesSlug,
    },
  };
};
