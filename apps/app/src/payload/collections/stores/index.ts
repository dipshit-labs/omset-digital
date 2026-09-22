import type { Block, CollectionConfig, TextField } from "payload";
import { validateSlug } from "@/lib/utils";
import { isSuperAdminAccess } from "@/payload/access/isSuperAdmin";
import { encryptedField } from "@/payload/fields/encrypted";
import { slugField } from "@/payload/fields/slug";
import { canReadRestrictedField } from "./access/canReadRestrictedField";
import { updateAndDeleteTenantAccess } from "./access/updateAndDelete";

const restrictedTextField = (name: string): TextField => ({
  name,
  access: { read: canReadRestrictedField },
  admin: { description: "Restricted to store owner and super-admin" },
  type: "text",
});

const XenditBlock: Block = {
  labels: { plural: "Xendit", singular: "Xendit" },
  slug: "xendit",
  fields: [
    encryptedField("secretKey", {
      access: { read: canReadRestrictedField },
      admin: {
        placeholder: "xnd_production_...",
      },
    }),
    encryptedField("webhookToken", {
      access: { read: canReadRestrictedField },
      admin: {
        description: "Callback token from Xendit Dashboard → Webhooks settings",
      },
    }),
    {
      defaultValue: "test",
      name: "mode",
      required: true,
      type: "select",
      options: [
        { label: "Test", value: "test" },
        { label: "Live", value: "live" },
      ],
    },
  ],
};

export const Stores: CollectionConfig = {
  slug: "stores",
  access: {
    create: isSuperAdminAccess,
    delete: updateAndDeleteTenantAccess,
    update: updateAndDeleteTenantAccess,
    read: ({ req }) => Boolean(req.user),
  },
  admin: {
    defaultColumns: ["name", "slug", "customDomain"],
    description:
      "Store identity, branding, custom domain, and BYOK credentials.",
    group: "Settings",
    useAsTitle: "name",
  },
  fields: [
    {
      label: "Store Name",
      name: "name",
      required: true,
      type: "text",
      admin: {
        description: "Display name of the merchant's store",
      },
    },
    ...slugField("name", {
      slugOverrides: {
        validate: validateSlug,
        admin: {
          description: "Subdomain identifier (e.g. {slug}.omsetdigital.com)",
        },
      },
    }),
    {
      label: "Brand Tagline",
      name: "tagline",
      type: "text",
      admin: {
        placeholder: "e.g. Handcrafted ceramics from Yogyakarta",
      },
    },
    {
      label: "Custom Domain",
      name: "customDomain",
      type: "text",
      admin: {
        description: "Buyer-facing custom domain (e.g. myshop.com)",
      },
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
          label: "Store Favicon",
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
      type: "row",
      fields: [
        {
          label: "Support Email",
          name: "publicEmail",
          type: "text",
          admin: {
            width: "50%",
          },
        },
        {
          label: "Support Phone / WhatsApp",
          name: "publicPhone",
          type: "text",
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
    // Themes join field
    {
      collection: "themes",
      label: "Installed Themes",
      name: "themes",
      on: "tenant",
      type: "join",
      admin: {
        defaultColumns: ["name", "templateSlug", "isLive", "updatedAt"],
        description: "Storefront themes installed for this store.",
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
          defaultValue: "trial",
          name: "status",
          required: true,
          type: "select",
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
    // Payment providers — polymorphic blocks, one block type per gateway (ADR-0001)
    {
      blocks: [XenditBlock],
      maxRows: 1,
      name: "paymentProviders",
      type: "blocks",
      admin: {
        description:
          "Active payment gateway. Add one block and fill in your credentials.",
      },
    },
    // Shipping config — same conditional pattern as paymentConfig
    {
      name: "shippingConfig",
      type: "group",
      admin: {
        description: "Shipping provider credentials and origin configuration",
      },
      fields: [
        {
          defaultValue: "none",
          name: "shippingProvider",
          type: "select",
          admin: {
            description: "Active shipping provider",
          },
          options: [
            { label: "None", value: "none" },
            { label: "RajaOngkir", value: "rajaongkir" },
          ],
        },
        // RajaOngkir config — visible only when shippingProvider === 'rajaongkir'
        {
          name: "rajaongkirConfig",
          type: "group",
          admin: {
            condition: (_, siblingData) =>
              siblingData?.shippingProvider === "rajaongkir",
          },
          fields: [
            restrictedTextField("apiKey"),
            {
              defaultValue: "starter",
              name: "accountType",
              type: "select",
              options: [
                { label: "Starter", value: "starter" },
                { label: "Basic", value: "basic" },
                { label: "Pro", value: "pro" },
              ],
            },
            {
              name: "originCityId",
              type: "text",
              admin: {
                description: "Origin city for shipping cost calculation",
              },
            },
            // Only relevant for Pro — subdistrict-level cost calculation
            {
              name: "originSubdistrictId",
              type: "text",
              admin: {
                description: "Only applicable for Pro account type",
                condition: (_, siblingData) =>
                  siblingData?.accountType === "pro",
              },
            },
          ],
        },
      ],
    },
    // WhatsApp config — flat group, single provider
    {
      name: "whatsappConfig",
      type: "group",
      fields: [
        {
          defaultValue: false,
          name: "enabled",
          type: "checkbox",
        },
        {
          name: "phoneNumber",
          type: "text",
        },
      ],
    },
  ],
  labels: {
    plural: "Stores",
    singular: "Store",
  },
};
