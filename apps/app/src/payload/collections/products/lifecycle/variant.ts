import type { Product, Variant } from "@repo/types";
import type { PayloadRequest } from "payload";

interface FindDefaultVariantOptions {
  draft?: boolean;
}

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
    where: { product: { equals: productId } },
  });

  return result.docs.find(
    (v) => !Array.isArray(v.options) || v.options.length === 0
  );
};
