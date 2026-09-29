import type { ThemeManifestDefinition } from "@repo/theme-core";
import type { Block, CollectionConfig, CollectionSlug, Field } from "payload";

import { manifestToPayloadBlocks } from "../fields/ThemeTemplateField/converter";
import type { CreateTemplatesCollectionOptions } from "../types";
import { generateThemePreviewPath } from "../utilities/generateThemePreviewPath";
import { resolveTenantStoreSlug } from "../utilities/resolveTenantStoreSlug";

export type { CreateTemplatesCollectionOptions } from "../types";

export const createTemplatesCollection = (
  optionsOrManifests:
    | CreateTemplatesCollectionOptions
    | ThemeManifestDefinition[]
): CollectionConfig => {
  const options = Array.isArray(optionsOrManifests)
    ? { manifests: optionsOrManifests }
    : optionsOrManifests;

  const manifests = options.manifests ?? [];
  const { tenantField } = options;
  const tenantsSlug = options.tenantsSlug ?? "stores";
  const allBlocks: Block[] = manifests.flatMap((m) =>
    manifestToPayloadBlocks(m, { defaultMediaSlug: options.defaultMediaSlug })
  );

  const sectionsField: Field = {
    blocks: allBlocks,
    label: "Sections",
    name: "sections",
    type: "blocks",
    admin: {
      description: "Ordered sections composing this template layout",
    },
  };

  const fields: Field[] = [
    {
      name: "name",
      required: true,
      type: "text",
      admin: {
        description: "Template display name (e.g. Home, Product Details)",
      },
    },
    {
      defaultValue: "home",
      name: "type",
      required: true,
      type: "select",
      admin: {
        description: "The route type this layout template applies to",
      },
      options: [
        { label: "Home", value: "home" },
        { label: "Product", value: "product" },
        { label: "Collection", value: "collection" },
        { label: "Page", value: "page" },
      ],
    },
    {
      name: "theme",
      // SAFETY: themesSlug dynamically resolves to the configured themes CollectionSlug.
      relationTo: (options.themesSlug ?? "themes") as CollectionSlug,
      required: true,
      type: "relationship",
      admin: {
        description: "Installed theme this template belongs to",
      },
    },
    sectionsField,
  ];

  const baseConfig: CollectionConfig = {
    fields,
    slug: options.slug ?? "templates",
    access: {
      create: ({ req }) => Boolean(req.user),
      delete: ({ req }) => Boolean(req.user),
      read: () => true,
      update: ({ req }) => Boolean(req.user),
    },
    admin: {
      defaultColumns: ["name", "type", "theme"],
      useAsTitle: "name",
      livePreview: {
        url: async ({ data, req }) => {
          const storeSlug = tenantField
            ? await resolveTenantStoreSlug({
                data,
                req,
                tenantField,
                tenantsSlug,
              })
            : null;

          let templatePath = "/";
          const templateType =
            typeof data?.type === "string" ? data.type : "home";

          if (templateType === "home") {
            templatePath = "/";
          } else if (templateType === "product") {
            templatePath = "/products";
          } else if (templateType === "collection") {
            templatePath = "/collections";
          } else if (templateType === "page") {
            const pageSlug =
              typeof data?.slug === "string" ? data.slug : undefined;
            templatePath = pageSlug ? `/${pageSlug}` : "/?templateType=page";
          }

          return generateThemePreviewPath({
            collection: options.slug ?? "templates",
            path: templatePath,
            previewSecret: options.previewSecret,
            req,
            slug: typeof data?.slug === "string" ? data.slug : undefined,
            storeSlug,
          });
        },
      },
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
  };
};
