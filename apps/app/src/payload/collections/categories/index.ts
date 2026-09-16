import type { CollectionConfig } from "payload";
import { canWrite } from "@/payload/access/canWrite";
import { slugField } from "@/payload/fields/slug";
import { enforceTenantOnCreate } from "@/payload/hooks/enforceTenantOnCreate";

export const Categories: CollectionConfig = {
  slug: "categories",
  access: {
    create: canWrite,
    delete: canWrite,
    update: canWrite,
    read: () => true,
  },
  admin: {
    defaultColumns: ["name", "slug", "tenant"],
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
      name: "description",
      required: false,
      type: "text",
    },
  ],
  hooks: {
    beforeChange: [enforceTenantOnCreate],
  },
};
