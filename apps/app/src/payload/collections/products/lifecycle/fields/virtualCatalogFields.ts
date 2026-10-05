import type { Field } from "payload";

import { inventoryFields } from "../../fields/inventory";
import { pricingFields } from "../../fields/pricing";
import { shippingFields } from "../../fields/shipping";

const isSingleVariantCondition = (data?: { variantTypes?: unknown }): boolean =>
  !Array.isArray(data?.variantTypes) || data.variantTypes.length === 0;

export const virtualCatalogFields: Field[] = [
  {
    name: "pricing",
    type: "group",
    label: "Price",
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
    name: "inventory",
    type: "group",
    fields: [...inventoryFields({ virtual: true })],
    label: "Inventory",
    virtual: true,
    admin: {
      condition: isSingleVariantCondition,
    },
  },
  {
    name: "shipping",
    type: "group",
    label: "Shipping",
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
