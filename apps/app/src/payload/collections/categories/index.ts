import type { CollectionConfig } from "payload";

import { canWrite } from "@/payload/access/canWrite";
import { slugField } from "@/payload/fields/slug";
import { enforceStoreOnCreate } from "@/payload/hooks/enforceStoreOnCreate";

export const Categories: CollectionConfig = {
  slug: "categories",
  access: {
    create: canWrite,
    delete: canWrite,
    update: canWrite,
    read: () => true,
  },
  admin: {
    defaultColumns: ["name", "slug", "store"],
    useAsTitle: "name",
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    ...slugField("name"),
    {
      name: "description",
      type: "text",
      required: false,
    },
  ],
  hooks: {
    beforeChange: [enforceStoreOnCreate],
  },
};
