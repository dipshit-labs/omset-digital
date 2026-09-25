import type { Validate } from "payload";
import { extractID } from "payload/shared";

import { checkVariantOptionConstraints } from "./constraints";

const validateVariantOptions: Validate = async (value, { data, req }) => {
  if (!data?.product) {
    return "A product is required.";
  }

  const productId = extractID(data.product);
  if (!productId) {
    return "A product is required.";
  }

  let product: { variantTypes?: unknown } | null = null;
  try {
    product = await req.payload.findByID({
      collection: "products",
      depth: 0,
      draft: true,
      id: productId,
      overrideAccess: true,
      req,
      select: { variantTypes: true },
    });
  } catch {
    return true;
  }

  if (!product) {
    return true;
  }

  // SAFETY: product.variantTypes with depth:0 is an array of ID values.
  const variantTypeIDs = Array.isArray(product.variantTypes)
    ? (product.variantTypes as (number | string)[])
    : [];

  if (variantTypeIDs.length === 0) {
    return true;
  }

  if (!Array.isArray(value) || value.length === 0) {
    return checkVariantOptionConstraints({
      existingCombinations: [],
      selectedIDs: [],
      variantTypeIDs,
    });
  }

  const selectedIDs = value.map((option) => extractID(option));

  const existing = await req.payload.find({
    collection: "variants",
    depth: 0,
    draft: true,
    limit: 0,
    overrideAccess: true,
    req,
    select: { options: true },
    where: {
      and: [
        { product: { equals: productId } },
        ...(data.id ? [{ id: { not_equals: data.id } }] : []),
      ],
    },
  });

  const existingCombinations = existing.docs.map(
    (variant) => variant.options?.map((option) => extractID(option)) ?? []
  );

  return checkVariantOptionConstraints({
    existingCombinations,
    selectedIDs,
    variantTypeIDs,
  });
};

export { validateVariantOptions };
