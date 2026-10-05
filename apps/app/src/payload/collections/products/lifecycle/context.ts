import type { PayloadRequest } from "payload";
import type { Product } from "@repo/types";

export const VIRTUAL_DATA_KEY = "products:defaultVariant:virtualData";

export interface VirtualCatalogData {
  inventory?: Product["inventory"];
  pricing?: Product["pricing"];
  shipping?: Product["shipping"];
}

/**
 * Extracts typed virtual catalog data stashed in request context.
 */
export const getStashedVirtualData = (
  req: PayloadRequest
): VirtualCatalogData | undefined => {
  if (!req.context) {
    return undefined;
  }
  // SAFETY: Data stored under VIRTUAL_DATA_KEY was stashed adhering to VirtualCatalogData.
  return req.context[VIRTUAL_DATA_KEY] as VirtualCatalogData | undefined;
};

/**
 * Stashes typed virtual catalog data into request context for downstream processing.
 */
export const stashVirtualData = (
  req: PayloadRequest,
  data: VirtualCatalogData
): void => {
  if (!req.context) {
    req.context = {};
  }
  req.context[VIRTUAL_DATA_KEY] = data;
};
