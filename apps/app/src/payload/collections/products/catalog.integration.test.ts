// @vitest-environment node
import { multiTenantPlugin } from "@payloadcms/plugin-multi-tenant";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { createPackagesCollection } from "@repo/payload-plugin-commerce";
import {
  createTestReq,
  describe,
  it,
  setTestPayloadConfig,
} from "@repo/test-kit";
import type { Config } from "@repo/types";
import { expect } from "vitest";

import { Categories } from "../categories";
import { Media } from "../media";
import { Stores } from "../stores";
import { Users } from "../users";
import { Products } from "./index";
import { getStashedVirtualData } from "./lifecycle";
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

  it("throws descriptive validation error when creating physical product without package or store default package", async ({
    payload,
  }) => {
    const store = await payload.create({
      collection: "stores",
      data: {
        name: "No Package Store",
        slug: "no-package-store",
        subscription: { status: "trial" },
        theme: "default",
      },
    });

    await expect(
      payload.create({
        collection: "products",
        // SAFETY: Testing creation payload without package field to assert domain packaging error.
        data: {
          pricing: { price: 100_000 },
          store: store.id,
          title: "Physical Without Package",
          shipping: {
            required: true,
            weight: { unit: "g", value: 500 },
          },
        } as never,
      })
    ).rejects.toThrow(
      "A default shipping package is required for physical products. Please configure a package under Store Settings."
    );
  });

  it("derives store default package when creating physical product without explicit package in payload", async ({
    payload,
  }) => {
    const store = await payload.create({
      collection: "stores",
      data: {
        name: "Default Box Store",
        slug: "default-box-store",
        subscription: { status: "trial" },
        theme: "default",
      },
    });

    const defaultPkg = await payload.create({
      collection: "packages",
      data: {
        dimensions: { height: 10, length: 20, width: 15 },
        isDefault: true,
        store: store.id,
        tareWeight: { unit: "g", value: 50 },
        title: "Auto Store Box",
      },
    });

    const product = await payload.create({
      collection: "products",
      // SAFETY: Testing creation payload with omitted package to assert store default package derivation.
      data: {
        pricing: { price: 200_000 },
        slug: "physical-product-default-box",
        store: store.id,
        title: "Physical Product With Default Box",
        shipping: {
          required: true,
          weight: { unit: "g", value: 600 },
        },
      } as never,
    });

    expect(product.id).toBeTypeOf("number");

    // Verify default variant was provisioned with the resolved default package
    const variantsResult = await payload.find({
      collection: "variants",
      where: { product: { equals: product.id } },
    });
    expect(variantsResult.docs).toHaveLength(1);
    const [defaultVariant] = variantsResult.docs;
    const resolvedPackageId =
      typeof defaultVariant?.shipping?.package === "object"
        ? defaultVariant.shipping.package?.id
        : defaultVariant?.shipping?.package;
    expect(resolvedPackageId).toBe(defaultPkg.id);
  });

  it("creates non-physical digital product without packaging requirements even if store has no package", async ({
    payload,
  }) => {
    const store = await payload.create({
      collection: "stores",
      data: {
        name: "Digital Store",
        slug: "digital-store",
        subscription: { status: "trial" },
        theme: "default",
      },
    });

    const product = await payload.create({
      collection: "products",
      // SAFETY: Testing creation payload for digital non-physical product with shipping disabled.
      data: {
        pricing: { price: 50_000 },
        slug: "e-book-guide",
        store: store.id,
        title: "E-Book Guide",
        shipping: {
          required: false,
        },
      } as never,
    });

    const retrieved = await payload.findByID({
      collection: "products",
      id: product.id,
    });
    expect(retrieved).toMatchObject({
      id: product.id,
      shipping: { required: false },
      title: "E-Book Guide",
    });

    // Check provisioned default variant for digital product
    const variantsResult = await payload.find({
      collection: "variants",
      where: { product: { equals: product.id } },
    });
    const [defaultVariant] = variantsResult.docs;
    expect(defaultVariant?.shipping?.required).toBeFalsy();
  });

  it("resolves store tenant strictly from data.store without request cookies", async ({
    payload,
  }) => {
    const store = await payload.create({
      collection: "stores",
      data: {
        name: "Document Store Tenant",
        slug: "doc-store-tenant",
        subscription: { status: "trial" },
        theme: "default",
      },
    });

    const pkg = await payload.create({
      collection: "packages",
      data: {
        dimensions: { height: 10, length: 10, width: 10 },
        isDefault: true,
        store: store.id,
        tareWeight: { unit: "g", value: 10 },
        title: "Tenant Box",
      },
    });

    // Local API create without any headers / cookies
    const product = await payload.create({
      collection: "products",
      // SAFETY: Document creation payload without HTTP cookie header.
      data: {
        pricing: { price: 75_000 },
        slug: "cookie-free-product",
        store: store.id,
        title: "Cookie-Free Product",
        shipping: {
          package: pkg.id,
          required: true,
          weight: { unit: "g", value: 200 },
        },
      } as never,
    });

    const storeId =
      typeof product.store === "object" ? product.store?.id : product.store;
    expect(storeId).toBe(store.id);
  });

  it("stashes virtual field data in req.context during beforeChange and synchronizes default variant", async ({
    payload,
  }) => {
    const store = await payload.create({
      collection: "stores",
      data: {
        name: "Stash Store",
        slug: "stash-store",
        subscription: { status: "trial" },
        theme: "default",
      },
    });

    const pkg = await payload.create({
      collection: "packages",
      data: {
        dimensions: { height: 12, length: 24, width: 18 },
        isDefault: true,
        store: store.id,
        tareWeight: { unit: "g", value: 80 },
        title: "Stash Box",
      },
    });

    const testReq = createTestReq();

    const product = await payload.create({
      collection: "products",
      req: testReq,
      // SAFETY: Creation payload containing virtual catalog fields for request context stashing.
      data: {
        slug: "stashed-product",
        store: store.id,
        title: "Stashed Product",
        inventory: {
          sku: "STASH-SKU-1",
          stock: 45,
          tracked: true,
        },
        pricing: {
          compareAtPrice: 200_000,
          price: 180_000,
        },
        shipping: {
          package: pkg.id,
          required: true,
          weight: { unit: "g", value: 450 },
        },
      } as never,
    });

    // Verify req.context has stashed virtual data
    const stashed = getStashedVirtualData(testReq);
    expect(stashed).toMatchObject({
      inventory: { stock: 45 },
      pricing: { price: 180_000 },
      shipping: { required: true },
    });

    // Verify default variant synchronized from stashed data
    const variantsResult = await payload.find({
      collection: "variants",
      where: { product: { equals: product.id } },
    });
    const [variant] = variantsResult.docs;
    expect(variant).toMatchObject({
      inventory: { stock: 45 },
      pricing: { compareAtPrice: 200_000, price: 180_000 },
    });
  });

  it("preserves existing package when updating physical product without re-specifying shipping", async ({
    payload,
  }) => {
    const store = await payload.create({
      collection: "stores",
      data: {
        name: "Update Package Store",
        slug: "update-package-store",
        subscription: { status: "trial" },
        theme: "default",
      },
    });

    const customPkg = await payload.create({
      collection: "packages",
      data: {
        dimensions: { height: 15, length: 25, width: 20 },
        isDefault: false,
        store: store.id,
        tareWeight: { unit: "g", value: 120 },
        title: "Custom Specific Box",
      },
    });

    const product = await payload.create({
      collection: "products",
      // SAFETY: Creation payload for physical product with custom package.
      data: {
        pricing: { price: 90_000 },
        slug: "custom-box-item",
        store: store.id,
        title: "Custom Box Item",
        shipping: {
          package: customPkg.id,
          required: true,
          weight: { unit: "g", value: 350 },
        },
      } as never,
    });

    const updated = await payload.update({
      collection: "products",
      id: product.id,
      data: {
        title: "Updated Custom Box Item",
      },
    });

    expect(updated.title).toBe("Updated Custom Box Item");

    const variantsResult = await payload.find({
      collection: "variants",
      where: { product: { equals: product.id } },
    });
    const [variant] = variantsResult.docs;
    const resolvedPackageId =
      typeof variant?.shipping?.package === "object"
        ? variant.shipping.package?.id
        : variant?.shipping?.package;
    expect(resolvedPackageId).toBe(customPkg.id);
  });
});
