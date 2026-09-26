import type { Block, CollectionConfig, CollectionSlug, Field } from "payload";

import { manifestToPayloadBlocks } from "../fields/ThemeTemplateField/converter.js";
import type {
  CreateTemplatesCollectionOptions,
  ThemeManifestDefinition,
} from "../types.js";

export type { CreateTemplatesCollectionOptions } from "../types.js";

export const createTemplatesCollection = (
  optionsOrManifests:
    | CreateTemplatesCollectionOptions
    | ThemeManifestDefinition[]
): CollectionConfig => {
  const options = Array.isArray(optionsOrManifests)
    ? { manifests: optionsOrManifests }
    : optionsOrManifests;

  const manifests = options.manifests ?? [];
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
    },
  };

  return {
    ...baseConfig,
    ...options.overrides,
  };
};
