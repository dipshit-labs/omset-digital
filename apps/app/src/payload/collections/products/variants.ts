import type { CollectionConfig } from "payload";
import { canWrite } from "@/payload/access/canWrite";
import { enforceTenantOnCreate } from "@/payload/hooks/enforceTenantOnCreate";
import { readProductAccess } from "./access/read";
import { inventoryFields } from "./fields/inventory";
import { pricingFields } from "./fields/pricing";
import { shippingFields } from "./fields/shipping";
import { variantOptionsSelectorField } from "./fields/variant-options-selector";
import { generateVariantTitle } from "./hooks/generateVariantTitle";
import { handleVariantShipping } from "./hooks/handleVariantShipping";

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
  hooks: {
    beforeChange: [enforceTenantOnCreate],
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
  hooks: {
    beforeChange: [enforceTenantOnCreate],
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
      relationTo: "media",
      type: "upload",
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
          fields: [...pricingFields()],
          label: "Pricing",
        },
        {
          fields: [...inventoryFields()],
          label: "Inventory",
        },
        {
          fields: [...shippingFields()],
          label: "Shipping",
        },
      ],
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
  ],
  hooks: {
    beforeChange: [
      enforceTenantOnCreate,
      generateVariantTitle,
      handleVariantShipping,
    ],
  },
  versions: {
    drafts: {
      autosave: true,
    },
  },
};
