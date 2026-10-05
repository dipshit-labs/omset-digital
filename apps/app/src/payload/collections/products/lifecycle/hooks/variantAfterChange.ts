import type { CollectionAfterChangeHook } from "payload";
import type { Variant } from "@repo/types";

import { extractID } from "payload/shared";

import { cleanupDefaultVariant } from "../variant";

/**
 * Collection afterChange hook for Variants.
 * When an option-bearing variant is confirmed, safely cleans up any optionless Default Variant
 * on the parent Product, preserving the single-to-multi transition safety invariant.
 */
export const variantLifecycleAfterChange: CollectionAfterChangeHook<
  Variant
> = async ({ doc, req }) => {
  if (req.context?.["products:skipDefaultVariantSync"]) {
    return doc;
  }

  const hasOptions = Array.isArray(doc.options) && doc.options.length > 0;
  if (hasOptions && doc.product) {
    const productId = extractID(doc.product);
    if (productId) {
      await cleanupDefaultVariant(productId, req);
    }
  }

  return doc;
};
