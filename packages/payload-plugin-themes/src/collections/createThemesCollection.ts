import type { ThemeManifestDefinition } from "@repo/theme-core";
import type { CollectionConfig, Field } from "payload";

import { buildThemeSettingsFields } from "@/fields/ThemeSettingsFields";
import { enforceSingleLiveTheme } from "@/hooks/enforceSingleLiveTheme";
import type { CreateThemesCollectionOptions } from "@/types";
import { generateThemePreviewPath } from "@/utilities/generateThemePreviewPath";
import { resolveTenantStoreSlug } from "@/utilities/resolveTenantStoreSlug";

export const createThemesCollection = (
  optionsOrManifests: CreateThemesCollectionOptions | ThemeManifestDefinition[]
): CollectionConfig => {
  const options: CreateThemesCollectionOptions = Array.isArray(
    optionsOrManifests
  )
    ? { manifests: optionsOrManifests }
    : optionsOrManifests;

  const manifests = options.manifests ?? [];
  const { tenantField } = options;

  const settingsFields = buildThemeSettingsFields(
    manifests,
    options.defaultMediaSlug
  );
  const fields: Field[] = [
    {
      name: "name",
      required: true,
      type: "text",
      admin: {
        description: "Display name of the theme",
      },
    },
    {
      name: "slug",
      required: true,
      type: "text",
      admin: {
        description: "Unique theme identifier matching the theme package slug",
      },
    },
    {
      name: "version",
      type: "text",
      admin: {
        description: "Installed theme package version",
      },
    },
    {
      defaultValue: false,
      name: "isLive",
      type: "checkbox",
      admin: {
        description: "Set this theme as active for the store",
      },
    },
  ];

  if (settingsFields.length > 0) {
    fields.push({
      fields: settingsFields,
      label: "Theme Settings",
      name: "settings",
      type: "group",
      admin: {
        description: "Branding settings, colors, and typography presets",
      },
    });
  }

  const baseConfig: CollectionConfig = {
    fields,
    slug: options.slug ?? "themes",
    access: {
      create: ({ req }) => Boolean(req.user),
      delete: ({ req }) => Boolean(req.user),
      read: () => true,
      update: ({ req }) => Boolean(req.user),
    },
    admin: {
      defaultColumns: ["name", "slug", "version", "isLive"],
      useAsTitle: "name",
      livePreview: {
        url: async ({ data, req }) => {
          const storeSlug = tenantField
            ? await resolveTenantStoreSlug({
                data,
                req,
                tenantField,
                tenantsSlug: options.tenantsSlug ?? "stores",
              })
            : null;

          return generateThemePreviewPath({
            collection: options.slug ?? "themes",
            previewSecret: options.previewSecret,
            req,
            slug: typeof data?.slug === "string" ? data.slug : undefined,
            storeSlug,
          });
        },
      },
    },
    hooks: {
      beforeChange: [
        enforceSingleLiveTheme(tenantField, options.slug ?? "themes"),
      ],
    },
    versions: {
      maxPerDoc: 50,
      drafts: {
        schedulePublish: true,
        autosave: {
          interval: 100,
        },
      },
    },
  };

  return {
    ...baseConfig,
    ...options.overrides,
    admin: {
      ...baseConfig.admin,
      ...options.overrides?.admin,
      ...(options.overrides?.admin?.livePreview === undefined
        ? {}
        : { livePreview: options.overrides.admin.livePreview }),
    },
    hooks: {
      ...baseConfig.hooks,
      ...options.overrides?.hooks,
      beforeChange: [
        ...(baseConfig.hooks?.beforeChange || []),
        ...(options.overrides?.hooks?.beforeChange || []),
      ],
    },
  };
};
