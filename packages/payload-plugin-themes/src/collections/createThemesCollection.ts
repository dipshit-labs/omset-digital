import type { CollectionConfig, Field } from "payload";

import { buildThemeSettingsFields } from "../fields/buildThemeSettingsFields.js";
import { enforceSingleLiveTheme } from "../hooks/enforceSingleLiveTheme.js";
import type {
  CreateThemesCollectionOptions,
  ThemeManifestDefinition,
} from "../types.js";

export { enforceSingleLiveTheme as createEnsureSingleLiveThemeHook } from "../hooks/enforceSingleLiveTheme.js";
export type { CreateThemesCollectionOptions } from "../types.js";

export const createThemesCollection = (
  optionsOrManifests: CreateThemesCollectionOptions | ThemeManifestDefinition[]
): CollectionConfig => {
  const options: CreateThemesCollectionOptions = Array.isArray(
    optionsOrManifests
  )
    ? { manifests: optionsOrManifests }
    : optionsOrManifests;

  const manifests = options.manifests ?? [];
  const tenantField = options.tenantField ?? "store";

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
    },
    hooks: {
      beforeChange: [
        enforceSingleLiveTheme(tenantField, options.slug ?? "themes"),
      ],
    },
  };

  return {
    ...baseConfig,
    ...options.overrides,
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
