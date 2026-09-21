import type { CollectionAfterChangeHook, PayloadRequest } from "payload";
import type { Product } from "@/payload/payload-types";

async function cleanupDefaultVariant(
  productId: number | string,
  req: PayloadRequest
): Promise<void> {
  const existingVariants = await req.payload.find({
    collection: "variants",
    depth: 0,
    overrideAccess: true,
    req,
    select: { options: true },
    where: {
      product: { equals: productId },
    },
  });

  const defaultVariant = existingVariants.docs.find(
    (v) => !Array.isArray(v.options) || v.options.length === 0
  );

  if (defaultVariant && existingVariants.docs.length > 1) {
    await req.payload.delete({
      collection: "variants",
      id: defaultVariant.id,
      overrideAccess: true,
      context: {
        ...req.context,
        skipDefaultVariantSync: true,
      },
      req,
    });
  }
}

async function upsertDefaultVariant(
  doc: Product,
  req: PayloadRequest
): Promise<void> {
  const existingVariants = await req.payload.find({
    collection: "variants",
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    select: { title: true },
    where: {
      product: { equals: doc.id },
    },
  });

  const tenantId =
    typeof doc.tenant === "object" && doc.tenant !== null
      ? doc.tenant.id
      : doc.tenant;

  const isPhysical =
    "isPhysicalProduct" in doc && typeof doc.isPhysicalProduct === "boolean"
      ? doc.isPhysicalProduct
      : true;

  const packageValue = isPhysical && "package" in doc ? doc.package : null;

  const variantData = {
    allowBackorder: doc.allowBackorder ?? false,
    barcode: doc.barcode ?? "",
    compareAtPrice: doc.compareAtPrice,
    isPhysicalProduct: isPhysical,
    package: packageValue,
    price: typeof doc.price === "number" ? doc.price : 0,
    sku: doc.sku ?? "",
    stock: doc.stock ?? 0,
    title: doc.title || "Default Variant",
    weight: isPhysical && typeof doc.weight === "number" ? doc.weight : 0,
  };

  const [existingVariant] = existingVariants.docs;

  if (existingVariant) {
    await req.payload.update({
      collection: "variants",
      data: variantData,
      draft: doc._status === "draft",
      id: existingVariant.id,
      overrideAccess: true,
      context: {
        ...req.context,
        skipDefaultVariantSync: true,
        skipMediaSync: true,
      },
      req,
    });
  } else {
    await req.payload.create({
      collection: "variants",
      draft: doc._status === "draft",
      overrideAccess: true,
      context: {
        ...req.context,
        skipDefaultVariantSync: true,
        skipMediaSync: true,
      },
      data: {
        ...variantData,
        options: [],
        product: doc.id,
        tenant: tenantId,
      },
      req,
    });
  }
}

export const syncDefaultVariant: CollectionAfterChangeHook<Product> = async ({
  doc,
  req,
}) => {
  if (req.context?.skipDefaultVariantSync) {
    return doc;
  }

  const hasVariantTypes =
    Array.isArray(doc.variantTypes) && doc.variantTypes.length > 0;

  if (hasVariantTypes) {
    await cleanupDefaultVariant(doc.id, req);
    return doc;
  }

  await upsertDefaultVariant(doc, req);
  return doc;
};
