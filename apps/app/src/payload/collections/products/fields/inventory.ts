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
      name: "tracked",
      type: "checkbox",
      defaultValue: virtual ? undefined : true,
      label: "Inventory tracked",
      ...trackedOverrides,
      virtual,
      admin: {
        readOnly: false,
        ...trackedOverrides?.admin,
      },
    },
    {
      name: "stock",
      type: "number",
      defaultValue: virtual ? undefined : 0,
      min: 0,
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
      type: "collapsible",
      label: "More details",
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "sku",
              type: "text",
              label: "SKU (Stock Keeping Unit)",
              ...skuOverrides,
              virtual,
              admin: {
                readOnly: false,
                ...skuOverrides?.admin,
              },
            },
            {
              name: "barcode",
              type: "text",
              label: "Barcode",
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
          name: "allowBackorder",
          type: "checkbox",
          defaultValue: virtual ? undefined : false,
          label: "Continue selling when out of stock",
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
