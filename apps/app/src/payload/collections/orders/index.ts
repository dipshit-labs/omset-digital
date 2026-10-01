import { paymentMetadataField } from "@repo/payload-plugin-commerce/fields";
import {
  CANONICAL_PAYMENT_STATUSES,
  preventPaymentStatusReversion,
} from "@repo/payload-plugin-commerce/hooks";
import type { CollectionConfig } from "payload";

import { canWrite } from "@/payload/access/canWrite";
import { enforceStoreOnCreate } from "@/payload/hooks/enforceStoreOnCreate";

export const Orders: CollectionConfig = {
  slug: "orders",
  access: {
    create: canWrite,
    delete: canWrite,
    read: canWrite,
    update: canWrite,
  },
  admin: {
    defaultColumns: ["orderNumber", "paymentStatus", "total", "createdAt"],
    useAsTitle: "orderNumber",
  },
  fields: [
    {
      name: "orderNumber",
      required: true,
      type: "text",
      unique: true,
      admin: {
        description: "Merchant order identifier (e.g. ORDER-1001)",
      },
    },
    {
      defaultValue: "pending",
      name: "paymentStatus",
      required: true,
      type: "select",
      admin: {
        description: "Payment status managed by payment gateway webhooks",
      },
      options: CANONICAL_PAYMENT_STATUSES.map((status) => ({
        label: status.charAt(0).toUpperCase() + status.slice(1),
        value: status,
      })),
    },
    {
      min: 0,
      name: "total",
      required: true,
      type: "number",
      admin: {
        description: "Total order amount in IDR",
      },
    },
    {
      defaultValue: "IDR",
      name: "currency",
      required: true,
      type: "text",
      admin: {
        description: "Currency code",
      },
    },
    {
      name: "customer",
      type: "group",
      admin: {
        description: "Buyer contact details",
      },
      fields: [
        {
          name: "firstName",
          type: "text",
        },
        {
          name: "lastName",
          type: "text",
        },
        {
          name: "email",
          type: "email",
        },
        {
          name: "phone",
          type: "text",
        },
      ],
    },
    {
      name: "items",
      type: "array",
      admin: {
        description: "Purchased line items",
      },
      fields: [
        {
          name: "title",
          required: true,
          type: "text",
        },
        {
          name: "price",
          required: true,
          type: "number",
        },
        {
          min: 1,
          name: "quantity",
          required: true,
          type: "number",
        },
      ],
    },
    paymentMetadataField,
  ],
  hooks: {
    beforeChange: [enforceStoreOnCreate],
    beforeValidate: [preventPaymentStatusReversion],
  },
};
