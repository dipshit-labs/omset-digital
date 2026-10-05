import type { Payload } from "payload";
import type { Variant } from "@repo/types";

import { Factory } from "fishery";

export interface VariantTransientParams {
  payload?: Payload;
}

export const variantFactory = Factory.define<Variant, VariantTransientParams>(
  ({ onCreate, sequence, transientParams }) => {
    onCreate(async (variant) => {
      if (!transientParams.payload) {
        throw new Error("Payload instance required");
      }
      const {
        createdAt: _createdAt,
        id: _id,
        updatedAt: _updatedAt,
        ...data
      } = variant;
      // SAFETY: Payload Local API accepts the stripped document fields for variant creation.
      const created = await transientParams.payload.create({
        collection: "variants",
        data: data as never,
      });
      // SAFETY: Payload Local API returns persisted document matching Variant interface.
      return created as Variant;
    });

    return {
      id: sequence,
      _status: "published",
      createdAt: new Date().toISOString(),
      options: [],
      product: 1,
      store: 1,
      title: `Variant ${sequence}`,
      updatedAt: new Date().toISOString(),
      inventory: {
        allowBackorder: false,
        barcode: null,
        sku: `SKU-VAR-${sequence}`,
        stock: 10,
        tracked: true,
      },
      pricing: {
        compareAtPrice: null,
        price: 100_000,
      },
      shipping: {
        package: 1,
        required: true,
        weight: {
          unit: "g",
          value: 500,
        },
      },
    };
  }
);
