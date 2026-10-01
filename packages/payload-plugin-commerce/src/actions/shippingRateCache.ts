import crypto from "node:crypto";

/** 6 hours in seconds */
export const DEFAULT_RATE_CACHE_TTL_SECONDS = 21_600;

export interface GenerateRateCacheKeyInput {
  couriers: string | string[];
  destId: number | string;
  originId: number | string;
  weightTier: number | string;
}

/**
 * Generates deterministic cache key for shipping rates.
 * Format: sha256(originId:destId:weightTier:couriers)
 */
export const generateRateCacheKey = ({
  couriers,
  destId,
  originId,
  weightTier,
}: GenerateRateCacheKeyInput): string => {
  const normalizedCouriers = Array.isArray(couriers)
    ? couriers
        .map((c) => c.trim().toLowerCase())
        .toSorted()
        .join(":")
    : couriers.trim().toLowerCase();

  const rawKey = `${originId}:${destId}:${weightTier}:${normalizedCouriers}`;
  return crypto.createHash("sha256").update(rawKey).digest("hex");
};

/**
 * Normalizes weight in grams to a standard courier weight tier (e.g. 1000g, 2000g, etc.)
 */
export const resolveWeightTier = (weightInGrams: number): number => {
  const weight = Math.max(1, Math.round(weightInGrams));
  return Math.max(1000, Math.ceil(weight / 1000) * 1000);
};

export interface ShippingRateCache {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttlSeconds?: number) => Promise<void>;
}

/**
 * In-memory implementation of ShippingRateCache for testing and fallback.
 */
export const createInMemoryRateCache = (): ShippingRateCache => {
  const store = new Map<string, { expiresAt: number; value: string }>();

  return {
    get: (key: string): Promise<string | null> => {
      const entry = store.get(key);
      if (!entry) {
        return Promise.resolve(null);
      }

      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return Promise.resolve(null);
      }

      return Promise.resolve(entry.value);
    },
    set: (
      key: string,
      value: string,
      ttlSeconds = DEFAULT_RATE_CACHE_TTL_SECONDS
    ): Promise<void> => {
      store.set(key, {
        expiresAt: Date.now() + ttlSeconds * 1000,
        value,
      });
      return Promise.resolve();
    },
  };
};

export interface RedisClientLike {
  get: (key: string) => Promise<string | null>;
  set: (
    key: string,
    value: string,
    mode?: string,
    duration?: number
  ) => Promise<unknown>;
}

/**
 * Creates a Redis-backed rate cache wrapping any redis-compatible client.
 */
export const createRedisRateCache = (
  client: RedisClientLike
): ShippingRateCache => ({
  get: async (key: string): Promise<string | null> => {
    try {
      return await client.get(key);
    } catch {
      return null;
    }
  },
  set: async (
    key: string,
    value: string,
    ttlSeconds = DEFAULT_RATE_CACHE_TTL_SECONDS
  ): Promise<void> => {
    try {
      await client.set(key, value, "EX", ttlSeconds);
    } catch {
      // Gracefully continue if Redis write fails
    }
  },
});
