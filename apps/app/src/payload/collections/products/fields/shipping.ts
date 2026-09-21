import { getTenantFromCookie } from "@payloadcms/plugin-multi-tenant/utilities";
import type {
  CheckboxField,
  Field,
  NumberField,
  RelationshipField,
} from "payload";
import { getCollectionIDType } from "@/payload/lib/ids";

interface ShippingFieldsOverrides {
  isPhysicalProductOverrides?: Partial<CheckboxField>;
  packageOverrides?: Partial<RelationshipField>;
  weightOverrides?: Partial<NumberField>;
}

interface ShippingFieldsParams {
  overrides?: ShippingFieldsOverrides;
  virtual?: boolean;
}

const shippingFields = ({
  virtual = false,
  overrides = {},
}: ShippingFieldsParams = {}): Field[] => {
  const { isPhysicalProductOverrides, packageOverrides, weightOverrides } =
    overrides;

  return [
    {
      defaultValue: true,
      label: "This is a physical product",
      name: "isPhysicalProduct",
      type: "checkbox",
      ...isPhysicalProductOverrides,
      admin: {
        readOnly: false,
        ...isPhysicalProductOverrides?.admin,
      },
      virtual,
    },
    {
      type: "row",
      admin: {
        condition: (data, siblingData) =>
          Boolean(
            siblingData?.isPhysicalProduct ?? data?.isPhysicalProduct ?? true
          ),
      },
      fields: [
        {
          name: "package",
          relationTo: "packages",
          type: "relationship",
          ...packageOverrides,
          admin: {
            readOnly: false,
            ...packageOverrides?.admin,
          },
          defaultValue: async ({ req }) => {
            if (!req?.payload) {
              return null;
            }
            const tenantId = getTenantFromCookie(
              req.headers,
              getCollectionIDType({
                collectionSlug: "tenants",
                payload: req.payload,
              })
            );
            if (!tenantId) {
              return null;
            }
            const defaultPkg = await req.payload.find({
              collection: "packages",
              depth: 0,
              limit: 1,
              overrideAccess: true,
              req,
              select: { isDefault: true },
              where: {
                and: [
                  { tenant: { equals: tenantId } },
                  { isDefault: { equals: true } },
                ],
              },
            });
            return defaultPkg.docs[0]?.id ?? null;
          },
          filterOptions: ({ data, siblingData }) => {
            const dataObj =
              typeof data === "object" && data !== null ? data : undefined;
            const siblingObj =
              typeof siblingData === "object" && siblingData !== null
                ? siblingData
                : undefined;
            const tenant =
              (dataObj && "tenant" in dataObj ? dataObj.tenant : undefined) ??
              (siblingObj && "tenant" in siblingObj
                ? siblingObj.tenant
                : undefined);
            const tenantId =
              typeof tenant === "object" && tenant !== null && "id" in tenant
                ? tenant.id
                : tenant;
            if (!tenantId) {
              return true;
            }
            return {
              tenant: { equals: tenantId },
            };
          },
          validate: (
            value: unknown,
            { siblingData }: { siblingData?: Record<string, unknown> }
          ) => {
            const isPhysical =
              typeof siblingData?.isPhysicalProduct === "boolean"
                ? siblingData.isPhysicalProduct
                : true;
            if (isPhysical && !value) {
              return "Package is required for physical products";
            }
            return true;
          },
          virtual,
        },
        {
          defaultValue: 0,
          min: 0,
          name: "weight",
          type: "number",
          admin: {
            description: "Weight in grams",
            placeholder: "0",
            readOnly: false,
            ...weightOverrides?.admin,
          },
          ...weightOverrides,
          validate: (
            value: unknown,
            { siblingData }: { siblingData?: Record<string, unknown> }
          ) => {
            const isPhysical =
              typeof siblingData?.isPhysicalProduct === "boolean"
                ? siblingData.isPhysicalProduct
                : true;
            if (isPhysical) {
              if (value === undefined || value === null || value === "") {
                return "Weight is required for physical products";
              }
              if (typeof value === "number" && value < 0) {
                return "Weight cannot be negative";
              }
            }
            return true;
          },
          virtual,
        },
      ],
    },
  ] as Field[];
};

export { shippingFields };
