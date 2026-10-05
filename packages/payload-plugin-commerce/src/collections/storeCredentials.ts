import type {
  CollectionAfterChangeHook,
  CollectionConfig,
  CollectionSlug,
  Field,
} from "payload";
import type { CreateStoreCredentialsCollectionOptions } from "../types";

import { encryptedCredentialField } from "../fields/encrypted";

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
        id: storeId,
        // SAFETY: storesSlug dynamically resolves to configured stores CollectionSlug.
        collection: storesSlug as CollectionSlug,
        context: { skipSync: true },
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
      name: "store",
      type: "relationship",
      index: true,
      // SAFETY: storesSlug dynamically resolves to configured stores CollectionSlug.
      relationTo: storesSlug as CollectionSlug,
      required: true,
      unique: true,
      admin: {
        description: "Associated store document",
      },
    },
    {
      name: "paymentProvider",
      type: "select",
      defaultValue: "none",
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
          name: "clientKey",
          type: "text",
          admin: { description: "Midtrans Client Key (public)" },
        },
        {
          name: "isProduction",
          type: "checkbox",
          admin: { description: "Use Midtrans production environment" },
          defaultValue: false,
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
          name: "isProduction",
          type: "checkbox",
          admin: { description: "Use Xendit production environment" },
          defaultValue: false,
        },
      ],
    },
    {
      name: "shippingProvider",
      type: "select",
      defaultValue: "none",
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
          name: "accountType",
          type: "select",
          admin: { description: "RajaOngkir account tier" },
          defaultValue: "starter",
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
