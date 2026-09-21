import type { Validate } from "payload";
import { extractID } from "@/payload/lib/ids";
import type { Product, VariantOption } from "@/payload/payload-types";
import { checkVariantOptionConstraints } from "./constraints";

const validateVariantOptions: Validate = async (value, { req, data }) => {
  if (!data?.product) {
    return "A product is required.";
  }

  const productId = extractID<Product>(data.product);

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

  const selectedIDs = value.map((option) => extractID<VariantOption>(option));

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
    (variant) =>
      variant.options?.map((option) => extractID<VariantOption>(option)) ?? []
  );

  return checkVariantOptionConstraints({
    variantTypeIDs,
    selectedIDs,
    existingCombinations,
  });
};

export { validateVariantOptions };
