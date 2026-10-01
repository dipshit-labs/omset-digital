import type { JSONField } from "payload";

import { populatePaymentMetadataAfterRead } from "../migrations/backfillPaymentMetadata";

/**
 * Polymorphic payment provider metadata JSON field for Orders.
 * Enables storing provider-specific transaction IDs, timestamps, payment channels,
 * and settlement logs without coupling the schema to specific third-party payment gateways.
 */
export const paymentMetadataField: JSONField = {
  name: "paymentMetadata",
  type: "json",
  access: {
    create: ({ req }) => Boolean(req?.user),
    read: ({ req }) => Boolean(req?.user),
    update: ({ req }) => Boolean(req?.user),
  },
  admin: {
    description:
      "Polymorphic payment provider transaction metadata and audit logs",
  },
  hooks: {
    afterRead: [populatePaymentMetadataAfterRead],
  },
};
