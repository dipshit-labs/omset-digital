import type { CollectionConfig } from "payload";
import { canWrite } from "@/payload/access/canWrite";
import { enforceTenantOnCreate } from "@/payload/hooks/enforceTenantOnCreate";
export const StoreSettings: CollectionConfig = {
  slug: "storeSettings",
  access: {
    create: canWrite,
    delete: canWrite,
    update: canWrite,
    read: ({ req }) => Boolean(req.user),
  },
  admin: {
    description:
      "Universal store identity, branding assets, and active theme pointer.",
    group: "Settings",
    useAsTitle: "storeName",
  },
  fields: [
    {
      label: "Store Brand Name",
      name: "storeName",
      required: true,
      type: "text",
    },
    {
      label: "Brand Tagline",
      name: "tagline",
      type: "text",
    },
    {
      label: "Active Storefront Theme",
      name: "activeTheme",
      relationTo: "themes",
      type: "relationship",
      admin: {
        description: "The live theme rendered for buyers visiting your store.",
      },
    },
    {
      type: "row",
      fields: [
        {
          label: "Customer Support Email",
          name: "publicEmail",
          type: "text",
          admin: {
            width: "50%",
          },
        },
        {
          label: "Customer Support Phone / WhatsApp",
          name: "publicPhone",
          type: "text",
          admin: {
            width: "50%",
          },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          label: "Store Logo",
          name: "logo",
          relationTo: "media",
          type: "upload",
          admin: {
            width: "50%",
          },
        },
        {
          label: "Favicon",
          name: "favicon",
          relationTo: "media",
          type: "upload",
          admin: {
            width: "50%",
          },
        },
      ],
    },
    {
      label: "Social Media Profiles",
      name: "socialLinks",
      type: "array",
      fields: [
        {
          label: "Platform",
          name: "platform",
          required: true,
          type: "select",
          options: [
            { label: "Instagram", value: "instagram" },
            { label: "TikTok", value: "tiktok" },
            { label: "WhatsApp", value: "whatsapp" },
            { label: "Facebook", value: "facebook" },
            { label: "YouTube", value: "youtube" },
            { label: "X / Twitter", value: "x" },
          ],
        },
        {
          label: "Profile URL",
          name: "url",
          required: true,
          type: "text",
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [enforceTenantOnCreate],
  },
  labels: {
    plural: "Store Settings",
    singular: "Store Settings",
  },
};
