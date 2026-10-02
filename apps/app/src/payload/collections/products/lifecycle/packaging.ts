import type { Product } from "@repo/types";
import type { PayloadRequest } from "payload";
import { APIError } from "payload";

import { resolveDefaultPackage } from "../lib/resolveDefaultPackage";
import { resolveDocumentStoreId } from "./store";

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
