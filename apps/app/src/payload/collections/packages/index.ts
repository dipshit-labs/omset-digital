import type { CollectionConfig } from "payload";

import { canWrite } from "@/payload/access/canWrite";
import { measurementField } from "@/payload/fields/measurement";
import { enforceStoreOnCreate } from "@/payload/hooks/enforceStoreOnCreate";

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
            hideGutter: true,
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
        measurementField({
          label: "Weight (Empty)",
          name: "tareWeight",
          required: true,
          type: "weight",
        }),
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
    beforeChange: [enforceStoreOnCreate, handleDefaultPackageBeforeChange],
  },
};
