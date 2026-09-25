import type { CheckboxField, Field, NumberField, TextField } from "payload";

interface InventoryFieldsOverrides {
  allowBackorderOverrides?: Partial<CheckboxField>;
  barcodeOverrides?: Partial<TextField>;
  skuOverrides?: Partial<TextField>;
  stockOverrides?: Partial<NumberField>;
  trackedOverrides?: Partial<CheckboxField>;
}

interface InventoryFieldsParams {
  overrides?: InventoryFieldsOverrides;
  virtual?: boolean;
}

export const inventoryFields = ({
  overrides = {},
  virtual = false,
}: InventoryFieldsParams = {}): Field[] => {
  const {
    allowBackorderOverrides,
    barcodeOverrides,
    skuOverrides,
    stockOverrides,
    trackedOverrides,
  } = overrides;

  // SAFETY: Field definitions and spread overrides satisfy Payload Field union types.
  return [
    // TODO: Create a custom UI to turn this into a Switch instead of checkbox
    {
      defaultValue: true,
      label: "Inventory tracked",
      name: "tracked",
      type: "checkbox",
      ...trackedOverrides,
      virtual,
      admin: {
        readOnly: false,
        ...trackedOverrides?.admin,
      },
    },
    {
      defaultValue: 0,
      min: 0,
      name: "stock",
      type: "number",
      ...stockOverrides,
      virtual,
      admin: {
        description: "Available inventory.",
        readOnly: false,
        condition: (data, siblingData) =>
          Boolean(siblingData?.tracked ?? data?.inventory?.tracked),
        ...stockOverrides?.admin,
      },
    },
    {
      label: "More details",
      type: "collapsible",
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              label: "SKU (Stock Keeping Unit)",
              name: "sku",
              type: "text",
              ...skuOverrides,
              virtual,
              admin: {
                readOnly: false,
                ...skuOverrides?.admin,
              },
            },
            {
              label: "Barcode",
              name: "barcode",
              type: "text",
              ...barcodeOverrides,
              virtual,
              admin: {
                readOnly: false,
                ...barcodeOverrides?.admin,
              },
            },
          ],
        },
        {
          defaultValue: false,
          label: "Continue selling when out of stock",
          name: "allowBackorder",
          type: "checkbox",
          ...allowBackorderOverrides,
          virtual,
          admin: {
            readOnly: false,
            condition: (data, siblingData) =>
              Boolean(siblingData?.tracked ?? data?.inventory?.tracked),
            ...allowBackorderOverrides?.admin,
          },
        },
      ],
    },
  ] as Field[];
};
