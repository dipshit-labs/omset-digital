import type { CollectionBeforeChangeHook } from "payload";
import type { Variant } from "@/payload/payload-types";

const generateVariantTitle: CollectionBeforeChangeHook<Variant> = async ({
  req,
  data,
}) => {
  if (
    !(data.product && Array.isArray(data.options)) ||
    data.options.length === 0
  ) {
    return data;
  }

  const productId =
    typeof data.product === "object" ? data.product.id : data.product;

  const product = await req.payload.findByID({
    collection: "products",
    depth: 0,
    id: productId,
    overrideAccess: true,
    select: { title: true },
  });

  const optionLabels = await Promise.all(
    data.options.map(async (option) => {
      if (
        typeof option === "object" &&
        option !== null &&
        "label" in option &&
        typeof option.label === "string"
      ) {
        return option.label;
      }

      const optionId =
        typeof option === "object" && option !== null && "id" in option
          ? option.id
          : option;

      if (typeof optionId !== "string" && typeof optionId !== "number") {
        return null;
      }

      const doc = await req.payload.findByID({
        collection: "variantOptions",
        depth: 0,
        id: optionId,
        overrideAccess: true,
        select: { label: true },
      });

      return doc?.label;
    })
  );

  const parts = [product?.title, ...optionLabels].filter(Boolean);
  data.title = parts.join(" — ");

  return data;
};

export { generateVariantTitle };
