import type { Config } from "@repo/types";

import { multiTenantPlugin } from "@payloadcms/plugin-multi-tenant";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { expect } from "vitest";

import { Categories } from "@/payload/collections/categories";
import { Media } from "@/payload/collections/media";
import { Products } from "@/payload/collections/products";
import { getStashedVirtualData } from "@/payload/collections/products/lifecycle";
import {
  VariantOptions,
  Variants,
  VariantTypes,
} from "@/payload/collections/products/variants";
import { Stores } from "@/payload/collections/stores";
import { Users } from "@/payload/collections/users";
import { createPackagesCollection } from "@repo/payload-plugin-commerce";
import { createTestReq, integrationSuite } from "@repo/test-kit";
import { productFactory } from "../factories/productFactory";
import { variantFactory } from "../factories/variantFactory";

const packagesCollection = createPackagesCollection();

const { describe, it } = integrationSuite({
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
      id: product.id,
      collection: "products",
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
      id: variant.id,
      collection: "variants",
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
      id: product.id,
      collection: "products",
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
      id: product.id,
      collection: "products",
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

  it("updates existing default variant when updating product virtual fields without creating duplicates", async ({
    payload,
  }) => {
    const store = await payload.create({
      collection: "stores",
      data: {
        name: "No Dup Store",
        slug: "no-dup-store",
        subscription: { status: "trial" },
        theme: "default",
      },
    });

    const pkg = await payload.create({
      collection: "packages",
      data: {
        dimensions: { height: 10, length: 20, width: 15 },
        isDefault: true,
        store: store.id,
        tareWeight: { unit: "g", value: 100 },
        title: "Standard Package",
      },
    });

    const product = await payload.create({
      collection: "products",
      // SAFETY: Creation payload with initial virtual fields for single-variant product.
      data: {
        _status: "published",
        slug: "single-variant-updates",
        store: store.id,
        title: "Original Single Product",
        inventory: {
          sku: "ORIG-SKU-99",
          stock: 10,
          tracked: true,
        },
        pricing: {
          compareAtPrice: 120_000,
          price: 100_000,
        },
        shipping: {
          package: pkg.id,
          required: true,
          weight: { unit: "g", value: 200 },
        },
      } as never,
    });

    const initialVariants = await payload.find({
      collection: "variants",
      where: { product: { equals: product.id } },
    });
    expect(initialVariants.docs).toHaveLength(1);
    const initialVariantId = initialVariants.docs[0]?.id;

    // Update virtual pricing and inventory on the parent product
    await payload.update({
      id: product.id,
      collection: "products",
      draft: false,
      data: {
        title: "Updated Single Product",
        inventory: {
          stock: 25,
        },
        pricing: {
          compareAtPrice: 180_000,
          price: 150_000,
        },
      } as never,
    });

    const afterUpdateVariants = await payload.find({
      collection: "variants",
      where: { product: { equals: product.id } },
    });

    // Crucial check: exactly one variant must exist (no duplicate created)
    expect(afterUpdateVariants.docs).toHaveLength(1);
    const [updatedVariant] = afterUpdateVariants.docs;
    expect(updatedVariant?.id).toBe(initialVariantId);
    expect(updatedVariant?.title).toBe("Updated Single Product");
    expect(updatedVariant).toMatchObject({
      inventory: {
        sku: "ORIG-SKU-99",
        stock: 25,
      },
      pricing: {
        compareAtPrice: 180_000,
        price: 150_000,
      },
      shipping: {
        weight: { value: 200 },
      },
    });
  });

  it("provisions default variant in draft mode for draft products", async ({
    payload,
  }) => {
    const store = await payload.create({
      collection: "stores",
      data: {
        name: "Draft Mirror Store",
        slug: "draft-mirror-store",
        subscription: { status: "trial" },
        theme: "default",
      },
    });

    const pkg = await payload.create({
      collection: "packages",
      data: {
        dimensions: { height: 10, length: 20, width: 15 },
        isDefault: true,
        store: store.id,
        tareWeight: { unit: "g", value: 100 },
        title: "Draft Mirror Box",
      },
    });

    const draftProduct = await payload.create({
      collection: "products",
      draft: true,
      // SAFETY: Draft creation payload containing virtual catalog fields.
      data: {
        pricing: { price: 80_000 },
        slug: "draft-hoodie",
        store: store.id,
        title: "Draft Hoodie",
        shipping: {
          package: pkg.id,
          required: true,
          weight: { unit: "g", value: 300 },
        },
      } as never,
    });

    expect(draftProduct._status).toBe("draft");

    const draftVariants = await payload.find({
      collection: "variants",
      draft: true,
      where: { product: { equals: draftProduct.id } },
    });
    expect(draftVariants.docs).toHaveLength(1);
    const [draftVariant] = draftVariants.docs;
    expect(draftVariant?._status).toBe("draft");

    const publishedVariantsBefore = await payload.find({
      collection: "variants",
      where: {
        _status: { equals: "published" },
        product: { equals: draftProduct.id },
      },
    });
    expect(publishedVariantsBefore.docs).toHaveLength(0);
  });

  it("synchronizes default variant to published when publishing draft product", async ({
    payload,
  }) => {
    const store = await payload.create({
      collection: "stores",
      data: {
        name: "Publish Mirror Store",
        slug: "publish-mirror-store",
        subscription: { status: "trial" },
        theme: "default",
      },
    });

    const pkg = await payload.create({
      collection: "packages",
      data: {
        dimensions: { height: 10, length: 20, width: 15 },
        isDefault: true,
        store: store.id,
        tareWeight: { unit: "g", value: 100 },
        title: "Publish Mirror Box",
      },
    });

    const draftProduct = await payload.create({
      collection: "products",
      draft: true,
      // SAFETY: Draft creation payload containing virtual catalog fields.
      data: {
        pricing: { price: 80_000 },
        slug: "draft-tshirt",
        store: store.id,
        title: "Draft T-Shirt",
        shipping: {
          package: pkg.id,
          required: true,
          weight: { unit: "g", value: 300 },
        },
      } as never,
    });

    const publishedProduct = await payload.update({
      id: draftProduct.id,
      collection: "products",
      draft: false,
      data: {
        _status: "published",
      },
    });

    expect(publishedProduct._status).toBe("published");

    const publishedVariantsAfter = await payload.find({
      collection: "variants",
      draft: false,
      where: { product: { equals: draftProduct.id } },
    });
    expect(publishedVariantsAfter.docs).toHaveLength(1);
    const [publishedVariant] = publishedVariantsAfter.docs;
    expect(publishedVariant?._status).toBe("published");
    expect(publishedVariant?.pricing.price).toBe(80_000);
  });

  it("hydrates virtual pricing, inventory, and shipping fields on product read operations", async ({
    payload,
  }) => {
    const store = await payload.create({
      collection: "stores",
      data: {
        name: "Hydration Store",
        slug: "hydration-store",
        subscription: { status: "trial" },
        theme: "default",
      },
    });

    const pkg = await payload.create({
      collection: "packages",
      data: {
        dimensions: { height: 10, length: 20, width: 15 },
        isDefault: true,
        store: store.id,
        tareWeight: { unit: "g", value: 100 },
        title: "Hydration Package",
      },
    });

    const product = await payload.create({
      collection: "products",
      // SAFETY: Creation payload containing virtual fields to be hydrated on subsequent reads.
      data: {
        slug: "hydrated-product",
        store: store.id,
        title: "Hydrated Product",
        inventory: {
          allowBackorder: false,
          barcode: "1234567890",
          sku: "HYDRATE-SKU-1",
          stock: 42,
          tracked: true,
        },
        pricing: {
          compareAtPrice: 110_000,
          price: 95_000,
        },
        shipping: {
          package: pkg.id,
          required: true,
          weight: { unit: "g", value: 450 },
        },
      } as never,
    });

    // Retrieve via findByID
    const retrieved = await payload.findByID({
      id: product.id,
      collection: "products",
    });

    expect(retrieved.pricing).toMatchObject({
      compareAtPrice: 110_000,
      price: 95_000,
    });
    expect(retrieved.inventory).toMatchObject({
      allowBackorder: false,
      barcode: "1234567890",
      sku: "HYDRATE-SKU-1",
      stock: 42,
      tracked: true,
    });
    expect(retrieved.shipping).toMatchObject({
      required: true,
      weight: { unit: "g", value: 450 },
    });

    // Retrieve via find
    const findResult = await payload.find({
      collection: "products",
      where: { id: { equals: product.id } },
    });
    expect(findResult.docs).toHaveLength(1);
    const [foundProduct] = findResult.docs;
    expect(foundProduct).toMatchObject({
      inventory: { stock: 42 },
      pricing: { price: 95_000 },
    });
  });

  it("executes a complete lifecycle round-trip for create, update, publish, and read", async ({
    payload,
  }) => {
    const store = await payload.create({
      collection: "stores",
      data: {
        name: "Round Trip Store",
        slug: "round-trip-store",
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
        tareWeight: { unit: "g", value: 150 },
        title: "Round Trip Package",
      },
    });

    // 1. Create single-variant Product as draft
    const createdProduct = await payload.create({
      collection: "products",
      draft: true,
      // SAFETY: Draft creation payload containing initial virtual fields.
      data: {
        slug: "round-trip-product",
        store: store.id,
        title: "Round Trip Product",
        inventory: {
          allowBackorder: false,
          barcode: "ROUND-1234",
          sku: "ROUND-TRIP-SKU",
          stock: 50,
          tracked: true,
        },
        pricing: {
          compareAtPrice: 200_000,
          price: 150_000,
        },
        shipping: {
          package: pkg.id,
          required: true,
          weight: { unit: "g", value: 500 },
        },
      } as never,
    });

    expect(createdProduct._status).toBe("draft");

    // 2. Read draft product and verify virtual field hydration
    const draftRead = await payload.findByID({
      id: createdProduct.id,
      collection: "products",
      draft: true,
    });
    expect(draftRead).toMatchObject({
      inventory: { sku: "ROUND-TRIP-SKU", stock: 50 },
      pricing: { compareAtPrice: 200_000, price: 150_000 },
      shipping: { required: true, weight: { value: 500 } },
    });

    // 3. Update virtual fields on the draft product
    await payload.update({
      id: createdProduct.id,
      collection: "products",
      draft: true,
      // SAFETY: Partial update modifying virtual price and stock on draft product.
      data: {
        inventory: {
          stock: 60,
        },
        pricing: {
          compareAtPrice: 220_000,
          price: 175_000,
        },
      } as never,
    });

    // 4. Publish the product
    const publishedProduct = await payload.update({
      id: createdProduct.id,
      collection: "products",
      draft: false,
      data: {
        _status: "published",
      },
    });
    expect(publishedProduct._status).toBe("published");

    // 5. Read published product and verify updated virtual field hydration
    const publishedRead = await payload.findByID({
      id: createdProduct.id,
      collection: "products",
      draft: false,
    });
    expect(publishedRead).toMatchObject({
      inventory: { sku: "ROUND-TRIP-SKU", stock: 60 },
      pricing: { compareAtPrice: 220_000, price: 175_000 },
      shipping: { required: true, weight: { value: 500 } },
    });

    // Verify exactly one variant exists and is published
    const finalVariants = await payload.find({
      collection: "variants",
      draft: false,
      where: { product: { equals: createdProduct.id } },
    });
    expect(finalVariants.docs).toHaveLength(1);
  });
  it("retains the optionless Default Variant when adding variantTypes to single-variant product", async ({
    payload,
  }) => {
    const store = await payload.create({
      collection: "stores",
      data: {
        name: "Transition Store",
        slug: "transition-store",
        subscription: { status: "trial" },
        theme: "default",
      },
    });

    const pkg = await payload.create({
      collection: "packages",
      data: {
        dimensions: { height: 10, length: 20, width: 15 },
        isDefault: true,
        store: store.id,
        tareWeight: { unit: "g", value: 100 },
        title: "Transition Package",
      },
    });

    const sizeType = await payload.create({
      collection: "variantTypes",
      data: {
        name: "size",
        label: "Size",
        store: store.id,
      },
    });

    const product = await payload.create({
      collection: "products",
      // SAFETY: Initial single-variant product creation with virtual fields.
      data: {
        inventory: { stock: 10 },
        pricing: { price: 100_000 },
        slug: "transition-t-shirt",
        store: store.id,
        title: "Transition T-Shirt",
        shipping: {
          package: pkg.id,
          required: true,
          weight: { unit: "g", value: 200 },
        },
      } as never,
    });

    const initialVariants = await payload.find({
      collection: "variants",
      where: { product: { equals: product.id } },
    });
    expect(initialVariants.docs).toHaveLength(1);
    const [defaultVariant] = initialVariants.docs;
    expect(defaultVariant?.options).toStrictEqual([]);

    // Transition to multi-variant by adding variantTypes
    const updatedProduct = await payload.update({
      id: product.id,
      collection: "products",
      data: {
        variantTypes: [sizeType.id],
      },
    });
    expect(updatedProduct.variantTypes).toHaveLength(1);

    // Crucial invariant: Default Variant is retained because no option-bearing variants exist yet
    const midTransitionVariants = await payload.find({
      collection: "variants",
      where: { product: { equals: product.id } },
    });
    expect(midTransitionVariants.docs).toHaveLength(1);
    expect(midTransitionVariants.docs[0]?.id).toBe(defaultVariant?.id);
  });

  it("cleans up optionless Default Variant once an option-bearing variant is confirmed", async ({
    payload,
  }) => {
    const store = await payload.create({
      collection: "stores",
      data: {
        name: "Cleanup Store",
        slug: "cleanup-store",
        subscription: { status: "trial" },
        theme: "default",
      },
    });

    const pkg = await payload.create({
      collection: "packages",
      data: {
        dimensions: { height: 10, length: 20, width: 15 },
        isDefault: true,
        store: store.id,
        tareWeight: { unit: "g", value: 100 },
        title: "Cleanup Package",
      },
    });

    const sizeType = await payload.create({
      collection: "variantTypes",
      data: {
        name: "size",
        label: "Size",
        store: store.id,
      },
    });

    const smallOption = await payload.create({
      collection: "variantOptions",
      data: {
        label: "Small",
        store: store.id,
        value: "small",
        variantType: sizeType.id,
      },
    });

    const product = await payload.create({
      collection: "products",
      // SAFETY: Single-variant product setup before adding variantTypes.
      data: {
        inventory: { stock: 10 },
        pricing: { price: 100_000 },
        slug: "cleanup-t-shirt",
        store: store.id,
        title: "Cleanup T-Shirt",
        shipping: {
          package: pkg.id,
          required: true,
          weight: { unit: "g", value: 200 },
        },
      } as never,
    });

    await payload.update({
      id: product.id,
      collection: "products",
      data: {
        variantTypes: [sizeType.id],
      },
    });

    // Confirm first option-bearing variant
    const optionVariant = await payload.create({
      collection: "variants",
      // SAFETY: Creating confirmed option-bearing variant.
      data: {
        inventory: { stock: 5 },
        options: [smallOption.id],
        pricing: { price: 120_000 },
        product: product.id,
        store: store.id,
        shipping: {
          package: pkg.id,
          required: true,
          weight: { unit: "g", value: 250 },
        },
      } as never,
    });

    // Optionless Default Variant must be cleaned up now that an option-bearing variant is confirmed
    const finalVariants = await payload.find({
      collection: "variants",
      where: { product: { equals: product.id } },
    });
    expect(finalVariants.docs).toHaveLength(1);
    expect(finalVariants.docs[0]?.id).toBe(optionVariant.id);
    expect(finalVariants.docs[0]?.options).toHaveLength(1);
  });

  it("automatically derives and persists readable administrative titles for option-bearing variants", async ({
    payload,
  }) => {
    const store = await payload.create({
      collection: "stores",
      data: {
        name: "Title Store",
        slug: "title-store",
        subscription: { status: "trial" },
        theme: "default",
      },
    });

    const pkg = await payload.create({
      collection: "packages",
      data: {
        dimensions: { height: 10, length: 20, width: 15 },
        isDefault: true,
        store: store.id,
        tareWeight: { unit: "g", value: 100 },
        title: "Title Package",
      },
    });

    const sizeType = await payload.create({
      collection: "variantTypes",
      data: { name: "size", label: "Size", store: store.id },
    });
    const colorType = await payload.create({
      collection: "variantTypes",
      data: { name: "color", label: "Color", store: store.id },
    });

    const smallOption = await payload.create({
      collection: "variantOptions",
      data: {
        label: "Small",
        store: store.id,
        value: "small",
        variantType: sizeType.id,
      },
    });
    const redOption = await payload.create({
      collection: "variantOptions",
      data: {
        label: "Red",
        store: store.id,
        value: "red",
        variantType: colorType.id,
      },
    });

    const multiProduct = await payload.create({
      collection: "products",
      // SAFETY: Creating product with two variant types.
      data: {
        slug: "multi-axis-hoodie",
        store: store.id,
        title: "Multi-Axis Hoodie",
        variantTypes: [sizeType.id, colorType.id],
      } as never,
    });

    // Create variant with two options (Small and Red)
    const twoOptionVariant = await payload.create({
      collection: "variants",
      // SAFETY: Creating multi-option variant.
      data: {
        inventory: { stock: 15 },
        options: [String(smallOption.id), redOption.id],
        pricing: { price: 250_000 },
        product: multiProduct.id,
        store: store.id,
        shipping: {
          package: pkg.id,
          required: true,
          weight: { unit: "g", value: 400 },
        },
      } as never,
    });

    expect(twoOptionVariant.title).toBe("Small / Red");

    // Single-option variant test on single-axis product
    const singleAxisProduct = await payload.create({
      collection: "products",
      // SAFETY: Creating product with single variant type.
      data: {
        slug: "single-axis-cap",
        store: store.id,
        title: "Single Axis Cap",
        variantTypes: [colorType.id],
      } as never,
    });

    const singleOptionVariant = await payload.create({
      collection: "variants",
      // SAFETY: Creating single-option variant.
      data: {
        inventory: { stock: 20 },
        options: [redOption.id],
        pricing: { price: 90_000 },
        product: singleAxisProduct.id,
        store: store.id,
        shipping: {
          package: pkg.id,
          required: true,
          weight: { unit: "g", value: 150 },
        },
      } as never,
    });

    expect(singleOptionVariant.title).toBe("Red");
  });

  it("enforces variant option constraints when creating multi-variant combinations", async ({
    payload,
  }) => {
    const store = await payload.create({
      collection: "stores",
      data: {
        name: "Constraint Store",
        slug: "constraint-store",
        subscription: { status: "trial" },
        theme: "default",
      },
    });

    const pkg = await payload.create({
      collection: "packages",
      data: {
        dimensions: { height: 10, length: 20, width: 15 },
        isDefault: true,
        store: store.id,
        tareWeight: { unit: "g", value: 100 },
        title: "Constraint Package",
      },
    });

    const sizeType = await payload.create({
      collection: "variantTypes",
      data: { name: "size", label: "Size", store: store.id },
    });
    const colorType = await payload.create({
      collection: "variantTypes",
      data: { name: "color", label: "Color", store: store.id },
    });

    const smallOption = await payload.create({
      collection: "variantOptions",
      data: {
        label: "Small",
        store: store.id,
        value: "small",
        variantType: sizeType.id,
      },
    });
    const redOption = await payload.create({
      collection: "variantOptions",
      data: {
        label: "Red",
        store: store.id,
        value: "red",
        variantType: colorType.id,
      },
    });

    const product = await payload.create({
      collection: "products",
      // SAFETY: Creating product with two variant types to test option constraints.
      data: {
        slug: "constraint-test-polo",
        store: store.id,
        title: "Constraint Test Polo",
        variantTypes: [sizeType.id, colorType.id],
      } as never,
    });

    // Incomplete combination: only 1 option provided when 2 variantTypes are configured
    await expect(
      payload.create({
        collection: "variants",
        // SAFETY: Incomplete variant options to test validation rejection.
        data: {
          options: [smallOption.id],
          pricing: { price: 150_000 },
          product: product.id,
          store: store.id,
        } as never,
      })
    ).rejects.toThrow("The following field is invalid: Variant Options");

    // Valid combination succeeds
    await payload.create({
      collection: "variants",
      // SAFETY: Valid variant options combination.
      data: {
        options: [smallOption.id, redOption.id],
        pricing: { price: 150_000 },
        product: product.id,
        store: store.id,
        shipping: {
          package: pkg.id,
          required: true,
          weight: { unit: "g", value: 300 },
        },
      } as never,
    });

    // Duplicate combination on the same product is rejected
    await expect(
      payload.create({
        collection: "variants",
        // SAFETY: Duplicate variant options combination to test uniqueness rejection.
        data: {
          options: [smallOption.id, redOption.id],
          pricing: { price: 150_000 },
          product: product.id,
          store: store.id,
          shipping: {
            package: pkg.id,
            required: true,
            weight: { unit: "g", value: 300 },
          },
        } as never,
      })
    ).rejects.toThrow("The following field is invalid: Variant Options");
  });
  it("normalizes variant shipping and resolves default package when package is omitted", async ({
    payload,
  }) => {
    const store = await payload.create({
      collection: "stores",
      data: {
        name: "Shipping Store",
        slug: "shipping-store",
        subscription: { status: "trial" },
        theme: "default",
      },
    });

    const defaultPkg = await payload.create({
      collection: "packages",
      data: {
        dimensions: { height: 10, length: 15, width: 10 },
        isDefault: true,
        store: store.id,
        tareWeight: { unit: "g", value: 50 },
        title: "Store Default Package",
      },
    });

    const sizeType = await payload.create({
      collection: "variantTypes",
      data: { name: "size", label: "Size", store: store.id },
    });
    const medOption = await payload.create({
      collection: "variantOptions",
      data: {
        label: "Medium",
        store: store.id,
        value: "medium",
        variantType: sizeType.id,
      },
    });
    const largeOption = await payload.create({
      collection: "variantOptions",
      data: {
        label: "Large",
        store: store.id,
        value: "large",
        variantType: sizeType.id,
      },
    });

    const product = await payload.create({
      collection: "products",
      // SAFETY: Creating product with single variant type for variant shipping testing.
      data: {
        slug: "auto-package-product",
        store: store.id,
        title: "Auto Package Product",
        variantTypes: [sizeType.id],
      } as never,
    });

    // Physical variant without package specified: resolves store default package
    const physicalVariant = await payload.create({
      collection: "variants",
      // SAFETY: Physical variant with omitted package.
      data: {
        options: [medOption.id],
        pricing: { price: 130_000 },
        product: product.id,
        shipping: { required: true, weight: { unit: "g", value: 350 } },
        store: store.id,
      } as never,
    });

    const resolvedPkgId =
      typeof physicalVariant.shipping?.package === "object"
        ? physicalVariant.shipping.package?.id
        : physicalVariant.shipping?.package;
    expect(resolvedPkgId).toBe(defaultPkg.id);
    expect(physicalVariant.shipping?.weight.value).toBe(350);

    // Non-physical digital variant: normalizes weight to 0 and package to null
    const digitalVariant = await payload.create({
      collection: "variants",
      // SAFETY: Digital variant with shipping required=false.
      data: {
        options: [largeOption.id],
        pricing: { price: 50_000 },
        product: product.id,
        shipping: { required: false },
        store: store.id,
      } as never,
    });

    expect(digitalVariant.shipping?.required).toBeFalsy();
    expect(digitalVariant.shipping?.package).toBeNull();
    expect(digitalVariant.shipping?.weight.value).toBe(0);
  });
});
