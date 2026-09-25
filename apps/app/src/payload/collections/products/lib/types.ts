import type { Package } from "@repo/types";

export interface RawShipping {
  package?: Package | Package["id"] | null;
  required?: boolean | null;
  weight?: {
    unit?: "g" | "kg" | null;
    value?: number | null;
  } | null;
}

export interface NormalizedShipping {
  package: Package["id"] | null;
  required: boolean;
  weight: {
    unit: "g" | "kg";
    value: number;
  };
}
