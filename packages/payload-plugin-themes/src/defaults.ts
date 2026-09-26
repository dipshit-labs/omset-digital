import type {
  SanitizedThemesPluginOptions,
  ThemesPluginOptions,
} from "./types";

export const defaultPluginOptions = {
  autoSync: true,
  defaultMediaSlug: "media",
  enabled: true,
  tenantField: "store",
  tenantsSlug: "stores",
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
  const tenantField = options.tenantField ?? defaultPluginOptions.tenantField;
  const tenantsSlug = options.tenantsSlug ?? defaultPluginOptions.tenantsSlug;

  return {
    autoSync: options.autoSync ?? defaultPluginOptions.autoSync,
    defaultMediaSlug,
    defaultStoreData: options.defaultStoreData,
    enabled: options.enabled ?? defaultPluginOptions.enabled,
    manifests: options.manifests ?? [],
    overrides: options.overrides ?? {},
    tenantField,
    tenantsSlug,
    slugs: {
      templates: templatesSlug,
      themes: themesSlug,
    },
  };
};
