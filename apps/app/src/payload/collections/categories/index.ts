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
    beforeChange: [enforceStoreOnCreate],
  },
};
