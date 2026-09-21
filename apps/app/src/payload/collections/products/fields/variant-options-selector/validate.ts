import type { Validate } from "payload";
import { extractID } from "@/payload/lib/ids";
import type { Product, VariantOption } from "@/payload/payload-types";

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
      select: {
        variantTypes: true,
      },
    });
  } catch {
    return true;
  }

  if (!product) {
    return true;
  }

  const variantTypeIDs = Array.isArray(product.variantTypes)
    ? product.variantTypes
    : [];

  if (variantTypeIDs.length === 0) {
    return true;
  }

  if (!Array.isArray(value) || value.length === 0) {
    return "At least one variant option is required.";
  }

  if (value.length < variantTypeIDs.length) {
    return "Select exactly one option for each variant type.";
  }

  const selectedOptionIDs = value.map((option) =>
    extractID<VariantOption>(option)
  );

  const existingVariants = await req.payload.find({
    collection: "variants",
    depth: 0,
    draft: true,
    limit: 0,
    overrideAccess: true,
    req,
    select: {
      options: true,
    },
    where: {
      and: [
        {
          product: {
            equals: productId,
          },
        },
        ...(data.id
          ? [
              {
                id: {
                  not_equals: data.id,
                },
              },
            ]
          : []),
      ],
    },
  });

  const duplicate = existingVariants.docs.some((variant) => {
    const existingOptionIDs =
      variant.options?.map((option) => extractID<VariantOption>(option)) ?? [];
    return (
      existingOptionIDs.length === selectedOptionIDs.length &&
      existingOptionIDs.every((id) => selectedOptionIDs.includes(id))
    );
  });

  if (duplicate) {
    return "This variant combination already exists for this product.";
  }

  return true;
};

export { validateVariantOptions };
