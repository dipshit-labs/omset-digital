import type {
  CollectionAfterChangeHook,
  CollectionConfig,
  CollectionSlug,
  Field,
} from "payload";

import { encryptedCredentialField } from "../fields/encrypted";
import type { CreateStoreCredentialsCollectionOptions } from "../types";

export const createStoreCredentialsCollection = (
  options: CreateStoreCredentialsCollectionOptions = {}
): CollectionConfig => {
  const slug = options.slug ?? "storeCredentials";
  const storesSlug = options.storesSlug ?? "stores";
  const { secretOrResolver } = options;

  const syncActiveProvidersToStore: CollectionAfterChangeHook = async ({
    context,
    doc,
    req,
  }) => {
    if (context.skipSync || !doc.store) {
      return doc;
    }

    const storeId = typeof doc.store === "object" ? doc.store.id : doc.store;
    if (!storeId) {
      return doc;
    }

    try {
      await req.payload.update({
        // SAFETY: storesSlug dynamically resolves to configured stores CollectionSlug.
        collection: storesSlug as CollectionSlug,
        context: { skipSync: true },
        id: storeId,
        req,
        data: {
          activePaymentProvider: doc.paymentProvider,
          activeShippingProvider: doc.shippingProvider,
        },
      });
    } catch {
      // In tests or if stores collection does not have the fields, proceed without crashing
    }

    return doc;
  };

  const fields: Field[] = [
    {
      index: true,
      name: "store",
      // SAFETY: storesSlug dynamically resolves to configured stores CollectionSlug.
      relationTo: storesSlug as CollectionSlug,
      required: true,
      type: "relationship",
      unique: true,
      admin: {
        description: "Associated store document",
      },
    },
    {
      defaultValue: "none",
      name: "paymentProvider",
      type: "select",
      admin: {
        description: "Active payment gateway",
      },
      options: [
        { label: "None", value: "none" },
        { label: "Midtrans", value: "midtrans" },
        { label: "Xendit", value: "xendit" },
      ],
    },
    {
      name: "midtrans",
      type: "group",
      admin: {
        description: "Midtrans payment gateway credentials",
      },
      fields: [
        encryptedCredentialField("serverKey", {
          admin: { description: "Midtrans Server Key (encrypted at rest)" },
          secretOrResolver,
        }),
        {
          admin: { description: "Midtrans Client Key (public)" },
          name: "clientKey",
          type: "text",
        },
        {
          admin: { description: "Use Midtrans production environment" },
          defaultValue: false,
          name: "isProduction",
          type: "checkbox",
        },
      ],
    },
    {
      name: "xendit",
      type: "group",
      admin: {
        description: "Xendit payment gateway credentials",
      },
      fields: [
        encryptedCredentialField("secretKey", {
          admin: { description: "Xendit Secret API Key (encrypted at rest)" },
          secretOrResolver,
        }),
        encryptedCredentialField("webhookToken", {
          secretOrResolver,
          admin: {
            description:
              "Xendit Webhook Verification Token (encrypted at rest)",
          },
        }),
        {
          admin: { description: "Use Xendit production environment" },
          defaultValue: false,
          name: "isProduction",
          type: "checkbox",
        },
      ],
    },
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
    {
      name: "rajaongkir",
      type: "group",
      admin: {
        description: "RajaOngkir shipping calculation credentials",
      },
      fields: [
        encryptedCredentialField("apiKey", {
          admin: { description: "RajaOngkir API Key (encrypted at rest)" },
          secretOrResolver,
        }),
        {
          admin: { description: "RajaOngkir account tier" },
          defaultValue: "starter",
          name: "accountType",
          type: "select",
          options: [
            { label: "Starter", value: "starter" },
            { label: "Basic", value: "basic" },
            { label: "Pro", value: "pro" },
          ],
        },
      ],
    },
  ];

  const baseConfig: CollectionConfig = {
    fields,
    slug,
    access: {
      create: ({ req }) => Boolean(req.user),
      delete: ({ req }) => Boolean(req.user),
      read: ({ req }) => Boolean(req.user),
      update: ({ req }) => Boolean(req.user),
    },
    admin: {
      hidden: true,
      useAsTitle: "id",
    },
    hooks: {
      afterChange: [syncActiveProvidersToStore],
    },
  };

  return {
    ...baseConfig,
    ...options.overrides,
    admin: {
      ...baseConfig.admin,
      ...options.overrides?.admin,
    },
    hooks: {
      ...baseConfig.hooks,
      ...options.overrides?.hooks,
      afterChange: [
        ...(baseConfig.hooks?.afterChange ?? []),
        ...(options.overrides?.hooks?.afterChange ?? []),
      ],
    },
  };
};
