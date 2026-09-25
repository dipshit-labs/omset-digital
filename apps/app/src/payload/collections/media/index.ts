import type { CollectionConfig } from "payload";
import { canWrite } from "@/payload/access/canWrite";
import { enforceStoreOnCreate } from "@/payload/hooks/enforceStoreOnCreate";

export const Media: CollectionConfig = {
  slug: "media",
  access: {
    create: canWrite,
    delete: canWrite,
    update: canWrite,
    read: () => true,
  },
  admin: {
    useAsTitle: "filename",
  },
  fields: [
    {
      name: "alt",
      required: false,
      type: "text",
    },
  ],
  hooks: {
    beforeChange: [enforceStoreOnCreate],
  },
  upload: {
    staticDir: "media",
  },
};
