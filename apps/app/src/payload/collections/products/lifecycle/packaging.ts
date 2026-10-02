import type { Package, Product } from "@repo/types";
import type { PayloadRequest } from "payload";
import { APIError } from "payload";
import { extractID } from "payload/shared";

import { resolveDocumentStoreId } from "./store";

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

/**
 * Normalizes shipping configuration into a canonical structure.
 */
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

/**
 * Resolves the default Package document ID for a given Store.
 */
export const resolveDefaultPackage = async (
  req: PayloadRequest,
  storeIdentifier?: unknown
): Promise<Package["id"] | null> => {
  const storeId =
    typeof storeIdentifier === "number" || typeof storeIdentifier === "string"
      ? storeIdentifier
      : resolveDocumentStoreId({ store: storeIdentifier });

  if (!storeId) {
    return null;
  }

  const result = await req.payload.find({
    collection: "packages",
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    select: { isDefault: true },
    where: {
      and: [{ store: { equals: storeId } }, { isDefault: { equals: true } }],
    },
  });

  return result.docs[0]?.id ?? null;
};

export type ProductInputData = Partial<Omit<Product, "shipping">> & {
  shipping?: Partial<Product["shipping"]>;
};

export interface ValidatePhysicalPackagingArgs {
  data: ProductInputData;
  originalDoc?: ProductInputData;
  req: PayloadRequest;
}

const resolveSpecifiedPackageId = (
  shipping?: Partial<Product["shipping"]>
): number | string | null => {
  if (!shipping) {
    return null;
  }

  const currentPackage = shipping.package;
  if (typeof currentPackage === "number" && currentPackage > 0) {
    return currentPackage;
  }

  if (
    typeof currentPackage === "object" &&
    currentPackage !== null &&
    "id" in currentPackage
  ) {
    // SAFETY: Populated package relationship exposes an id property.
    const { id } = currentPackage as { id: unknown };
    if (typeof id === "number" || typeof id === "string") {
      return id;
    }
  }

  return null;
};

/**
 * Enforces packaging requirements for physical products.
 * If shipping.required === true, verifies that a valid package is specified in the payload
 * or configured on the Store's default package. If neither exists, throws a clean domain error.
 */
export const validatePhysicalPackaging = async ({
  data,
  originalDoc,
  req,
}: ValidatePhysicalPackagingArgs): Promise<void> => {
  const shippingRaw = data.shipping ?? originalDoc?.shipping;
  if (!shippingRaw) {
    return;
  }

  const isPhysical = shippingRaw.required === true;
  if (!isPhysical) {
    return;
  }

  // Check if a valid package ID is specified directly in the payload or on the existing document
  const specifiedPackageId =
    resolveSpecifiedPackageId(data.shipping) ??
    resolveSpecifiedPackageId(originalDoc?.shipping);
  if (specifiedPackageId) {
    return;
  }

  const storeId = resolveDocumentStoreId(data, originalDoc);
  const defaultPackageId = storeId
    ? await resolveDefaultPackage(req, storeId)
    : null;

  if (!defaultPackageId) {
    throw new APIError(
      "A default shipping package is required for physical products. Please configure a package under Store Settings.",
      400
    );
  }

  if (data.shipping) {
    // SAFETY: Resolved package ID satisfies the variant shipping package relationship constraint.
    data.shipping.package = defaultPackageId as never;
  }
};
