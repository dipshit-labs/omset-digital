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
  overrides = {},
  virtual = false,
}: PricingFieldsParams = {}): Field[] => {
  const { compareOverrides, priceOverrides } = overrides;

  // SAFETY: Field definitions and spread overrides satisfy Payload Field union types.
  return [
    {
      min: 0,
      name: "price",
      required: true,
      type: "number",
      ...priceOverrides,
      virtual,
      admin: {
        placeholder: "0.00",
        readOnly: false,
        ...priceOverrides?.admin,
      },
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
          virtual,
          admin: {
            placeholder: "0.00",
            readOnly: false,
            description:
              "Enter a value higher than your price. Often shown with a strikethrough (e.g., $25.00).",
            ...compareOverrides?.admin,
          },
        },
      ],
    },
  ] as Field[];
};

export { pricingFields };
