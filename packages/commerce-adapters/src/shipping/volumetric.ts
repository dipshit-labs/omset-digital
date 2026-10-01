import type { ShippingItem, ShippingPackageInput } from "./types";

/**
 * Calculates billable shipping weight according to Indonesian domestic courier standards.
 *
 * Volumetric Weight Formula (Indonesian Domestic Courier Standard):
 *   Volumetric Weight (kg) = (Length * Width * Height) / 6000
 * Since RajaOngkir and variants require weight in grams:
 *   Volumetric Weight (g) = ((Length * Width * Height) / 6000) * 1000 = (Length * Width * Height) / 6
 *
 * Billable Weight = max(Total Item Weight + Tare Weight, Volumetric Weight in grams)
 * Clamped to a 1 gram minimum integer.
 */
export const calculateBillableWeight = (
  items: ShippingItem[],
  pkg?: ShippingPackageInput | null
): number => {
  let totalItemWeight = 0;
  for (const item of items) {
    const qty = Math.max(0, item.quantity ?? 1);
    const weight = Math.max(0, item.weight || 0);
    totalItemWeight += weight * qty;
  }

  let tareWeightGrams = 0;
  if (pkg?.tareWeight !== null && pkg?.tareWeight !== undefined) {
    if (typeof pkg.tareWeight === "number") {
      tareWeightGrams = Math.max(0, pkg.tareWeight);
    } else if (typeof pkg.tareWeight === "object") {
      const val = Math.max(0, pkg.tareWeight.value || 0);
      tareWeightGrams = pkg.tareWeight.unit === "kg" ? val * 1000 : val;
    }
  }

  const physicalWeight = totalItemWeight + tareWeightGrams;

  let volumetricWeightGrams = 0;
  if (pkg?.dimensions) {
    const length = Math.max(0, pkg.dimensions.length || 0);
    const width = Math.max(0, pkg.dimensions.width || 0);
    const height = Math.max(0, pkg.dimensions.height || 0);

    if (length > 0 && width > 0 && height > 0) {
      // Indonesian domestic standard: (L * W * H) / 6000 kg -> * 1000 to convert to grams
      volumetricWeightGrams = (length * width * height * 1000) / 6000;
    }
  }

  const billable = Math.max(physicalWeight, volumetricWeightGrams);
  return Math.max(1, Math.round(billable));
};
