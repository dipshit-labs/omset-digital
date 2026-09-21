import type { CheckboxField, Field, NumberField, TextField } from "payload";

interface InventoryFieldsOverrides {
  allowBackorderOverrides?: Partial<CheckboxField>;
  barcodeOverrides?: Partial<TextField>;
  skuOverrides?: Partial<TextField>;
  stockOverrides?: Partial<NumberField>;
}

interface InventoryFieldsParams {
  overrides?: InventoryFieldsOverrides;
  virtual?: boolean;
}

export const inventoryFields = ({
  virtual = false,
  overrides = {},
}: InventoryFieldsParams = {}): Field[] => {
  const {
    stockOverrides,
    skuOverrides,
    barcodeOverrides,
    allowBackorderOverrides,
  } = overrides;

  return [
    {
      defaultValue: 0,
      min: 0,
      name: "stock",
      type: "number",
      ...stockOverrides,
      admin: {
        description: "Available inventory.",
        readOnly: false,
        ...stockOverrides?.admin,
      },
      virtual,
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
              admin: {
                readOnly: false,
                ...skuOverrides?.admin,
              },
              virtual,
            },
            {
              label: "Barcode",
              name: "barcode",
              type: "text",
              ...barcodeOverrides,
              admin: {
                readOnly: false,
                ...barcodeOverrides?.admin,
              },
              virtual,
            },
          ],
        },
        {
          defaultValue: false,
          label: "Continue selling when out of stock",
          name: "allowBackorder",
          type: "checkbox",
          ...allowBackorderOverrides,
          admin: {
            readOnly: false,
            ...allowBackorderOverrides?.admin,
          },
          virtual,
        },
      ],
    },
  ] as Field[];
};
