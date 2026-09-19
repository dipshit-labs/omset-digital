import type { CollectionConfig } from "payload";
import { variantOptionsSelectorField } from "./fields/variant-options-selector";
import { generateVariantTitle } from "./hooks/generateVariantTitle";

export const VariantTypes: CollectionConfig = {
  slug: "variantTypes",
  trash: true,
  admin: {
    group: false,
    useAsTitle: "label",
  },
  fields: [
    {
      name: "label",
      required: true,
      type: "text",
    },
    {
      name: "name",
      required: true,
      type: "text",
    },
    {
      collection: "variantOptions",
      maxDepth: 2,
      name: "options",
      on: "variantType",
      orderable: true,
      type: "join",
    },
  ],
};

export const VariantOptions: CollectionConfig = {
  slug: "variantOptions",
  trash: true,
  admin: {
    group: false,
    useAsTitle: "label",
  },
  fields: [
    {
      name: "variantType",
      relationTo: "variantTypes",
      required: true,
      type: "relationship",
      admin: {
        readOnly: true,
      },
    },
    {
      name: "label",
      required: true,
      type: "text",
    },
    {
      name: "value",
      required: true,
      type: "text",
      admin: {
        description: 'Machine-readable value, such as "small" or "red".',
      },
    },
  ],
};

export const Variants: CollectionConfig = {
  slug: "variants",
  trash: true,
  admin: {
    group: false,
    useAsTitle: "title",
  },
  fields: [
    {
      name: "title",
      type: "text",
      admin: {
        description: "Generated administrative title, such as Small / Red.",
        readOnly: true,
      },
    },
    {
      name: "product",
      relationTo: "products",
      required: true,
      type: "relationship",
      admin: {
        position: "sidebar",
        readOnly: true,
      },
    },
    variantOptionsSelectorField(),
  ],
  hooks: {
    beforeChange: [generateVariantTitle],
  },
  versions: {
    drafts: {
      autosave: true,
    },
  },
};
