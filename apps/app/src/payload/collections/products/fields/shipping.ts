import type { CheckboxField, Field, RelationshipField } from "payload";
import type { MeasurementFieldOverrides } from "@/payload/fields/measurement";

import { measurementField } from "@/payload/fields/measurement";
import { resolveDefaultPackage } from "../lifecycle/packaging";

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
      name: "required",
      type: "checkbox",
      defaultValue: virtual ? undefined : defaultRequired,
      label: "This is a physical product",
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
          type: "relationship",
          relationTo: "packages",
          required: true,
          ...packageOverrides,
          virtual,
          admin: {
            readOnly: false,
            width: "60%",
            ...packageOverrides?.admin,
          },
          defaultValue: virtual
            ? undefined
            : async ({ req }) => {
                if (!req?.payload) {
                  return null;
                }
                return await resolveDefaultPackage(req);
              },
        },
        measurementField({
          name: "weight",
          type: "weight",
          label: "Product Weight",
          required: true,
          overrides: {
            unitOverrides: {
              virtual,
              admin: {
                readOnly: false,
              },
            },
            valueOverrides: {
              defaultValue: virtual ? undefined : 0,
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
