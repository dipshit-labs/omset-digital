import type { Product } from "@repo/types";
import type {
  CollectionAfterChangeHook,
  CollectionAfterReadHook,
  CollectionBeforeChangeHook,
} from "payload";

import { productLifecycleAfterChange } from "./afterChange";
import { productLifecycleAfterRead } from "./afterRead";
import { productLifecycleBeforeChange } from "./beforeChange";

export interface ProductLifecycleHooks {
  afterChange: CollectionAfterChangeHook<Product>[];
  afterRead: CollectionAfterReadHook<Product>[];
  beforeChange: CollectionBeforeChangeHook[];
}

export const productLifecycleHooks: ProductLifecycleHooks = {
  afterChange: [productLifecycleAfterChange],
  afterRead: [productLifecycleAfterRead],
  beforeChange: [productLifecycleBeforeChange],
};

export { productLifecycleAfterChange } from "./afterChange";
export { productLifecycleAfterRead } from "./afterRead";
export { productLifecycleBeforeChange } from "./beforeChange";
