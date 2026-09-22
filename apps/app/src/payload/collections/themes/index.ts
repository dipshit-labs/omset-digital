import type { CollectionConfig } from "payload";
import { canWrite } from "@/payload/access/canWrite";
import { enforceTenantOnCreate } from "@/payload/hooks/enforceTenantOnCreate";
import { convertSettingFields } from "@/payload/prototype/converter";
import { defaultTemplateManifest } from "@/payload/prototype/sample-template";

export const Themes: CollectionConfig = {
  slug: "themes",
  access: {
    create: canWrite,
    delete: canWrite,
    update: canWrite,
    read: ({ req }) => Boolean(req.user),
  },
  admin: {
    defaultColumns: ["name", "templateSlug", "isLive", "updatedAt"],
    description:
      "Manage your installed storefront themes, customize styling, and edit pages.",
    group: "Storefront",
    useAsTitle: "name",
  },
  fields: [
    {
      label: "Theme Name",
      name: "name",
      required: true,
      type: "text",
      admin: {
        placeholder: "e.g. Modern Clean (Live), Summer Campaign Draft",
      },
    },
    {
      defaultValue: "default",
      label: "Template Package",
      name: "templateSlug",
      required: true,
      type: "select",
      options: [
        { label: "Modern Clean (Default)", value: "default" },
        { label: "Minimal Monochrome", value: "minimal" },
      ],
    },
    {
      defaultValue: false,
      label: "Live Storefront Theme",
      name: "isLive",
      type: "checkbox",
      admin: {
        description:
          "Merchants can toggle this to make this theme the active buyer-facing design.",
      },
    },
    {
      fields: convertSettingFields(defaultTemplateManifest.settings),
      label: "Theme Settings & Colors",
      name: "settings",
      type: "group",
    },
    {
      collection: "pages",
      label: "Theme Pages & Layouts",
      name: "pages",
      on: "theme",
      type: "join",
      admin: {
        defaultColumns: ["title", "slug", "templateType", "updatedAt"],
        description:
          "Pages and section trees associated with this theme instance.",
      },
    },
  ],
  hooks: {
    beforeChange: [enforceTenantOnCreate],
  },
  labels: {
    plural: "Themes",
    singular: "Theme",
  },
};
