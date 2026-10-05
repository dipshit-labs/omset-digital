import type { CollectionAfterReadHook } from "payload";
import type { Product } from "@repo/types";

import { findDefaultVariant } from "../variant";
/**
 * Collection afterRead hook for Products.
 * Hydrates virtual catalog fields (pricing, inventory, physical shipping)
 * on single-variant products from the underlying Default Variant document.
 */
export const productLifecycleAfterRead: CollectionAfterReadHook<
  Product
> = async ({ doc, req }) => {
  if (
    !doc?.id ||
    !req?.payload ||
    (Array.isArray(doc.variantTypes) && doc.variantTypes.length > 0)
  ) {
    return doc;
  }

  const isPublished = doc._status === "published";
  const defaultVariant = await findDefaultVariant(req, doc.id, {
    draft: !isPublished,
  });

  if (defaultVariant) {
    doc.pricing = defaultVariant.pricing;
    doc.inventory = defaultVariant.inventory;
    // SAFETY: Default variant shipping matches the Product shipping group structure.
    doc.shipping = defaultVariant.shipping as Product["shipping"];
  }

  return doc;
};
