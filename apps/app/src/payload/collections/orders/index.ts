import type { CollectionConfig } from "payload";

import { canWrite } from "@/payload/access/canWrite";
import { enforceStoreOnCreate } from "@/payload/hooks/enforceStoreOnCreate";
import { paymentMetadataField } from "@repo/payload-plugin-commerce/fields";
import {
  CANONICAL_PAYMENT_STATUSES,
  preventPaymentStatusReversion,
} from "@repo/payload-plugin-commerce/hooks";

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
      type: "text",
      required: true,
      unique: true,
      admin: {
        description: "Merchant order identifier (e.g. ORDER-1001)",
      },
    },
    {
      name: "paymentStatus",
      type: "select",
      defaultValue: "pending",
      required: true,
      admin: {
        description: "Payment status managed by payment gateway webhooks",
      },
      options: CANONICAL_PAYMENT_STATUSES.map((status) => ({
        label: status.charAt(0).toUpperCase() + status.slice(1),
        value: status,
      })),
    },
    {
      name: "total",
      type: "number",
      min: 0,
      required: true,
      admin: {
        description: "Total order amount in IDR",
      },
    },
    {
      name: "currency",
      type: "text",
      defaultValue: "IDR",
      required: true,
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
          type: "text",
          required: true,
        },
        {
          name: "price",
          type: "number",
          required: true,
        },
        {
          name: "quantity",
          type: "number",
          min: 1,
          required: true,
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
