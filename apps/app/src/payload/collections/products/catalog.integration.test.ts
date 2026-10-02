// @vitest-environment node
import { multiTenantPlugin } from "@payloadcms/plugin-multi-tenant";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { createPackagesCollection } from "@repo/payload-plugin-commerce";
import { describe, it, setTestPayloadConfig } from "@repo/test-kit";
import type { Config } from "@repo/types";
import { expect } from "vitest";

import { Categories } from "../categories";
import { Media } from "../media";
import { Stores } from "../stores";
import { Users } from "../users";
import { Products } from "./index";
import { productFactory } from "./test/factories/productFactory";
import { variantFactory } from "./test/factories/variantFactory";
import { VariantOptions, Variants, VariantTypes } from "./variants";

const packagesCollection = createPackagesCollection();

setTestPayloadConfig({
  editor: lexicalEditor(),
  collections: [
    Users,
    Stores,
    packagesCollection,
    Categories,
    Media,
    VariantTypes,
    VariantOptions,
    Variants,
    Products,
  ],
  plugins: [
    multiTenantPlugin<Config>({
      tenantSelectorLabel: "Store",
      tenantsSlug: "stores",
      collections: {
        categories: { isGlobal: false },
        media: { isGlobal: false },
        packages: { customTenantField: true, isGlobal: false },
        products: { isGlobal: false },
        variantOptions: { isGlobal: false },
        variants: { isGlobal: false },
        variantTypes: { isGlobal: false },
      },
      tenantField: {
        name: "store",
      },
      tenantsArrayField: {
        arrayFieldName: "stores",
        arrayTenantFieldName: "store",
        includeDefaultField: false,
      },
    }),
  ],
});

describe("catalog baseline integration", { timeout: 30_000 }, () => {
  it("builds product and variant documents in-memory without database side effects", async ({
    payload,
  }) => {
    const memoryProduct = productFactory.build({ title: "In-Memory Product" });
    const memoryVariant = variantFactory.build({
      product: memoryProduct.id,
      title: "In-Memory Variant",
    });

    expect(memoryProduct.title).toBe("In-Memory Product");
    expect(memoryVariant.title).toBe("In-Memory Variant");

    const productCount = await payload.count({
      collection: "products",
    });
    const variantCount = await payload.count({
      collection: "variants",
    });

    expect(productCount.totalDocs).toBe(0);
    expect(variantCount.totalDocs).toBe(0);
  });

  it("persists a product to SQLite using productFactory and retrieves it via Local API", async ({
    payload,
  }) => {
    const store = await payload.create({
      collection: "stores",
      data: {
        name: "Test Store",
        slug: "test-store",
        subscription: { status: "trial" },
        theme: "default",
      },
    });

    const pkg = await payload.create({
      collection: "packages",
      data: {
        isDefault: true,
        store: store.id,
        title: "Default Box",
        dimensions: {
          height: 10,
          length: 20,
          width: 15,
        },
        tareWeight: {
          unit: "g",
          value: 100,
        },
      },
    });

    const product = await productFactory.transient({ payload }).create({
      store: store.id,
      title: "Persisted T-Shirt",
      pricing: {
        compareAtPrice: 150_000,
        price: 125_000,
      },
      shipping: {
        package: pkg.id,
        required: true,
        weight: {
          unit: "g",
          value: 350,
        },
      },
    });

    expect(product.id).toBeTypeOf("number");
    expect(product.title).toBe("Persisted T-Shirt");

    const retrieved = await payload.findByID({
      collection: "products",
      id: product.id,
    });

    expect(retrieved.id).toBe(product.id);
    expect(retrieved.title).toBe("Persisted T-Shirt");
    expect(retrieved.slug).toBe(product.slug);
  });

  it("automatically provisions default variant when creating physical product via productFactory", async ({
    payload,
  }) => {
    const store = await payload.create({
      collection: "stores",
      data: {
        name: "Auto Variant Store",
        slug: "auto-variant-store",
        subscription: { status: "trial" },
        theme: "default",
      },
    });

    const pkg = await payload.create({
      collection: "packages",
      data: {
        isDefault: true,
        store: store.id,
        title: "Auto Box",
        dimensions: {
          height: 10,
          length: 20,
          width: 15,
        },
        tareWeight: {
          unit: "g",
          value: 100,
        },
      },
    });

    const product = await productFactory.transient({ payload }).create({
      store: store.id,
      title: "Physical Hoodie",
      pricing: {
        compareAtPrice: null,
        price: 250_000,
      },
      shipping: {
        package: pkg.id,
        required: true,
        weight: {
          unit: "g",
          value: 750,
        },
      },
    });

    const variantsResult = await payload.find({
      collection: "variants",
      where: {
        product: { equals: product.id },
      },
    });

    expect(variantsResult.docs).toHaveLength(1);
    expect(variantsResult.docs[0]?.title).toBe("Physical Hoodie");
    expect(variantsResult.docs[0]?.pricing.price).toBe(250_000);
  });

  it("persists a variant to SQLite using variantFactory and retrieves it via Local API", async ({
    payload,
  }) => {
    const store = await payload.create({
      collection: "stores",
      data: {
        name: "Variant Store",
        slug: "variant-store",
        subscription: { status: "trial" },
        theme: "default",
      },
    });

    const pkg = await payload.create({
      collection: "packages",
      data: {
        isDefault: true,
        store: store.id,
        title: "Variant Box",
        dimensions: {
          height: 10,
          length: 20,
          width: 15,
        },
        tareWeight: {
          unit: "g",
          value: 100,
        },
      },
    });

    const product = await productFactory.transient({ payload }).create({
      store: store.id,
      title: "Base Product for Variant",
      shipping: {
        package: pkg.id,
        required: true,
        weight: {
          unit: "g",
          value: 300,
        },
      },
    });

    const variant = await variantFactory.transient({ payload }).create({
      product: product.id,
      store: store.id,
      title: "Red / XL",
      pricing: {
        compareAtPrice: 150_000,
        price: 120_000,
      },
      shipping: {
        package: pkg.id,
        required: true,
        weight: {
          unit: "g",
          value: 300,
        },
      },
    });

    expect(variant.id).toBeTypeOf("number");

    const retrievedVariant = await payload.findByID({
      collection: "variants",
      id: variant.id,
    });

    expect(retrievedVariant.id).toBe(variant.id);
    expect(retrievedVariant.title).toBe("Red / XL");
    expect(retrievedVariant.pricing.price).toBe(120_000);
    expect(retrievedVariant.pricing.compareAtPrice).toBe(150_000);
  });
});
