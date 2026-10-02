export {
  getStashedVirtualData,
  stashVirtualData,
  VIRTUAL_DATA_KEY,
} from "./context";
export type { VirtualCatalogData } from "./context";

export { virtualCatalogFields } from "./fields";

export {
  productLifecycleAfterChange,
  productLifecycleAfterRead,
  productLifecycleBeforeChange,
  productLifecycleHooks,
  variantLifecycleAfterChange,
  variantLifecycleBeforeChange,
  variantLifecycleHooks,
} from "./hooks";
export type { ProductLifecycleHooks, VariantLifecycleHooks } from "./hooks";

export {
  normalizeShipping,
  resolveDefaultPackage,
  validatePhysicalPackaging,
} from "./packaging";
export type {
  NormalizedShipping,
  RawShipping,
  ValidatePhysicalPackagingArgs,
} from "./packaging";

export { resolveDocumentStoreId } from "./store";

export {
  cleanupDefaultVariant,
  deriveVariantTitle,
  findDefaultVariant,
} from "./variant";
export type { VariantOptionInput } from "./variant";
