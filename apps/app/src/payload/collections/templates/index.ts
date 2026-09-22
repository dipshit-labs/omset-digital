import type { Access, CollectionConfig } from "payload";
import { canWrite } from "@/payload/access/canWrite";
import { isSuperAdmin } from "@/payload/access/isSuperAdmin";
import { enforceTenantOnCreate } from "@/payload/hooks/enforceTenantOnCreate";
import { getUserTenantIDs } from "@/payload/lib/ids";
import { convertSectionToPayloadBlock } from "@/payload/prototype/converter";
import {
  featuredProductsSection,
  heroSection,
} from "@/payload/prototype/sample-template";

const defaultSections = [
  convertSectionToPayloadBlock("default", heroSection),
  convertSectionToPayloadBlock("default", featuredProductsSection),
];

const deleteTemplateAccess: Access = ({ req }) => {
  if (!req.user) {
    return false;
  }

  const baseWhere = {
    isSystem: {
      not_equals: true,
    },
  };

  if (isSuperAdmin(req.user)) {
    return baseWhere;
  }

  const ids = [
    ...getUserTenantIDs(req.user, "owner"),
    ...getUserTenantIDs(req.user, "manager"),
  ];

  if (ids.length === 0) {
    return false;
  }

  return {
    and: [{ tenant: { in: ids } }, baseWhere],
  };
};

export const Templates: CollectionConfig = {
  slug: "templates",
  access: {
    create: canWrite,
    delete: deleteTemplateAccess,
    update: canWrite,
    read: ({ req }) => Boolean(req.user),
  },
  admin: {
    defaultColumns: ["name", "type", "isSystem", "theme", "updatedAt"],
    description:
      "Layout templates for your storefront pages, product displays, and catalog views.",
    group: "Storefront",
    useAsTitle: "name",
  },
  fields: [
    {
      label: "Template Name",
      name: "name",
      required: true,
      type: "text",
      admin: {
        placeholder: "e.g. Home page, Default product, Story landing page",
      },
    },
    {
      defaultValue: "page",
      label: "Template Type",
      name: "type",
      required: true,
      type: "select",
      options: [
        { label: "Home Page (System)", value: "home" },
        { label: "Product Layout (System)", value: "product" },
        { label: "Collection Layout (System)", value: "collection" },
        { label: "Custom Page Layout", value: "page" },
      ],
    },
    {
      defaultValue: false,
      label: "System Template",
      name: "isSystem",
      type: "checkbox",
      admin: {
        description:
          "System templates are core to the theme layout and cannot be deleted.",
        position: "sidebar",
        readOnly: true,
      },
    },
    {
      label: "Theme",
      name: "theme",
      relationTo: "themes",
      required: true,
      type: "relationship",
      admin: {
        description: "The theme instance this template belongs to.",
        position: "sidebar",
        readOnly: true,
      },
    },
    {
      blocks: defaultSections,
      label: "Template Sections",
      name: "sections",
      type: "blocks",
      admin: {
        description: "Add, reorder, and configure sections for this template.",
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
    plural: "Theme Templates",
    singular: "Theme Template",
  },
};
