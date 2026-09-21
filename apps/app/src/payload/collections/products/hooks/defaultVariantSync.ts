import type {
  CollectionAfterChangeHook,
  CollectionAfterReadHook,
  CollectionBeforeChangeHook,
  PayloadRequest,
} from "payload";
import { extractID } from "@/payload/lib/ids";
import type { Product, Tenant } from "@/payload/payload-types";
import { normalizeShipping } from "../lib/normalizeShipping";
import type { RawShipping } from "../lib/types";

const VIRTUAL_DATA_KEY = "products:defaultVariant:virtualData";

interface VirtualData {
  inventory?: Product["inventory"];
  pricing?: Product["pricing"];
  shipping?: Product["shipping"];
}

function extractPricing(raw: Product["pricing"]) {
  if (!raw) {
    return;
  }
  return {
    compareAtPrice: raw.compareAtPrice ?? null,
    price: typeof raw.price === "number" ? raw.price : 0,
  };
}

function extractInventory(raw: Product["inventory"]) {
  if (!raw) {
    return;
  }
  return {
    allowBackorder: raw.allowBackorder ?? false,
    barcode: raw.barcode ?? "",
    sku: raw.sku ?? "",
    stock: typeof raw.stock === "number" ? raw.stock : 0,
    tracked: typeof raw.tracked === "boolean" ? raw.tracked : true,
  };
}

function extractVariantData(doc: Product, req: PayloadRequest) {
  // Virtual fields are stripped from `doc` by afterChange time; the beforeChange
  // hook stashes them in req.context under VIRTUAL_DATA_KEY so they survive.
  const stashed = req.context?.[VIRTUAL_DATA_KEY] as VirtualData | undefined;

  const rawPricing = stashed?.pricing ?? doc.pricing;
  const rawInventory = stashed?.inventory ?? doc.inventory;
  const rawShipping = stashed?.shipping ?? doc.shipping;

  return {
    inventory: extractInventory(rawInventory),
    pricing: extractPricing(rawPricing),
    shipping: rawShipping
      ? normalizeShipping(rawShipping as RawShipping)
      : undefined,
    title: doc.title || "Default Variant",
  };
}

async function cleanupDefaultVariant(
  productId: Product["id"],
  req: PayloadRequest
): Promise<void> {
  const existing = await req.payload.find({
    collection: "variants",
    depth: 0,
    draft: true,
    overrideAccess: true,
    req,
    select: { options: true },
    where: { product: { equals: productId } },
  });

  const defaultVariant = existing.docs.find(
    (v) => !Array.isArray(v.options) || v.options.length === 0
  );

  if (defaultVariant && existing.docs.length > 1) {
    await req.payload.delete({
      collection: "variants",
      context: { ...req.context, "products:skipDefaultVariantSync": true },
      id: defaultVariant.id,
      overrideAccess: true,
      req,
    });
  }
}

async function upsertDefaultVariant(
  doc: Product,
  req: PayloadRequest
): Promise<void> {
  const existing = await req.payload.find({
    collection: "variants",
    depth: 0,
    draft: true,
    limit: 1,
    overrideAccess: true,
    req,
    select: { title: true },
    where: { product: { equals: doc.id } },
  });

  const tenantId = doc.tenant ? extractID<Tenant>(doc.tenant) : null;
  const variantData = extractVariantData(doc, req);
  const [existingVariant] = existing.docs;
  const isDraft = doc._status === "draft";

  const syncContext = {
    ...req.context,
    "products:skipDefaultVariantSync": true,
    skipMediaSync: true,
  };

  if (existingVariant) {
    await req.payload.update({
      collection: "variants",
      context: syncContext,
      data: variantData as never,
      draft: isDraft,
      id: existingVariant.id,
      overrideAccess: true,
      req,
    });
  } else if (isDraft) {
    await req.payload.create({
      collection: "variants",
      context: syncContext,
      data: {
        ...variantData,
        options: [],
        product: doc.id,
        tenant: tenantId,
      } as never,
      draft: true,
      overrideAccess: true,
      req,
    });
  } else {
    await req.payload.create({
      collection: "variants",
      context: syncContext,
      data: {
        ...variantData,
        options: [],
        pricing: variantData.pricing ?? { compareAtPrice: null, price: 0 },
        product: doc.id,
        tenant: tenantId,
      } as never,
      draft: false,
      overrideAccess: true,
      req,
    });
  }

  // Reflect saved values back onto the product doc for the response.
  doc.pricing = variantData.pricing;
  doc.inventory = variantData.inventory;
  doc.shipping = variantData.shipping as Product["shipping"];
}

export const defaultVariantBeforeChange: CollectionBeforeChangeHook = ({
  data,
  req,
}) => {
  req.context[VIRTUAL_DATA_KEY] = {
    inventory: data.inventory,
    pricing: data.pricing,
    shipping: data.shipping,
  } satisfies VirtualData;
  return data;
};

export const defaultVariantAfterChange: CollectionAfterChangeHook<
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

export const defaultVariantAfterRead: CollectionAfterReadHook<
  Product
> = async ({ doc, req }) => {
  if (
    !doc.id ||
    (Array.isArray(doc.variantTypes) && doc.variantTypes.length > 0)
  ) {
    return doc;
  }

  const result = await req.payload.find({
    collection: "variants",
    depth: 0,
    draft: true,
    limit: 1,
    overrideAccess: true,
    req,
    select: { inventory: true, pricing: true, shipping: true },
    where: { product: { equals: doc.id } },
  });

  const [variant] = result.docs;
  if (variant) {
    doc.pricing = variant.pricing;
    doc.inventory = variant.inventory;
    doc.shipping = variant.shipping;
  }

  return doc;
};
