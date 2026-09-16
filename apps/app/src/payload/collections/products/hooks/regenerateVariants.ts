import type { CollectionBeforeChangeHook } from "payload";
import type { VariantAxis, VariantOverrides } from "@/payload/lib/skus";
import { generateVariants } from "@/payload/lib/skus";

/**
 * Before-change hook: regenerate variant rows from variant axes.
 *
 * `variantAxes[].values` is a `string[]` (Payload `hasMany: true` text field).
 * Existing variant overrides (price, stock, weight, sku code) are preserved
 * for any option combination that still exists in the new axis set.
 */
const regenerateVariants: CollectionBeforeChangeHook = ({ data }) => {
  const rawAxes = (data?.variantAxes ?? []) as Array<{
    name: string;
    values: string[];
  }>;
  const axes: VariantAxis[] = rawAxes
    .map((a) => ({ name: a.name, values: (a.values ?? []).filter(Boolean) }))
    .filter((a) => a.name && a.values.length > 0);

  const existing = (data?.variants ?? []) as VariantOverrides[];

  return {
    ...data,
    variants: generateVariants(axes, existing),
  };
};

export { regenerateVariants };
