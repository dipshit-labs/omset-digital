import type { CollectionConfig } from "payload";
import { canWrite } from "@/payload/access/canWrite";
import { slugField } from "@/payload/fields/slug";
import { enforceTenantOnCreate } from "@/payload/hooks/enforceTenantOnCreate";

export const Pages: CollectionConfig = {
  slug: "pages",
  access: {
    create: canWrite,
    delete: canWrite,
    update: canWrite,
    read: ({ req }) => Boolean(req.user),
  },
  admin: {
    defaultColumns: ["title", "slug", "template", "updatedAt"],
    description:
      "Store content and marketing pages (About us, FAQ, Contact, Terms) using theme page templates.",
    group: "Content",
    useAsTitle: "title",
  },
  fields: [
    {
      label: "Page Title",
      name: "title",
      required: true,
      type: "text",
      admin: {
        placeholder: "e.g. About Our Workshop, Frequently Asked Questions",
      },
    },
    ...slugField("title"),
    {
      label: "Theme Template",
      name: "template",
      relationTo: "templates",
      required: true,
      type: "relationship",
      admin: {
        description:
          "Select the page layout template that controls the layout and sections for this page.",
      },
      filterOptions: {
        type: {
          equals: "page",
        },
      },
    },
    {
      label: "Page Body Content",
      name: "content",
      type: "richText",
      admin: {
        description:
          "Primary textual content rendered by the selected page template.",
      },
    },
  ],
  hooks: {
    beforeChange: [enforceTenantOnCreate],
  },
  labels: {
    plural: "Content Pages",
    singular: "Content Page",
  },
};
