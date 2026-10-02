import type { Field } from "payload";

import { inventoryFields } from "../../fields/inventory";
import { pricingFields } from "../../fields/pricing";
import { shippingFields } from "../../fields/shipping";

const isSingleVariantCondition = (data?: { variantTypes?: unknown }): boolean =>
  !Array.isArray(data?.variantTypes) || data.variantTypes.length === 0;

export const virtualCatalogFields: Field[] = [
  {
    label: "Price",
    name: "pricing",
    type: "group",
    virtual: true,
    admin: {
      condition: isSingleVariantCondition,
    },
    fields: [
      ...pricingFields({
        overrides: { priceOverrides: { label: false } },
        virtual: true,
      }),
    ],
  },
  {
    fields: [...inventoryFields({ virtual: true })],
    label: "Inventory",
    name: "inventory",
    type: "group",
    virtual: true,
    admin: {
      condition: isSingleVariantCondition,
    },
  },
  {
    label: "Shipping",
    name: "shipping",
    type: "group",
    virtual: true,
    admin: {
      condition: isSingleVariantCondition,
    },
    fields: [
      ...shippingFields({
        virtual: true,
        overrides: {
          packageOverrides: {
            required: false,
          },
        },
      }),
    ],
  },
];
