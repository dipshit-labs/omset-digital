import type { CollectionConfig } from "payload";
import { canWrite } from "@/payload/access/canWrite";
import { enforceTenantOnCreate } from "@/payload/hooks/enforceTenantOnCreate";

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
    beforeChange: [enforceTenantOnCreate],
  },
  upload: {
    staticDir: "media",
  },
};
