import type {
  CollectionAfterChangeHook,
  PayloadRequest,
  RequestContext,
} from "payload";
import type { RawShipping } from "../packaging";
import type { Package, Product, Variant } from "@repo/types";

import { extractID } from "payload/shared";

import { getStashedVirtualData } from "../context";
import { normalizeShipping } from "../packaging";
import { resolveDocumentStoreId } from "../store";
import { cleanupDefaultVariant, findDefaultVariant } from "../variant";

const resolveCompareAtPrice = (
  raw?: Product["pricing"],
  existing?: Variant["pricing"]
): number | null => {
  if (typeof raw?.compareAtPrice === "number") {
    return raw.compareAtPrice;
  }
  if (raw?.compareAtPrice === null) {
    return null;
  }
  return existing?.compareAtPrice ?? null;
};

const resolvePrice = (
  raw?: Product["pricing"],
  existing?: Variant["pricing"]
): number => {
  if (typeof raw?.price === "number") {
    return raw.price;
  }
  if (typeof existing?.price === "number") {
    return existing.price;
  }
  return 0;
};

const extractPricing = (
  raw?: Product["pricing"],
  existing?: Variant["pricing"]
): Variant["pricing"] => ({
  compareAtPrice: resolveCompareAtPrice(raw, existing),
  price: resolvePrice(raw, existing),
});

const resolveBoolean = (val: unknown, fallback: boolean): boolean =>
  typeof val === "boolean" ? val : fallback;

const resolveString = (val: unknown, fallback: string): string =>
  typeof val === "string" ? val : fallback;

const resolveNumber = (val: unknown, fallback: number): number =>
  typeof val === "number" ? val : fallback;

const extractInventory = (
  raw?: Product["inventory"],
  existing?: Variant["inventory"]
): Variant["inventory"] => ({
  barcode: resolveString(raw?.barcode, existing?.barcode ?? ""),
  sku: resolveString(raw?.sku, existing?.sku ?? ""),
  stock: resolveNumber(raw?.stock, existing?.stock ?? 0),
  tracked: resolveBoolean(raw?.tracked, existing?.tracked ?? true),
  allowBackorder: resolveBoolean(
    raw?.allowBackorder,
    existing?.allowBackorder ?? false
  ),
});

const extractShipping = (
  raw?: Product["shipping"] | RawShipping,
  existing?: Variant["shipping"]
): Variant["shipping"] | undefined => {
  const rawShipping = raw ?? existing;
  if (!rawShipping) {
    return undefined;
  }

  // SAFETY: Raw and existing shipping match the RawShipping shape accepted by normalizeShipping.
  const normalized = normalizeShipping(
    rawShipping as RawShipping,
    existing as RawShipping
  );

  return {
    // SAFETY: Package relationship accepts ID or Package object matching Variant schema.
    package: normalized.package as Package | number,
    required: normalized.required,
    weight: normalized.weight,
  };
};

type VariantMutationPayload = Partial<
  Omit<Variant, "createdAt" | "id" | "store" | "updatedAt">
> & {
  _status?: string;
  store?: number | string | null;
};

interface VariantPayloadResult {
  isDraft: boolean;
  payload: VariantMutationPayload;
}

const buildVariantPayload = (
  doc: Product,
  req: PayloadRequest,
  existingVariant?: Variant
): VariantPayloadResult => {
  const stashed = getStashedVirtualData(req);
  const rawPricing = stashed?.pricing ?? doc.pricing;
  const rawInventory = stashed?.inventory ?? doc.inventory;
  const rawShipping = stashed?.shipping ?? doc.shipping;

  const isDraft = doc._status === "draft";
  const storeId = resolveDocumentStoreId(doc);

  const payload: VariantMutationPayload = {
    _status: doc._status ?? (isDraft ? "draft" : "published"),
    title: doc.title || "Default Variant",
  };

  if (existingVariant) {
    payload.pricing = extractPricing(rawPricing, existingVariant.pricing);
    payload.inventory = extractInventory(
      rawInventory,
      existingVariant.inventory
    );
    payload.shipping = extractShipping(rawShipping, existingVariant.shipping);
  } else {
    payload.inventory = extractInventory(rawInventory);
    payload.pricing = extractPricing(rawPricing);
    payload.shipping = extractShipping(
      rawShipping ?? { required: true, weight: { unit: "g", value: 0 } }
    );
  }

  if (storeId) {
    payload.store = extractID(storeId);
  }

  return { isDraft, payload };
};

const saveDefaultVariant = async (
  req: PayloadRequest,
  syncContext: RequestContext,
  isDraft: boolean,
  variantPayload: VariantMutationPayload,
  productId: Product["id"],
  existingVariant?: Variant
): Promise<Variant> => {
  if (existingVariant) {
    // SAFETY: variantPayload fields conform to the variants collection schema.
    const updated = await req.payload.update({
      id: existingVariant.id,
      collection: "variants",
      context: syncContext,
      data: variantPayload as never,
      draft: isDraft,
      overrideAccess: true,
      req,
    });
    // SAFETY: Local API update on variants collection returns a Variant document.
    return updated as Variant;
  }

  // SAFETY: creation payload sets options: [] for Default Variant and conforms to variants schema.
  const created = await req.payload.create({
    collection: "variants",
    context: syncContext,
    draft: isDraft,
    overrideAccess: true,
    req,
    data: {
      ...variantPayload,
      options: [],
      product: productId,
    } as never,
  });
  // SAFETY: Local API create on variants collection returns a Variant document.
  return created as Variant;
};

const upsertDefaultVariant = async (
  doc: Product,
  req: PayloadRequest
): Promise<void> => {
  const existingVariant = await findDefaultVariant(req, doc.id, {
    draft: true,
  });

  const { isDraft, payload: variantPayload } = buildVariantPayload(
    doc,
    req,
    existingVariant
  );

  const syncContext: RequestContext = {
    ...req.context,
    "products:skipDefaultVariantSync": true,
    skipMediaSync: true,
  };

  const targetVariant = await saveDefaultVariant(
    req,
    syncContext,
    isDraft,
    variantPayload,
    doc.id,
    existingVariant
  );

  // Reflect synchronized values back onto the product document for response.
  doc.pricing = targetVariant.pricing;
  doc.inventory = targetVariant.inventory;
  doc.shipping = targetVariant.shipping;
};

/**
 * Collection afterChange hook for Products.
 * When a product has no variant types, automatically provisions and synchronizes
 * an optionless Default Variant (options: []) with mirrored publication state.
 */
export const productLifecycleAfterChange: CollectionAfterChangeHook<
  Product
> = async ({ doc, req }) => {
  if (req.context?.["products:skipDefaultVariantSync"]) {
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
