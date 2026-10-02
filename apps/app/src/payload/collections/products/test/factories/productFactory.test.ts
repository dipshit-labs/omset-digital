// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";

import { productFactory } from "./productFactory";

describe("product document factory", () => {
  beforeEach(() => {
    productFactory.rewindSequence();
  });

  it("builds a product document synchronously with default core fields", () => {
    const product = productFactory.build();

    expect(product.id).toBe(1);
    expect(product.title).toBe("Product 1");
    expect(product.slug).toBe("product-1");
    expect(product.store).toBe(1);
    expect(product._status).toBe("published");
  });

  it("builds a product document synchronously with default catalog fields", () => {
    const product = productFactory.build();

    expect(product.pricing).toStrictEqual({
      compareAtPrice: null,
      price: 100_000,
    });
    expect(product.inventory).toStrictEqual({
      allowBackorder: false,
      barcode: null,
      sku: "SKU-PROD-1",
      stock: 10,
      tracked: true,
    });
    expect(product.shipping).toStrictEqual({
      package: 1,
      required: true,
      weight: {
        unit: "g",
        value: 500,
      },
    });
    expect(product.variantTypes).toStrictEqual([]);
  });

  it("increments sequence identifiers on sequential builds", () => {
    const first = productFactory.build();
    const second = productFactory.build();

    expect(first.title).toBe("Product 1");
    expect(first.slug).toBe("product-1");
    expect(first.inventory?.sku).toBe("SKU-PROD-1");

    expect(second.title).toBe("Product 2");
    expect(second.slug).toBe("product-2");
  });

  it("allows overriding specific fields during build", () => {
    const product = productFactory.build({
      _status: "draft",
      slug: "custom-slug",
      store: 42,
      title: "Custom Title",
      pricing: {
        compareAtPrice: 200_000,
        price: 150_000,
      },
    });

    expect(product.title).toBe("Custom Title");
    expect(product.slug).toBe("custom-slug");
    expect(product._status).toBe("draft");
    expect(product.store).toBe(42);
    expect(product.pricing).toStrictEqual({
      compareAtPrice: 200_000,
      price: 150_000,
    });
  });

  it("allows configuring digital products with shipping disabled", () => {
    const product = productFactory.build({
      shipping: {
        package: 0,
        required: false,
        weight: {
          unit: "g",
          value: 0,
        },
      },
    });

    expect(product.shipping?.required).toBeFalsy();
    expect(product.shipping?.weight.value).toBe(0);
  });

  it("allows configuring relationship fields", () => {
    const product = productFactory.build({
      category: 5,
      relatedProducts: [10, 11],
      variantTypes: [2, 3],
    });

    expect(product.category).toBe(5);
    expect(product.variantTypes).toStrictEqual([2, 3]);
    expect(product.relatedProducts).toStrictEqual([10, 11]);
  });

  it("throws an error when create is called without transient payload", async () => {
    await expect(productFactory.create()).rejects.toThrow(
      "Payload instance required"
    );
  });

  it("throws an error when transient is called without payload property", async () => {
    await expect(productFactory.transient({}).create()).rejects.toThrow(
      "Payload instance required"
    );
  });
});
