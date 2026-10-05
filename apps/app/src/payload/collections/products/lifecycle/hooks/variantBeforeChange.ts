import type { CollectionBeforeChangeHook } from "payload";
import type { RawShipping } from "../packaging";
import type { Variant } from "@repo/types";

import { normalizeShipping, resolveDefaultPackage } from "../packaging";
import { resolveDocumentStoreId } from "../store";
import { deriveVariantTitle } from "../variant";

/**
 * Collection beforeChange hook for Variants.
 * - Automatically derives readable administrative titles (e.g. "Small / Red") for option-bearing variants.
 * - Normalizes shipping and resolves the Store default package when omitted on physical variants.
 */
export const variantLifecycleBeforeChange: CollectionBeforeChangeHook<
  Variant
> = async ({ data, originalDoc, req }) => {
  if (Array.isArray(data.options) && data.options.length > 0) {
    const derivedTitle = await deriveVariantTitle(data.options, req);
    if (derivedTitle) {
      data.title = derivedTitle;
    }
  }

  if (data.shipping) {
    // SAFETY: data.shipping and originalDoc.shipping conform to RawShipping for normalization.
    const normalized = normalizeShipping(
      data.shipping as RawShipping,
      originalDoc?.shipping as RawShipping | undefined
    );

    if (normalized.required && !normalized.package) {
      const storeId = resolveDocumentStoreId(data, originalDoc);
      if (storeId) {
        normalized.package = await resolveDefaultPackage(req, storeId);
      }
    }
    // SAFETY: Normalized package relationship (number or null) conforms to Payload runtime shipping group schema.
    data.shipping = normalized as Variant["shipping"];
  }

  return data;
};
