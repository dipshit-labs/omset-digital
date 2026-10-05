import type { CollectionBeforeChangeHook } from "payload";
import type { Product } from "@repo/types";

import { stashVirtualData } from "../context";
import { validatePhysicalPackaging } from "../packaging";

/**
 * Lifecycle hook executing before a Product document is changed/created.
 * Enforces packaging validation on physical products and stashes typed virtual
 * catalog data in req.context for downstream variant synchronization.
 */
export const productLifecycleBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  // SAFETY: Collection hook receives incoming document mutation data conforming to Product fields.
  const productData = data as Partial<Product>;
  // SAFETY: Original document matches Product document structure.
  const originalProduct = originalDoc as Partial<Product> | undefined;
  await validatePhysicalPackaging({
    data: productData,
    originalDoc: originalProduct,
    req,
  });

  stashVirtualData(req, {
    inventory: productData.inventory,
    pricing: productData.pricing,
    shipping: productData.shipping,
  });

  return data;
};
