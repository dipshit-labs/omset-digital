import { extractID } from "@/payload/lib/ids";
import type { Package } from "@/payload/payload-types";
import type { NormalizedShipping, RawShipping } from "./types";

export function normalizeShipping(
  raw: RawShipping,
  fallback?: Partial<RawShipping>
): NormalizedShipping {
  const required = raw.required ?? fallback?.required ?? true;
  const unit = raw.weight?.unit ?? fallback?.weight?.unit ?? "g";

  let packageId: Package["id"] | null = null;
  if (raw.package) {
    packageId = extractID<Package>(raw.package as Package | Package["id"]);
  } else if (fallback?.package) {
    packageId = extractID<Package>(fallback.package as Package | Package["id"]);
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
    ({ value } = fallback.weight as { value: number; unit?: "g" | "kg" });
  }

  return {
    package: packageId ?? null,
    required: true,
    weight: { unit, value },
  };
}
