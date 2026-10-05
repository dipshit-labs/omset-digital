import type { CollectionConfig } from "payload";

import { slugField } from "payload";

import { canWrite } from "@/payload/access/canWrite";
import { seoField } from "@/payload/fields/seo";
import { enforceStoreOnCreate } from "@/payload/hooks/enforceStoreOnCreate";
import { readProductAccess } from "./access/read";
import { productLifecycleHooks } from "./lifecycle";
import { virtualCatalogFields } from "./lifecycle/fields";

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
      type: "text",
      required: true,
    },
    {
      name: "description",
      type: "richText",
      label: false,
      required: false,
    },
    // TODO: create custom component for this since the current UX is so bad
    {
      name: "media",
      type: "array",
      fields: [
        {
          name: "asset",
          type: "upload",
          label: false,
          relationTo: "media",
          required: true,
        },
      ],
    },

    ...virtualCatalogFields,

    {
      type: "group",
      label: "Variants",
      fields: [
        {
          name: "variantTypes",
          type: "relationship",
          hasMany: true,
          label: false,
          relationTo: "variantTypes",
        },
        {
          name: "variants",
          type: "join",
          collection: "variants",
          label: "Available Variants",
          maxDepth: 2,
          on: "product",
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
    seoField(),

    // Sidebar
    slugField(),
    {
      name: "category",
      type: "relationship",
      hasMany: false,
      relationTo: "categories",
      admin: {
        position: "sidebar",
        sortOptions: "name",
      },
    },
    {
      name: "relatedProducts",
      type: "relationship",
      hasMany: true,
      relationTo: "products",
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
      admin: {
        position: "sidebar",
      },
    },
  ],
  hooks: {
    ...productLifecycleHooks,
    beforeChange: [enforceStoreOnCreate, ...productLifecycleHooks.beforeChange],
  },
  versions: {
    drafts: {
      autosave: true,
    },
  },
};
