import { lexicalEditor } from "@payloadcms/richtext-lexical";
import type { CollectionConfig } from "payload";
import { canWrite } from "@/payload/access/canWrite";
import { slugField } from "@/payload/fields/slug";
import { enforceTenantOnCreate } from "@/payload/hooks/enforceTenantOnCreate";
import { readProductAccess } from "./access/read";
import { regenerateVariants } from "./hooks/regenerateVariants";

export const Products: CollectionConfig = {
  slug: "products",
  access: {
    create: canWrite,
    delete: canWrite,
    read: readProductAccess,
    update: canWrite,
  },
  admin: {
    defaultColumns: ["name", "status", "tenant"],
    useAsTitle: "name",
  },
  fields: [
    {
      name: "name",
      required: true,
      type: "text",
    },
    ...slugField("name"),
    {
      editor: lexicalEditor({}),
      name: "description",
      required: false,
      type: "richText",
    },
    {
      hasMany: true,
      name: "images",
      relationTo: "media",
      required: false,
      type: "relationship",
    },
    {
      hasMany: false,
      name: "category",
      relationTo: "categories",
      required: false,
      type: "relationship",
    },
    {
      defaultValue: "draft",
      name: "status",
      required: true,
      type: "select",
      admin: {
        position: "sidebar",
      },
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ],
    },
    // --- Variant builder ---
    {
      label: "Build Variants",
      type: "collapsible",
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: "variantAxes",
          required: false,
          type: "array",
          admin: {
            description:
              "Define variant dimensions (e.g. Color, Size). Leave empty for simple products.",
          },
          fields: [
            {
              type: "row",
              fields: [
                {
                  admin: { placeholder: "e.g. Color" },
                  name: "name",
                  required: true,
                  type: "text",
                },
                {
                  hasMany: true,
                  name: "values",
                  required: true,
                  type: "text",
                  admin: {
                    description:
                      "Press Enter to add each value (e.g. Red, Blue, Green).",
                  },
                },
              ],
            },
          ],
        },
        {
          name: "buildVariantsButton",
          type: "ui",
          admin: {
            components: {
              Field:
                "@/payload/collections/products/components/BuildVariantsButton",
            },
          },
        },
      ],
    },
    // --- Variants ---
    {
      minRows: 1,
      name: "variants",
      required: true,
      type: "array",
      admin: {
        description:
          "Use 'Build Variants' above to generate rows from axes. Each row is one purchasable variant.",
        initCollapsed: true,
        components: {
          RowLabel: "@/payload/collections/products/components/VariantRowLabel",
        },
      },
      fields: [
        {
          name: "options",
          required: false,
          type: "array",
          admin: {
            description:
              "Auto-populated by 'Generate Variants'. Empty for simple products.",
            initCollapsed: true,
            components: {
              RowLabel:
                "@/payload/collections/products/components/VariantRowLabel",
            },
          },
          fields: [
            {
              type: "row",
              fields: [
                {
                  admin: { placeholder: "e.g. Color" },
                  label: "Name",
                  name: "option",
                  required: true,
                  type: "text",
                },
                {
                  admin: { placeholder: "e.g. Red" },
                  name: "value",
                  required: true,
                  type: "text",
                },
              ],
            },
          ],
        },
        {
          type: "row",
          fields: [
            {
              min: 0,
              name: "price",
              required: true,
              type: "number",
              admin: {
                description: "Price in IDR.",
              },
            },
            {
              min: 0,
              name: "stock",
              required: false,
              type: "number",
              admin: {
                description: "Available stock count.",
              },
            },
            {
              min: 0,
              name: "weight",
              required: true,
              type: "number",
              admin: {
                description: "Weight in grams. Required for shipping.",
              },
            },
          ],
        },
        {
          name: "sku",
          required: false,
          type: "text",
          admin: {
            description: "Optional SKU / barcode code.",
          },
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [enforceTenantOnCreate, regenerateVariants],
  },
};
