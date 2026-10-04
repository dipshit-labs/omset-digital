import type { Product } from "@repo/types";
import { Factory } from "fishery";
import type { Payload } from "payload";

export interface ProductTransientParams {
  payload?: Payload;
}

export const productFactory = Factory.define<Product, ProductTransientParams>(
  ({ onCreate, sequence, transientParams }) => {
    onCreate(async (product) => {
      if (!transientParams.payload) {
        throw new Error("Payload instance required");
      }
      const {
        createdAt: _createdAt,
        id: _id,
        updatedAt: _updatedAt,
        variants: _variants,
        ...data
      } = product;
      // SAFETY: Payload Local API accepts the stripped document fields for product creation.
      const created = await transientParams.payload.create({
        collection: "products",
        data: data as never,
      });
      // SAFETY: Payload Local API returns persisted document matching Product interface.
      return created as Product;
    });

    return {
      _status: "published",
      createdAt: new Date().toISOString(),
      id: sequence,
      slug: `product-${sequence}`,
      store: 1,
      title: `Product ${sequence}`,
      updatedAt: new Date().toISOString(),
      variantTypes: [],
      inventory: {
        allowBackorder: false,
        barcode: null,
        sku: `SKU-PROD-${sequence}`,
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
