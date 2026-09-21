import type { Field, NumberField } from "payload";

interface PricingFieldsOverrides {
  compareOverrides?: Partial<NumberField>;
  priceOverrides?: Partial<NumberField>;
}

interface PricingFieldsParams {
  overrides?: PricingFieldsOverrides;
  virtual?: boolean;
}

const pricingFields = ({
  virtual = false,
  overrides = {},
}: PricingFieldsParams = {}): Field[] => {
  const { compareOverrides, priceOverrides } = overrides;

  return [
    {
      min: 0,
      name: "price",
      required: true,
      type: "number",
      ...priceOverrides,
      admin: {
        placeholder: "0.00",
        readOnly: false,
        ...priceOverrides?.admin,
      },
      virtual,
    },
    {
      label: "Additional display prices",
      type: "collapsible",
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          min: 0,
          name: "compareAtPrice",
          type: "number",
          ...compareOverrides,
          admin: {
            description:
              "Enter a value higher than your price. Often shown with a strikethrough (e.g., $25.00).",
            placeholder: "0.00",
            readOnly: false,
            ...compareOverrides?.admin,
          },
          virtual,
        },
      ],
    },
  ] as Field[];
};

export { pricingFields };
