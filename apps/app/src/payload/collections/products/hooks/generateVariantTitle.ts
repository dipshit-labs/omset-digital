import type { Variant } from "@repo/types";
import type { CollectionBeforeChangeHook } from "payload";
import { extractID } from "payload/shared";

import { buildVariantTitle } from "../lib/buildVariantTitle";

const generateVariantTitle: CollectionBeforeChangeHook<Variant> = async ({
  data,
  req,
}) => {
  if (
    !(data.product && Array.isArray(data.options)) ||
    data.options.length === 0
  ) {
    return data;
  }

  const productId = extractID(data.product);
  data.title = await buildVariantTitle(productId, data.options, req);

  return data;
};

export { generateVariantTitle };
