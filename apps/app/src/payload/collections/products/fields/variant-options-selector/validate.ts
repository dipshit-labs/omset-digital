import type { Validate } from "payload";

const validateVariantOptions: Validate = async (value, { req, data }) => {
  if (!Array.isArray(value) || value.length === 0) {
    return "At least one variant option is required.";
  }

  if (!data.product) {
    return "A product is required.";
  }

  const product = await req.payload.findByID({
    collection: "products",
    depth: 0,
    id: data.product,
    overrideAccess: true,
    select: {
      variantTypes: true,
    },
  });

  const variantTypeIDs = Array.isArray(product.variantTypes)
    ? product.variantTypes
    : [];

  if (value.length < variantTypeIDs.length) {
    return "Select exactly one option for each variant type.";
  }

  const selectedOptionIDs = value.map((option) =>
    typeof option === "object" ? option.id : option
  );

  const existingVariants = await req.payload.find({
    collection: "variants",
    depth: 0,
    limit: 0,
    overrideAccess: true,
    where: {
      and: [
        {
          product: {
            equals: data.product,
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
    const existingOptionIDs = variant.options.map((option) =>
      typeof option === "object" ? option.id : option
    );

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
