import type { CollectionBeforeChangeHook } from "payload";
import { normalizeShipping } from "../lib/normalizeShipping";
import { resolveDefaultPackage } from "../lib/resolveDefaultPackage";
import type { RawShipping } from "../lib/types";

export const handleVariantShipping: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  if (!data.shipping) {
    return data;
  }

  const normalized = normalizeShipping(
    data.shipping as RawShipping,
    originalDoc?.shipping as RawShipping | undefined
  );

  if (normalized.required && !normalized.package) {
    const tenantRaw = data.tenant ?? originalDoc?.tenant;
    normalized.package = await resolveDefaultPackage(req, tenantRaw);
  }

  data.shipping = normalized;
  return data;
};
