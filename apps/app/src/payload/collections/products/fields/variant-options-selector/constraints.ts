export interface VariantOptionConstraintsInput {
  existingCombinations: (number | string)[][];
  selectedIDs: (number | string)[];
  variantTypeIDs: (number | string)[];
}

export function checkVariantOptionConstraints({
  variantTypeIDs,
  selectedIDs,
  existingCombinations,
}: VariantOptionConstraintsInput): string | true {
  if (selectedIDs.length === 0) {
    return "At least one variant option is required.";
  }

  if (selectedIDs.length < variantTypeIDs.length) {
    return "Select exactly one option for each variant type.";
  }

  const isDuplicate = existingCombinations.some((combo) => {
    if (combo.length !== selectedIDs.length) {
      return false;
    }
    return combo.every((id) =>
      selectedIDs.some((sel) => String(sel) === String(id))
    );
  });

  if (isDuplicate) {
    return "This variant combination already exists for this product.";
  }

  return true;
}
