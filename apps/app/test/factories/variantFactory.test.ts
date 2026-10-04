import { beforeEach, describe, expect, it } from "vitest";

import { variantFactory } from "./variantFactory";

describe("variant document factory", () => {
  beforeEach(() => {
    variantFactory.rewindSequence();
  });

  it("builds a variant document synchronously with default core fields", () => {
    const variant = variantFactory.build();

    expect(variant.id).toBe(1);
    expect(variant.title).toBe("Variant 1");
    expect(variant.product).toBe(1);
    expect(variant.store).toBe(1);
    expect(variant._status).toBe("published");
  });

  it("builds a variant document synchronously with default catalog fields", () => {
    const variant = variantFactory.build();

    expect(variant.options).toStrictEqual([]);
    expect(variant.pricing).toStrictEqual({
      compareAtPrice: null,
      price: 100_000,
    });
    expect(variant.inventory).toStrictEqual({
      allowBackorder: false,
      barcode: null,
      sku: "SKU-VAR-1",
      stock: 10,
      tracked: true,
    });
    expect(variant.shipping).toStrictEqual({
      package: 1,
      required: true,
      weight: {
        unit: "g",
        value: 500,
      },
    });
  });

  it("increments sequence identifiers on sequential builds", () => {
    const first = variantFactory.build();
    const second = variantFactory.build();

    expect(first.title).toBe("Variant 1");
    expect(first.inventory?.sku).toBe("SKU-VAR-1");

    expect(second.title).toBe("Variant 2");
    expect(second.inventory?.sku).toBe("SKU-VAR-2");
  });

  it("allows overriding specific fields during build", () => {
    const variant = variantFactory.build({
      _status: "draft",
      product: 99,
      store: 42,
      title: "Custom Variant",
      pricing: {
        compareAtPrice: 250_000,
        price: 200_000,
      },
    });

    expect(variant.title).toBe("Custom Variant");
    expect(variant.product).toBe(99);
    expect(variant._status).toBe("draft");
    expect(variant.store).toBe(42);
    expect(variant.pricing).toStrictEqual({
      compareAtPrice: 250_000,
      price: 200_000,
    });
  });

  it("allows building option-bearing variants with option relations", () => {
    const variant = variantFactory.build({
      options: [101, 102],
      title: "Small / Red",
    });

    expect(variant.title).toBe("Small / Red");
    expect(variant.options).toStrictEqual([101, 102]);
  });

  it("allows configuring non-physical variants with shipping disabled", () => {
    const variant = variantFactory.build({
      shipping: {
        package: 0,
        required: false,
        weight: {
          unit: "g",
          value: 0,
        },
      },
    });

    expect(variant.shipping.required).toBeFalsy();
    expect(variant.shipping.weight.value).toBe(0);
  });

  it("throws an error when create is called without transient payload", async () => {
    await expect(variantFactory.create()).rejects.toThrow(
      "Payload instance required"
    );
  });

  it("throws an error when transient is called without payload property", async () => {
    await expect(variantFactory.transient({}).create()).rejects.toThrow(
      "Payload instance required"
    );
  });
});
