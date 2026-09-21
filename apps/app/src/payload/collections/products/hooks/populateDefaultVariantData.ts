import type { CollectionAfterReadHook } from "payload";
import type { Product } from "@/payload/payload-types";

export const populateDefaultVariantData: CollectionAfterReadHook<
  Product
> = async ({ doc, req }) => {
  if (
    !doc.id ||
    (Array.isArray(doc.variantTypes) && doc.variantTypes.length > 0)
  ) {
    return doc;
  }

  const defaultVariant = await req.payload.find({
    collection: "variants",
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    select: {
      allowBackorder: true,
      barcode: true,
      compareAtPrice: true,
      isPhysicalProduct: true,
      package: true,
      price: true,
      sku: true,
      stock: true,
      weight: true,
    },
    where: {
      product: { equals: doc.id },
    },
  });

  const [variant] = defaultVariant.docs;
  if (variant) {
    doc.price = variant.price;
    doc.compareAtPrice = variant.compareAtPrice;
    doc.stock = variant.stock;
    doc.sku = variant.sku;
    doc.barcode = variant.barcode;
    doc.allowBackorder = variant.allowBackorder;
    if ("isPhysicalProduct" in variant) {
      doc.isPhysicalProduct = variant.isPhysicalProduct ?? true;
    }
    doc.package = variant.package;
    doc.weight = variant.weight;
  }

  return doc;
};
