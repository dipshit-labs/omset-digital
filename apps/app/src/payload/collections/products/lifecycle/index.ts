export {
  getStashedVirtualData,
  stashVirtualData,
  VIRTUAL_DATA_KEY,
} from "./context";
export type { VirtualCatalogData } from "./context";

export { virtualCatalogFields } from "./fields";

export { productLifecycleBeforeChange } from "./hooks/beforeChange";

export { validatePhysicalPackaging } from "./packaging";
export type { ValidatePhysicalPackagingArgs } from "./packaging";

export { resolveDocumentStoreId } from "./store";
