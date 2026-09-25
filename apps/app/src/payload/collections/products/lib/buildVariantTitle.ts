import type { Product, VariantOption } from "@repo/types";
import type { PayloadRequest } from "payload";
import { extractID } from "payload/shared";

type OptionInput = VariantOption | VariantOption["id"];

export const buildVariantTitle = async (
  productId: Product["id"],
  options: OptionInput[],
  req: PayloadRequest
): Promise<string> => {
  let productTitle: string | null = null;
  try {
    const product = await req.payload.findByID({
      collection: "products",
      depth: 0,
      draft: true,
      id: productId,
      overrideAccess: true,
      req,
      select: { title: true },
    });

    productTitle = product?.title ?? null;
  } catch {
    // * Non fatal, title falls back to option labels only.
  }

  const knownLabels: (string | null)[] = [];
  const missingIds: (number | string)[] = [];
  // Preserve insertion order so the final join matches the options array order.
  const orderMap: ("known" | "fetch")[] = [];

  for (const option of options) {
    if (
      typeof option === "object" &&
      option !== null &&
      "label" in option &&
      typeof option.label === "string"
    ) {
      knownLabels.push(option.label);
      orderMap.push("known");
    } else {
      const id = extractID(option);

      if (typeof id === "string" || typeof id === "number") {
        missingIds.push(id);
        orderMap.push("fetch");
      } else {
        knownLabels.push(null);
        orderMap.push("known");
      }
    }
  }

  const fetchedLabels = new Map<number | string, string>();
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
      fetchedLabels.set(doc.id, doc.label);
    }
  }

  let knownIdx = 0;
  let fetchIdx = 0;
  const optionLabels: (string | null | undefined)[] = orderMap.map((kind) => {
    if (kind === "known") {
      const label = knownLabels[knownIdx];
      knownIdx += 1;
      return label;
    }

    const id = missingIds[fetchIdx];
    fetchIdx += 1;

    return fetchedLabels.get(id) ?? null;
  });

  const parts = [productTitle, ...optionLabels].filter(Boolean);
  return parts.join(" — ");
};
