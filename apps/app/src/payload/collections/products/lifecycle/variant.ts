import type { Product, Variant, VariantOption } from "@repo/types";
import type { PayloadRequest } from "payload";
import { extractID } from "payload/shared";

interface FindDefaultVariantOptions {
  draft?: boolean;
}

export type VariantOptionInput =
  | VariantOption
  | VariantOption["id"]
  | number
  | string;

/**
 * Queries variants for a product and returns the optionless Default Variant if present.
 */
export const findDefaultVariant = async (
  req: PayloadRequest,
  productId: Product["id"],
  options: FindDefaultVariantOptions = {}
): Promise<Variant | undefined> => {
  const { draft = true } = options;

  const result = await req.payload.find({
    collection: "variants",
    depth: 0,
    draft,
    limit: 10,
    overrideAccess: true,
    req,
    sort: "-updatedAt",
    where: { product: { equals: productId } },
  });

  return result.docs.find(
    (v) => !Array.isArray(v.options) || v.options.length === 0
  );
};

/**
 * Automatically derives and formats readable administrative titles (e.g. "Small / Red")
 * for option-bearing variants by joining option labels in order.
 */
type OptionDescriptor =
  | { id: number | string; kind: "id" }
  | { kind: "label"; label: string };

export const deriveVariantTitle = async (
  options: VariantOptionInput[],
  req: PayloadRequest
): Promise<string | undefined> => {
  if (!Array.isArray(options) || options.length === 0) {
    return undefined;
  }

  const descriptors: OptionDescriptor[] = [];
  const missingIds: (number | string)[] = [];

  for (const option of options) {
    if (
      typeof option === "object" &&
      option !== null &&
      "label" in option &&
      typeof option.label === "string" &&
      option.label.length > 0
    ) {
      descriptors.push({ kind: "label", label: option.label });
    } else {
      const id = extractID(option);
      if (typeof id === "string" || typeof id === "number") {
        descriptors.push({ id, kind: "id" });
        missingIds.push(id);
      }
    }
  }

  const fetchedLabels = new Map<string, string>();
  if (missingIds.length > 0) {
    const result = await req.payload.find({
      collection: "variantOptions",
      depth: 0,
      limit: missingIds.length,
      overrideAccess: true,
      req,
      select: { label: true },
      where: { id: { in: missingIds } },
    });

    for (const doc of result.docs) {
      if (typeof doc.label === "string") {
        fetchedLabels.set(String(doc.id), doc.label);
      }
    }
  }

  const labels = descriptors
    .map((desc) =>
      desc.kind === "label" ? desc.label : fetchedLabels.get(String(desc.id))
    )
    .filter((label): label is string => Boolean(label));

  if (labels.length === 0) {
    return undefined;
  }

  return labels.join(" / ");
};

/**
 * Safely removes the optionless Default Variant when at least one option-bearing variant is confirmed.
 * Preserves the invariant that every product has at least one variant.
 */
export const cleanupDefaultVariant = async (
  productId: Product["id"],
  req: PayloadRequest
): Promise<void> => {
  const defaultVariant = await findDefaultVariant(req, productId, {
    draft: true,
  });
  if (!defaultVariant) {
    return;
  }

  const existing = await req.payload.find({
    collection: "variants",
    depth: 0,
    draft: true,
    limit: 50,
    overrideAccess: true,
    req,
    where: { product: { equals: productId } },
  });

  const hasOptionBearingVariant = existing.docs.some(
    (v) => Array.isArray(v.options) && v.options.length > 0
  );

  if (hasOptionBearingVariant) {
    await req.payload.delete({
      collection: "variants",
      context: { ...req.context, "products:skipDefaultVariantSync": true },
      id: defaultVariant.id,
      overrideAccess: true,
      req,
    });
  }
};
