import type { Package } from "@repo/types";
import { extractID } from "payload/shared";

import type { NormalizedShipping, RawShipping } from "./types";

export const normalizeShipping = (
  raw: RawShipping,
  fallback?: Partial<RawShipping>
): NormalizedShipping => {
  const required = raw.required ?? fallback?.required ?? true;
  const unit = raw.weight?.unit ?? fallback?.weight?.unit ?? "g";

  let packageId: Package["id"] | null = null;
  if (raw.package) {
    packageId = extractID(raw.package);
  } else if (fallback?.package) {
    packageId = extractID(fallback.package);
  }

  if (!required) {
    return {
      package: null,
      required: false,
      weight: { unit, value: 0 },
    };
  }

  let value = 0;
  if (typeof raw.weight?.value === "number") {
    ({ value } = raw.weight);
  } else if (typeof fallback?.weight?.value === "number") {
    // SAFETY: Guard confirms fallback.weight is defined with a numeric value.
    ({ value } = fallback.weight as { value: number });
  }

  return {
    package: packageId ?? null,
    required: true,
    weight: { unit, value },
  };
};
