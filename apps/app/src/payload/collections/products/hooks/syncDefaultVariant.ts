import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  PayloadRequest,
} from "payload";
import { extractID } from "@/payload/lib/ids";
import type { Package, Product, Tenant } from "@/payload/payload-types";

function extractShippingData(shipping: Product["shipping"]) {
  if (!shipping) {
    return;
  }

  const shippingObj = shipping as {
    package?: number | { id?: number };
    required?: boolean;
    weight?: { unit?: "g" | "kg"; value?: number };
  };
  const isRequired = shippingObj.required ?? true;
  const packageId = shippingObj.package
    ? extractID<Package>(shippingObj.package as Package | Package["id"])
    : null;
  return {
    package: (packageId ?? null) as unknown as number,
    required: isRequired,
    weight: {
      unit: shipping.weight?.unit ?? "g",
      value: isRequired ? (shipping.weight?.value ?? 0) : 0,
    },
  };
}

function extractVariantData(doc: Product, req: PayloadRequest) {
  const submitted = req.context?.productVirtualData as
    | {
        inventory?: Product["inventory"];
        pricing?: Product["pricing"];
        shipping?: Product["shipping"];
      }
    | undefined;

  const rawPricing = submitted?.pricing ?? doc.pricing;
  const rawInventory = submitted?.inventory ?? doc.inventory;
  const rawShipping = submitted?.shipping ?? doc.shipping;

  const pricing = rawPricing
    ? {
        compareAtPrice: rawPricing.compareAtPrice ?? null,
        price: typeof rawPricing.price === "number" ? rawPricing.price : 0,
      }
    : undefined;

  const inventory = rawInventory
    ? {
        allowBackorder: rawInventory.allowBackorder ?? false,
        barcode: rawInventory.barcode ?? "",
        sku: rawInventory.sku ?? "",
        stock: typeof rawInventory.stock === "number" ? rawInventory.stock : 0,
        tracked:
          typeof rawInventory.tracked === "boolean"
            ? rawInventory.tracked
            : true,
      }
    : undefined;

  return {
    inventory,
    pricing,
    shipping: extractShippingData(rawShipping),
    title: doc.title || "Default Variant",
  };
}

async function cleanupDefaultVariant(
  productId: number | string,
  req: PayloadRequest
): Promise<void> {
  const existingVariants = await req.payload.find({
    collection: "variants",
    depth: 0,
    draft: true,
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
    draft: true,
    limit: 1,
    overrideAccess: true,
    req,
    select: { title: true },
    where: {
      product: { equals: doc.id },
    },
  });
  const tenantId = doc.tenant ? extractID<Tenant>(doc.tenant) : null;

  const variantData = extractVariantData(doc, req);
  const [existingVariant] = existingVariants.docs;
  const isDraft = doc._status === "draft";
  const syncContext = {
    ...req.context,
    skipDefaultVariantSync: true,
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
    doc.pricing = variantData.pricing;
    doc.inventory = variantData.inventory;
    doc.shipping = variantData.shipping;
    return;
  }

  if (isDraft) {
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
    doc.pricing = variantData.pricing;
    doc.inventory = variantData.inventory;
    doc.shipping = variantData.shipping;
    return;
  }

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
  doc.pricing = variantData.pricing;
  doc.inventory = variantData.inventory;
  doc.shipping = variantData.shipping;
}

export const syncDefaultVariantBeforeChange: CollectionBeforeChangeHook = ({
  data,
  req,
}) => {
  req.context.productVirtualData = {
    inventory: data.inventory,
    pricing: data.pricing,
    shipping: data.shipping,
  };
  return data;
};

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
