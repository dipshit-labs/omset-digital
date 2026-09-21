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
    draft: true,
    limit: 1,
    overrideAccess: true,
    req,
    select: {
      inventory: true,
      pricing: true,
      shipping: true,
    },
    where: {
      product: { equals: doc.id },
    },
  });

  const [variant] = defaultVariant.docs;
  if (variant) {
    doc.pricing = variant.pricing;
    doc.inventory = variant.inventory;
    doc.shipping = variant.shipping;
  }

  return doc;
};
