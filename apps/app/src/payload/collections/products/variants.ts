import type { CollectionConfig } from "payload";

import { canWrite } from "@/payload/access/canWrite";
import { enforceStoreOnCreate } from "@/payload/hooks/enforceStoreOnCreate";
import { readProductAccess } from "./access/read";
import { inventoryFields } from "./fields/inventory";
import { pricingFields } from "./fields/pricing";
import { shippingFields } from "./fields/shipping";
import { variantOptionsSelectorField } from "./fields/variant-options-selector";
import { variantLifecycleHooks } from "./lifecycle";

export const VariantTypes: CollectionConfig = {
  slug: "variantTypes",
  trash: true,
  access: {
    create: canWrite,
    delete: canWrite,
    update: canWrite,
    read: () => true,
  },
  admin: {
    group: false,
    useAsTitle: "label",
  },
  fields: [
    {
      name: "label",
      type: "text",
      required: true,
    },
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "options",
      type: "join",
      collection: "variantOptions",
      maxDepth: 2,
      on: "variantType",
      orderable: true,
    },
  ],
  hooks: {
    beforeChange: [enforceStoreOnCreate],
  },
};

export const VariantOptions: CollectionConfig = {
  slug: "variantOptions",
  trash: true,
  access: {
    create: canWrite,
    delete: canWrite,
    update: canWrite,
    read: () => true,
  },
  admin: {
    group: false,
    useAsTitle: "label",
  },
  fields: [
    {
      name: "variantType",
      type: "relationship",
      relationTo: "variantTypes",
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: "label",
      type: "text",
      required: true,
    },
    {
      name: "value",
      type: "text",
      required: true,
      admin: {
        description: 'Machine-readable value, such as "small" or "red".',
      },
    },
  ],
  hooks: {
    beforeChange: [enforceStoreOnCreate],
  },
};

// TODO: Sync image to `products` media
export const Variants: CollectionConfig = {
  slug: "variants",
  trash: true,
  access: {
    create: canWrite,
    delete: canWrite,
    read: readProductAccess,
    update: canWrite,
  },
  admin: {
    defaultColumns: ["title", "price", "stock", "weight", "sku", "_status"],
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
      name: "image",
      type: "upload",
      relationTo: "media",
      admin: {
        description:
          "Featured image for this variant. Automatically synced to product gallery.",
      },
    },

    variantOptionsSelectorField(),

    {
      type: "tabs",
      tabs: [
        {
          name: "pricing",
          fields: [...pricingFields()],
          label: "Pricing",
        },
        {
          name: "inventory",
          fields: [...inventoryFields()],
          label: "Inventory",
        },
        {
          name: "shipping",
          fields: [...shippingFields()],
          label: "Shipping",
        },
      ],
    },

    {
      name: "product",
      type: "relationship",
      relationTo: "products",
      required: true,
      admin: {
        position: "sidebar",
        readOnly: true,
      },
    },
  ],
  hooks: {
    ...variantLifecycleHooks,
    beforeChange: [enforceStoreOnCreate, ...variantLifecycleHooks.beforeChange],
  },
  versions: {
    drafts: {
      autosave: true,
    },
  },
};
