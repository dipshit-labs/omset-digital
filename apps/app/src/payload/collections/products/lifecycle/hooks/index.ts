import type {
  CollectionAfterChangeHook,
  CollectionAfterReadHook,
  CollectionBeforeChangeHook,
} from "payload";
import type { Product, Variant } from "@repo/types";

import { productLifecycleAfterChange } from "./afterChange";
import { productLifecycleAfterRead } from "./afterRead";
import { productLifecycleBeforeChange } from "./beforeChange";
import { variantLifecycleAfterChange } from "./variantAfterChange";
import { variantLifecycleBeforeChange } from "./variantBeforeChange";

export interface VariantLifecycleHooks {
  afterChange: CollectionAfterChangeHook<Variant>[];
  beforeChange: CollectionBeforeChangeHook<Variant>[];
}

export const variantLifecycleHooks: VariantLifecycleHooks = {
  afterChange: [variantLifecycleAfterChange],
  beforeChange: [variantLifecycleBeforeChange],
};

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
