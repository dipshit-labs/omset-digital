import { type CollectionConfig, slugField } from "payload";
import { canWrite } from "@/payload/access/canWrite";
import { enforceTenantOnCreate } from "@/payload/hooks/enforceTenantOnCreate";
import { readProductAccess } from "./access/read";
import { inventoryFields } from "./fields/inventory";
import { pricingFields } from "./fields/pricing";
import { shippingFields } from "./fields/shipping";
import { populateDefaultVariantData } from "./hooks/populateDefaultVariantData";
import { syncDefaultVariant } from "./hooks/syncDefaultVariant";

export const Products: CollectionConfig = {
  slug: "products",
  trash: true,
  access: {
    create: canWrite,
    delete: canWrite,
    read: readProductAccess,
    update: canWrite,
  },
  admin: {
    defaultColumns: ["title", "_status", "variants", "category"],
    useAsTitle: "title",
  },
  fields: [
    {
      name: "title",
      required: true,
      type: "text",
    },
    {
      label: false,
      name: "description",
      required: false,
      type: "richText",
    },
    {
      name: "media",
      type: "array",
      fields: [
        {
          label: false,
          name: "asset",
          relationTo: "media",
          required: true,
          type: "upload",
        },
      ],
    },

    {
      label: "Price",
      type: "group",
      virtual: true,
      admin: {
        condition: (data) =>
          !Array.isArray(data?.variantTypes) || data.variantTypes.length === 0,
      },
      fields: [
        ...pricingFields({
          overrides: { priceOverrides: { label: false } },
          virtual: true,
        }),
      ],
    },

    {
      fields: [...inventoryFields({ virtual: true })],
      label: "Inventory",
      type: "group",
      virtual: true,
      admin: {
        condition: (data) =>
          !Array.isArray(data?.variantTypes) || data.variantTypes.length === 0,
      },
    },

    {
      fields: [...shippingFields({ virtual: true })],
      label: "Shipping",
      type: "group",
      virtual: true,
      admin: {
        condition: (data) =>
          !Array.isArray(data?.variantTypes) || data.variantTypes.length === 0,
      },
    },

    {
      label: "Variants",
      type: "group",
      fields: [
        {
          hasMany: true,
          label: false,
          name: "variantTypes",
          relationTo: "variantTypes",
          type: "relationship",
        },
        {
          collection: "variants",
          label: "Available Variants",
          maxDepth: 2,
          name: "variants",
          on: "product",
          type: "join",
          admin: {
            defaultColumns: ["options", "price", "stock", "_status"],
            condition: (data) =>
              !Array.isArray(data?.variantTypes) ||
              data.variantTypes.length > 0,
          },
        },
      ],
    },

    // TODO: Add page sections blocks field in here

    // * Need @payload/plugin-seo installed
    {
      label: "Search engine listing",
      type: "collapsible",
      fields: [
        {
          fields: [],
          label: false,
          name: "meta",
          type: "group",
        },
      ],
    },

    // Sidebar
    slugField(),
    {
      hasMany: false,
      name: "category",
      relationTo: "categories",
      type: "relationship",
      admin: {
        position: "sidebar",
        sortOptions: "name",
      },
    },
    {
      hasMany: true,
      name: "relatedProducts",
      relationTo: "products",
      type: "relationship",
      admin: {
        position: "sidebar",
      },
      filterOptions: ({ id }) => {
        if (id) {
          return {
            id: {
              not_in: [id],
            },
          };
        }

        return {
          id: {
            exists: true,
          },
        };
      },
    },
  ],
  hooks: {
    afterChange: [syncDefaultVariant],
    afterRead: [populateDefaultVariantData],
    beforeChange: [enforceTenantOnCreate],
  },
  versions: {
    drafts: {
      autosave: true,
    },
  },
};
