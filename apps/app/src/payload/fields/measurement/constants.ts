export const UNIT_PRESETS = {
  length: [
    { label: "Centimeter (cm)", value: "cm" },
    { label: "Meter (m)", value: "m" },
  ],
  volume: [
    { label: "Milliliter (ml)", value: "ml" },
    { label: "Liter (l)", value: "l" },
  ],
  weight: [
    { label: "Gram (g)", value: "g" },
    { label: "Kilogram (kg)", value: "kg" },
  ],
} as const;

export type MeasurementType = keyof typeof UNIT_PRESETS;
