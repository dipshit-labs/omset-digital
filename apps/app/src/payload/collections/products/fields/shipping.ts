import type { CheckboxField, Field, RelationshipField } from "payload";

import { measurementField } from "@/payload/fields/measurement";
import type { MeasurementFieldOverrides } from "@/payload/fields/measurement";

import { resolveDefaultPackage } from "../lib/resolveDefaultPackage";

interface ShippingFieldsOverrides {
  measurementOverrides?: MeasurementFieldOverrides;
  packageOverrides?: Partial<RelationshipField>;
  requiredOverrides?: Partial<CheckboxField>;
}

interface ShippingFieldsParams {
  overrides?: ShippingFieldsOverrides;
  virtual?: boolean;
}

const shippingFields = ({
  overrides = {},
  virtual = false,
}: ShippingFieldsParams = {}): Field[] => {
  const { packageOverrides, requiredOverrides } = overrides;
  const defaultRequired = requiredOverrides?.defaultValue ?? true;

  // SAFETY: Field definitions and spread overrides satisfy Payload Field union types.
  return [
    // TODO: Create a custom UI to turn this into a Switch instead of checkbox
    {
      defaultValue: true,
      label: "This is a physical product",
      name: "required",
      type: "checkbox",
      ...requiredOverrides,
      virtual,
      admin: {
        readOnly: false,
        ...requiredOverrides?.admin,
      },
    },
    {
      type: "row",
      admin: {
        condition: (data, siblingData) =>
          Boolean(
            siblingData?.required ?? data?.shipping?.required ?? defaultRequired
          ),
      },
      fields: [
        {
          name: "package",
          relationTo: "packages",
          required: true,
          type: "relationship",
          ...packageOverrides,
          virtual,
          defaultValue: async ({ req }) => {
            if (!req?.payload) {
              return null;
            }
            return await resolveDefaultPackage(req);
          },
          admin: {
            readOnly: false,
            width: "60%",
            ...packageOverrides?.admin,
          },
        },
        measurementField({
          label: "Product Weight",
          name: "weight",
          required: true,
          type: "weight",
          overrides: {
            unitOverrides: {
              virtual,
              admin: {
                readOnly: false,
              },
            },
            valueOverrides: {
              virtual,
              admin: {
                readOnly: false,
              },
            },
          },
        }),
      ],
    },
  ] as Field[];
};

export { shippingFields };
