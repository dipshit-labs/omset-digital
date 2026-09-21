import type { CollectionBeforeChangeHook } from "payload";
import { extractID } from "@/payload/lib/ids";
import type { Product, Variant, VariantOption } from "@/payload/payload-types";

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

  const productId = extractID<Product>(data.product);

  let product: { title?: string | null } | null = null;
  try {
    product = await req.payload.findByID({
      collection: "products",
      depth: 0,
      draft: true,
      id: productId,
      overrideAccess: true,
      req,
      select: { title: true },
    });
  } catch {
    product = null;
  }

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

      const optionId = extractID<VariantOption>(option);

      if (typeof optionId !== "string" && typeof optionId !== "number") {
        return null;
      }

      const doc = await req.payload.findByID({
        collection: "variantOptions",
        depth: 0,
        id: optionId,
        overrideAccess: true,
        req,
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
