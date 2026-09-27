import type { CollectionConfig, Config, Plugin } from "payload";

import { createTemplatesCollection } from "./collections/createTemplatesCollection";
import { createThemesCollection } from "./collections/createThemesCollection";
import { sanitizePluginConfig } from "./defaults";
import { syncThemes } from "./onInit";
import type { ThemesPluginOptions } from "./types";

const mergeCollectionAdmin = (
  baseAdmin: CollectionConfig["admin"],
  existingAdmin: CollectionConfig["admin"]
): CollectionConfig["admin"] => ({
  ...baseAdmin,
  ...existingAdmin,
  ...(baseAdmin?.livePreview || existingAdmin?.livePreview
    ? {
        livePreview: {
          ...baseAdmin?.livePreview,
          ...existingAdmin?.livePreview,
        },
      }
    : {}),
});

export const themesPlugin =
  (pluginOptions: ThemesPluginOptions): Plugin =>
  (incomingConfig: Config): Config => {
    const options = sanitizePluginConfig(pluginOptions);

    const config: Config = { ...incomingConfig };
    config.collections = config.collections ? [...config.collections] : [];

    const themesCollection = createThemesCollection({
      defaultMediaSlug: options.defaultMediaSlug,
      manifests: options.manifests,
      overrides: options.overrides.themes,
      previewSecret: options.previewSecret,
      slug: options.slugs.themes,
      tenantField: options.tenantField,
      tenantsSlug: options.tenantsSlug,
    });

    const templatesCollection = createTemplatesCollection({
      defaultMediaSlug: options.defaultMediaSlug,
      manifests: options.manifests,
      overrides: options.overrides.templates,
      previewSecret: options.previewSecret,
      slug: options.slugs.templates,
      tenantField: options.tenantField,
      tenantsSlug: options.tenantsSlug,
      themesSlug: options.slugs.themes,
    });

    // Always register collections for DB schema consistency
    const existingThemesIndex = config.collections.findIndex(
      (c) => c.slug === options.slugs.themes
    );

    if (existingThemesIndex === -1) {
      config.collections.push(themesCollection);
    } else {
      const existing = config.collections[existingThemesIndex];
      config.collections[existingThemesIndex] = {
        ...themesCollection,
        ...existing,
        admin: mergeCollectionAdmin(themesCollection.admin, existing.admin),
        fields: [...themesCollection.fields, ...(existing.fields || [])],
        hooks: {
          ...themesCollection.hooks,
          ...existing.hooks,
          beforeChange: [
            ...(themesCollection.hooks?.beforeChange || []),
            ...(existing.hooks?.beforeChange || []),
          ],
        },
      };
    }

    const existingTemplatesIndex = config.collections.findIndex(
      (c) => c.slug === options.slugs.templates
    );

    if (existingTemplatesIndex === -1) {
      config.collections.push(templatesCollection);
    } else {
      const existing = config.collections[existingTemplatesIndex];
      config.collections[existingTemplatesIndex] = {
        ...templatesCollection,
        ...existing,
        admin: mergeCollectionAdmin(templatesCollection.admin, existing.admin),
        fields: [...templatesCollection.fields, ...(existing.fields || [])],
      };
    }

    // If disabled, preserve schema in collections but skip hooks and onInit
    if (options.enabled === false) {
      const themesCol = config.collections.find(
        (c) => c.slug === options.slugs.themes
      );
      if (themesCol?.hooks?.beforeChange) {
        themesCol.hooks.beforeChange = themesCol.hooks.beforeChange.filter(
          (h) =>
            h.name !== "ensureSingleLiveTheme" &&
            h.name !== "deconflictLiveThemes"
        );
      }

      return config;
    }

    const originalOnInit = config.onInit;
    config.onInit = async (payload) => {
      if (typeof originalOnInit === "function") {
        await originalOnInit(payload);
      }

      if (options.autoSync !== false) {
        await syncThemes(payload, {
          defaultStoreData: options.defaultStoreData,
          manifests: options.manifests,
          tenantField: options.tenantField,
          tenantsSlug: options.tenantsSlug,
        });
      }
    };

    return config;
  };
