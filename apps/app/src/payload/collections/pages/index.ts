import { themeTemplateField } from "@repo/payload-plugin-themes/fields";
import {
  generateThemePreviewPath,
  resolveTenantStoreSlug,
} from "@repo/payload-plugin-themes/utilities";
import type { CollectionConfig } from "payload";
import { slugField } from "payload";

import { env } from "@/env";
import { canWrite } from "@/payload/access/canWrite";
import { enforceStoreOnCreate } from "@/payload/hooks/enforceStoreOnCreate";

import { readPageAccess } from "./access/read";

export const Pages: CollectionConfig = {
  slug: "pages",
  access: {
    create: canWrite,
    delete: canWrite,
    read: readPageAccess,
    update: canWrite,
  },
  admin: {
    defaultColumns: ["title", "slug", "template", "_status"],
    useAsTitle: "title",
    livePreview: {
      url: async ({ data, req }) => {
        const storeSlug = await resolveTenantStoreSlug({
          data,
          req,
          tenantField: "store",
          tenantsSlug: "stores",
        });

        return generateThemePreviewPath({
          collection: "pages",
          previewSecret: env.PREVIEW_SECRET,
          req,
          slug: typeof data?.slug === "string" ? data.slug : undefined,
          storeSlug,
        });
      },
    },
  },
  fields: [
    {
      name: "title",
      required: true,
      type: "text",
    },
    {
      label: false,
      name: "content",
      required: false,
      type: "richText",
    },
    // Sidebar
    slugField(),
    themeTemplateField({
      admin: {
        description: "Layout template assigned to this document",
        position: "sidebar",
      },
      filterOptions: {
        type: {
          equals: "page",
        },
      },
    }),
  ],
  hooks: {
    beforeChange: [enforceStoreOnCreate],
  },
  versions: {
    maxPerDoc: 50,
    drafts: {
      autosave: true,
    },
  },
};
