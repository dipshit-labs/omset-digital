import type { CollectionConfig } from "payload";
import { canWrite } from "@/payload/access/canWrite";
import { enforceTenantOnCreate } from "@/payload/hooks/enforceTenantOnCreate";
import { convertSectionToPayloadBlock } from "@/payload/prototype/converter";
import {
  featuredProductsSection,
  heroSection,
} from "@/payload/prototype/sample-template";

const defaultSections = [
  convertSectionToPayloadBlock("default", heroSection),
  convertSectionToPayloadBlock("default", featuredProductsSection),
];

export const Pages: CollectionConfig = {
  slug: "pages",
  access: {
    create: canWrite,
    delete: canWrite,
    update: canWrite,
    read: ({ req }) => Boolean(req.user),
  },
  admin: {
    defaultColumns: ["title", "slug", "templateType", "theme", "updatedAt"],
    description:
      "Pages and section layouts assigned to your storefront themes.",
    group: "Storefront",
    useAsTitle: "title",
  },
  fields: [
    {
      label: "Page Title",
      name: "title",
      required: true,
      type: "text",
    },
    {
      label: "URL Slug",
      name: "slug",
      required: true,
      type: "text",
      admin: {
        description:
          "Path relative to your store domain (e.g. 'home', 'about', 'contact')",
      },
    },
    {
      defaultValue: "standard",
      label: "Template Type",
      name: "templateType",
      required: true,
      type: "select",
      options: [
        { label: "Home Page", value: "home" },
        { label: "Product Page Layout", value: "product" },
        { label: "Standard Content Page", value: "standard" },
      ],
    },
    {
      label: "Assigned Theme",
      name: "theme",
      relationTo: "themes",
      required: true,
      type: "relationship",
      admin: {
        description: "The theme instance that this page layout belongs to.",
      },
    },
    {
      blocks: defaultSections,
      label: "Page Sections",
      name: "sections",
      type: "blocks",
      admin: {
        description: "Add, reorder, and configure sections for this page.",
      },
      labels: {
        plural: "Sections",
        singular: "Section",
      },
    },
  ],
  hooks: {
    beforeChange: [enforceTenantOnCreate],
  },
  labels: {
    plural: "Pages",
    singular: "Page",
  },
};
