import type { CollectionConfig } from "payload";

import { isSuperAdminAccess } from "@/payload/access/isSuperAdmin";
import {
  activePaymentProviderField,
  activeShippingProviderField,
  credentialsManagerField,
  originAddressField,
} from "@repo/payload-plugin-commerce/fields";
import { updateAndDeleteStoreAccess } from "./access/updateAndDelete";

export const Stores: CollectionConfig = {
  slug: "stores",
  access: {
    create: isSuperAdminAccess,
    delete: updateAndDeleteStoreAccess,
    update: updateAndDeleteStoreAccess,
    read: ({ req }) => Boolean(req.user),
  },
  admin: {
    defaultColumns: ["name", "slug", "customDomain", "theme"],
    useAsTitle: "name",
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "General",
          fields: [
            {
              name: "name",
              type: "text",
              required: true,
              admin: {
                description: "Display name of the merchant's store",
              },
            },
            {
              // ! Note: change this in the future
              // unique implies an index in Postgres — no need for index: true
              name: "slug",
              type: "text",
              required: true,
              unique: true,
              admin: {
                description:
                  "Subdomain identifier (e.g. {slug}.omsetdigital.com)",
              },
            },
            {
              name: "customDomain",
              type: "text",
              admin: {
                description: "Buyer-facing custom domain (e.g. myshop.com)",
              },
            },
            {
              name: "theme",
              type: "select",
              defaultValue: "default",
              required: true,
              admin: {
                description: "Active storefront theme",
              },
              options: [
                { label: "Default", value: "default" },
                { label: "Minimal", value: "minimal" },
              ],
            },
            {
              name: "themeConfig",
              type: "json",
              admin: {
                description: "Accent colors, fonts, and per-theme overrides",
              },
            },
            // Subscription
            {
              name: "subscription",
              type: "group",
              access: {
                update: isSuperAdminAccess,
              },
              fields: [
                {
                  name: "status",
                  type: "select",
                  defaultValue: "trial",
                  required: true,
                  options: [
                    { label: "Trial", value: "trial" },
                    { label: "Active", value: "active" },
                    { label: "Past Due", value: "past_due" },
                    { label: "Canceled", value: "canceled" },
                  ],
                },
                {
                  name: "trialEndsAt",
                  type: "date",
                },
                {
                  name: "currentPeriodEnd",
                  type: "date",
                },
              ],
            },
            originAddressField,
            // WhatsApp config — flat group, single provider
            {
              name: "whatsappConfig",
              type: "group",
              fields: [
                {
                  name: "enabled",
                  type: "checkbox",
                  defaultValue: false,
                },
                {
                  name: "phoneNumber",
                  type: "text",
                },
              ],
            },
          ],
        },
        {
          label: "Integrations",
          fields: [
            credentialsManagerField,
            activePaymentProviderField,
            activeShippingProviderField,
          ],
        },
      ],
    },
  ],
};
