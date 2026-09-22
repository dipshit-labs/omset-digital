import type { CollectionConfig } from "payload";
import { canWrite } from "@/payload/access/canWrite";
import { enforceTenantOnCreate } from "@/payload/hooks/enforceTenantOnCreate";
import { convertSettingFields } from "@/payload/prototype/converter";
import { defaultTemplateManifest } from "@/payload/prototype/sample-template";
import {
  handleLiveThemeAfterChange,
  handleLiveThemeBeforeChange,
} from "./hooks/handleLiveTheme";
import { seedThemeTemplatesAfterChange } from "./hooks/seedThemeTemplates";

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
      "Manage installed storefront themes, customize branding colors and fonts, and configure templates.",
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
          "Active theme rendered for buyers. Exactly one theme is live at a time.",
      },
    },
    {
      fields: convertSettingFields(defaultTemplateManifest.settings),
      label: "Theme Settings & Colors",
      name: "settings",
      type: "group",
    },
    {
      collection: "templates",
      label: "Theme Templates",
      name: "templates",
      on: "theme",
      type: "join",
      admin: {
        defaultColumns: ["name", "type", "isSystem", "updatedAt"],
        description:
          "Templates defining the sections for Home, Product, Collection, and Custom Pages.",
      },
    },
  ],
  hooks: {
    afterChange: [handleLiveThemeAfterChange, seedThemeTemplatesAfterChange],
    beforeChange: [enforceTenantOnCreate, handleLiveThemeBeforeChange],
  },
  labels: {
    plural: "Themes",
    singular: "Theme",
  },
};
