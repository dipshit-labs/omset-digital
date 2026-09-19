import { type CollectionConfig, slugField } from "payload";
import { canWrite } from "@/payload/access/canWrite";
import { enforceTenantOnCreate } from "@/payload/hooks/enforceTenantOnCreate";
import { readProductAccess } from "./access/read";

// TODO: Add variant fields
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
    defaultColumns: ["title", "variants", "category"],
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

    // ! These fields (price, inventory, shipping) will only be visible only if the product doesn’t have any variants,
    // * since the data model enforce any product to have atleast 1 variant even if the user
    // * doesn’t create it explicitly.
    // ! These fields will also exist in Variants collection, and that will be the sole source of truth.
    {
      label: "Price",
      type: "group",
      virtual: true, // Not sure if this will be applied to the child fields
      fields: [
        {
          label: false,
          name: "price",
          required: true,
          type: "number",
          admin: {
            placeholder: "0.00",
          },
        },
        // * For stuff like compare-at price, unit price, etc
        {
          fields: [],
          label: "Additional display prices",
          type: "collapsible",
        },
      ],
    },

    {
      label: "Inventory",
      type: "group",
      virtual: true,
      fields: [
        // TODO: Add some sort of table field (join) for stock stuff??

        {
          label: "More details",
          type: "collapsible",
          fields: [
            {
              type: "row",
              fields: [
                {
                  label: "SKU (Stock Keeping Unit)",
                  name: "sku",
                  type: "text",
                },
                // ? Not sure we need this or not
                {
                  name: "barcodes",
                  type: "text",
                },
              ],
            },
            // ? Not sure we need this or not
            {
              defaultValue: false,
              label: "Continue selling when out of stock",
              name: "allowBackorder",
              type: "checkbox",
            },
          ],
        },
      ],
    },

    {
      label: "Shipping",
      type: "group",
      virtual: true,
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "package",
              options: ["package1", "package2"],
              type: "select",
            },
            {
              defaultValue: 0.0,
              name: "weight",
              type: "number",
              admin: {
                placeholder: "0.0",
              },
            },
          ],
        },
      ],
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
            defaultColumns: ["options", "_status"],
            disableListColumn: true,
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
    beforeChange: [enforceTenantOnCreate],
  },
  versions: {
    drafts: {
      autosave: true,
    },
  },
};
