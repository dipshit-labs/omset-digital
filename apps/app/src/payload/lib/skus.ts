/**
 * Pure SKU generation utilities.
 *
 * A Product's variants are the Cartesian product of its variant axes.
 * Simple products (no axes) always have exactly one variant row with no options.
 *
 * Each variant is identified by its `options` array — a stable sorted
 * serialization is used as a lookup key so overrides survive axis edits.
 */

/** One axis value selected for a specific variant. */
export interface VariantOption {
  option: string;
  value: string;
}

/** A variant axis definition used to drive Cartesian product generation. */
export interface VariantAxis {
  name: string;
  values: string[];
}

/** Overrides carried by an existing variant row, keyed by options identity. */
export interface VariantOverrides {
  options: VariantOption[];
  price?: number | null;
  sku?: string | null;
  stock?: number | null;
  weight?: number | null;
}

/** A generated variant row (options + preserved or null overrides). */
export interface GeneratedVariant {
  options: VariantOption[];
  price?: number | null;
  sku?: string | null;
  stock?: number | null;
  weight?: number | null;
}

/**
 * Serialize a variant's options to a stable string key for override lookups.
 * Sorted by option name so axis reorder doesn't break matches.
 * JSON.stringify avoids delimiter collisions.
 */
export function optionsKey(options: VariantOption[]): string {
  const sorted = [...options].sort((a, b) => a.option.localeCompare(b.option));
  return JSON.stringify(sorted);
}

/**
 * Cartesian product of a list of value arrays.
 * cartesian([['Red','Blue'],['S','M']]) → [['Red','S'],['Red','M'],['Blue','S'],['Blue','M']]
 */
function cartesian(sets: string[][]): string[][] {
  return sets.reduce<string[][]>(
    (acc, set) => acc.flatMap((combo) => set.map((v) => [...combo, v])),
    [[]]
  );
}

/**
 * Generate the full variant list for a product given its current variant axes.
 *
 * - No axes (or all axes empty) → one variant with empty options array.
 * - Axes present → Cartesian product; existing overrides transferred by key.
 */
export function generateVariants(
  axes: VariantAxis[],
  existing: VariantOverrides[] = []
): GeneratedVariant[] {
  const overrideMap = new Map<string, VariantOverrides>();
  for (const row of existing) {
    overrideMap.set(optionsKey(row.options), row);
  }

  const activeAxes = axes.filter((a) => a.values.length > 0);

  if (activeAxes.length === 0) {
    const key = optionsKey([]);
    const prev = overrideMap.get(key);
    return [
      {
        options: [],
        price: prev?.price ?? null,
        sku: prev?.sku ?? null,
        stock: prev?.stock ?? null,
        weight: prev?.weight ?? null,
      },
    ];
  }

  const combos = cartesian(activeAxes.map((a) => a.values));

  return combos.map((combo) => {
    const options: VariantOption[] = activeAxes.map((a, i) => ({
      option: a.name,
      value: combo[i] ?? "",
    }));
    const key = optionsKey(options);
    const prev = overrideMap.get(key);
    return {
      options,
      price: prev?.price ?? null,
      sku: prev?.sku ?? null,
      stock: prev?.stock ?? null,
      weight: prev?.weight ?? null,
    };
  });
}
