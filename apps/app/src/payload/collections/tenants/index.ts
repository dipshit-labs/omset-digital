import type { CollectionConfig, TextField } from "payload";
import { validateSlug } from "@/lib/utils";
import { canReadRestrictedField } from "@/payload/access/canReadRestrictedField";
import { isSuperAdminAccess } from "@/payload/access/isSuperAdmin";
import { updateAndDeleteTenantAccess } from "./access/updateAndDelete";

const restrictedTextField = (name: string): TextField => ({
  name,
  access: { read: canReadRestrictedField },
  admin: { description: "Restricted to tenant owner and super-admin" },
  type: "text",
});

export const Tenants: CollectionConfig = {
  slug: "tenants",
  access: {
    create: isSuperAdminAccess,
    delete: updateAndDeleteTenantAccess,
    update: updateAndDeleteTenantAccess,
    read: ({ req }) => Boolean(req.user),
  },
  admin: {
    defaultColumns: ["name", "slug", "customDomain", "theme"],
    useAsTitle: "name",
  },
  fields: [
    {
      name: "name",
      required: true,
      type: "text",
      admin: {
        description: "Display name of the merchant's store",
      },
    },
    {
      // unique implies an index in Postgres — no need for index: true
      name: "slug",
      required: true,
      type: "text",
      unique: true,
      validate: validateSlug,
      admin: {
        description: "Subdomain identifier (e.g. {slug}.omsetdigital.com)",
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
      defaultValue: "default",
      name: "theme",
      required: true,
      type: "select",
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
    // Payment config — ADR-0001: conditional groups keyed to paymentProvider select
    {
      name: "paymentConfig",
      type: "group",
      admin: {
        description: "Payment gateway credentials (ADR-0001)",
      },
      fields: [
        {
          defaultValue: "none",
          name: "paymentProvider",
          type: "select",
          admin: {
            description: "Active payment gateway provider",
          },
          options: [
            { label: "None", value: "none" },
            { label: "Xendit", value: "xendit" },
            { label: "Midtrans", value: "midtrans" },
          ],
        },
        // Xendit credentials — visible only when paymentProvider === 'xendit'
        {
          name: "xenditConfig",
          type: "group",
          admin: {
            condition: (_, siblingData) =>
              siblingData?.paymentProvider === "xendit",
          },
          fields: [
            restrictedTextField("secretKey"),
            restrictedTextField("webhookSecret"),
          ],
        },
        // Midtrans credentials — visible only when paymentProvider === 'midtrans'
        {
          name: "midtransConfig",
          type: "group",
          admin: {
            condition: (_, siblingData) =>
              siblingData?.paymentProvider === "midtrans",
          },
          fields: [
            restrictedTextField("serverKey"),
            restrictedTextField("clientKey"),
          ],
        },
      ],
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
};
