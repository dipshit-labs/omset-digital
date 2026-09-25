import type { Product, Variant } from "@repo/types";
import type { CollectionBeforeChangeHook } from "payload";
import { extractID } from "@/payload/lib/ids";
import { buildVariantTitle } from "../lib/buildVariantTitle";

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
  data.title = await buildVariantTitle(productId, data.options, req);

  return data;
};

export { generateVariantTitle };
