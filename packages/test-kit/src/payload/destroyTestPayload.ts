import type { Payload } from "payload";

import { dropPostgresWorkerSchema } from "./database/postgres";

declare global {
  var _payload: Map<string, unknown> | undefined;
}

export const ORIGINAL_DESTROY = Symbol.for("test-kit.payload.originalDestroy");
export const CACHE_KEY_SYMBOL = Symbol.for("test-kit.payload.cacheKey");
const DESTROYED_SYMBOL = Symbol.for("test-kit.payload.destroyed");

export interface ManagedTestPayload extends Payload {
  [CACHE_KEY_SYMBOL]?: string;
  [DESTROYED_SYMBOL]?: boolean;
  [ORIGINAL_DESTROY]?: () => Promise<void>;
}

export const destroyTestPayload = async (
  payload: Payload,
  cacheKey?: string
): Promise<void> => {
  // SAFETY: Payload instance is enriched with test-kit lifecycle symbols during initialization.
  const managedPayload = payload as ManagedTestPayload;

  if (managedPayload[DESTROYED_SYMBOL]) {
    return;
  }
  managedPayload[DESTROYED_SYMBOL] = true;

  const effectiveKey = cacheKey ?? managedPayload[CACHE_KEY_SYMBOL];

  try {
    if (global._payload instanceof Map) {
      if (effectiveKey) {
        global._payload.delete(effectiveKey);
      } else {
        for (const [key, value] of global._payload.entries()) {
          if (value === payload) {
            global._payload.delete(key);
            break;
          }
        }
      }
    }

    await dropPostgresWorkerSchema(payload);
  } finally {
    const originalDestroy = managedPayload[ORIGINAL_DESTROY];
    await (typeof originalDestroy === "function"
      ? originalDestroy()
      : payload.destroy());
  }
};
