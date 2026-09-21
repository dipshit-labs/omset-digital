import type { CollectionConfig } from "payload";
import { canWrite } from "@/payload/access/canWrite";
import { enforceTenantOnCreate } from "@/payload/hooks/enforceTenantOnCreate";
import {
  handleDefaultPackageAfterChange,
  handleDefaultPackageBeforeChange,
} from "./hooks/handleDefaultPackage";

export const Packages: CollectionConfig = {
  slug: "packages",
  access: {
    create: canWrite,
    delete: canWrite,
    update: canWrite,
    read: () => true,
  },
  admin: {
    // TODO: Find a way to customize column or a way to display grouped data
    defaultColumns: ["title", "dimensions", "tareWeight", "isDefault"],
    useAsTitle: "title",
  },
  fields: [
    {
      label: "Package name",
      name: "title",
      required: true,
      type: "text",
    },
    {
      type: "row",
      fields: [
        {
          label: false,
          name: "dimensions",
          type: "group",
          admin: {
            width: "60%",
          },
          fields: [
            {
              type: "row",
              fields: [
                {
                  label: "Length (cm)",
                  min: 0.1,
                  name: "length",
                  required: true,
                  type: "number",
                  admin: {
                    placeholder: "0.0",
                  },
                },
                {
                  label: "Width (cm)",
                  min: 0.1,
                  name: "width",
                  required: true,
                  type: "number",
                  admin: {
                    placeholder: "0.0",
                  },
                },
                {
                  label: "Height (cm)",
                  min: 0.1,
                  name: "height",
                  required: true,
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
          label: false,
          name: "tareWeight",
          type: "group",
          fields: [
            {
              type: "row",
              fields: [
                {
                  defaultValue: 0,
                  label: "Weight (Empty)",
                  min: 0,
                  name: "value",
                  required: true,
                  type: "number",
                  admin: {
                    placeholder: "0",
                  },
                },
                {
                  defaultValue: "g",
                  name: "unit",
                  required: true,
                  type: "select",
                  admin: {
                    isClearable: false,
                    width: "20%",
                  },
                  options: [
                    {
                      label: "Gram (g)",
                      value: "g",
                    },
                    {
                      label: "Kilogram (kg)",
                      value: "kg",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      defaultValue: false,
      label: "Use as default package for all products",
      name: "isDefault",
      type: "checkbox",
      admin: {
        description:
          "Used to calculate rates at checkout and pre-selected when buying labels",
      },
    },
  ],
  hooks: {
    afterChange: [handleDefaultPackageAfterChange],
    beforeChange: [enforceTenantOnCreate, handleDefaultPackageBeforeChange],
  },
};
