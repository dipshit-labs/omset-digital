import type { CheckboxField, Field, RelationshipField } from "payload";
import {
  type MeasurementFieldOverrides,
  measurementField,
} from "@/payload/fields/measurement";
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
  virtual = false,
  overrides = {},
}: ShippingFieldsParams = {}): Field[] => {
  const { packageOverrides, requiredOverrides } = overrides;
  const defaultRequired = requiredOverrides?.defaultValue ?? true;

  return [
    // TODO: Create a custom UI to turn this into a Switch instead of checkbox
    {
      defaultValue: true,
      label: "This is a physical product",
      name: "required",
      type: "checkbox",
      ...requiredOverrides,
      admin: {
        readOnly: false,
        ...requiredOverrides?.admin,
      },
      virtual,
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
          admin: {
            readOnly: false,
            width: "60%",
            ...packageOverrides?.admin,
          },
          defaultValue: async ({ req }) => {
            if (!req?.payload) {
              return null;
            }
            return await resolveDefaultPackage(req);
          },
          virtual,
        },
        measurementField({
          label: "Product Weight",
          name: "weight",
          required: true,
          type: "weight",
          overrides: {
            unitOverrides: {
              admin: {
                readOnly: false,
              },
              virtual,
            },
            valueOverrides: {
              admin: {
                readOnly: false,
              },
              virtual,
            },
          },
        }),
      ],
    },
  ] as Field[];
};

export { shippingFields };
