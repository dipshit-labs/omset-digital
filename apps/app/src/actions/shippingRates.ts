"use server";

import config from "@payload-config";
import {
  calculateShippingRates,
  createInMemoryRateCache,
  createRedisRateCache,
} from "@repo/payload-plugin-commerce/actions";
import type {
  GetShippingRatesInput,
  GetShippingRatesResult,
  ShippingRateCache,
  ShippingRatesPayloadClient,
} from "@repo/payload-plugin-commerce/actions";
import Redis from "ioredis";
import { getPayload } from "payload";
import type { Payload } from "payload";

import { env } from "@/env";

export type {
  FormattedShippingRateOption,
  GetShippingRatesInput,
  GetShippingRatesResult,
  ShippingRatesPayloadClient,
} from "@repo/payload-plugin-commerce/actions";

export interface ShippingRatesActionContext {
  cache?: ShippingRateCache;
  getPayloadClient: () => Promise<Payload | ShippingRatesPayloadClient>;
  secret?: string;
}

export const createShippingRatesAction =
  (
    context: ShippingRatesActionContext
  ): ((input: GetShippingRatesInput) => Promise<GetShippingRatesResult>) =>
  async (input: GetShippingRatesInput): Promise<GetShippingRatesResult> => {
    const payload = await context.getPayloadClient();
    // SAFETY: Duck-typed Payload client implements find query interface required by calculateShippingRates.
    const resolvedPayload = payload as Payload;
    return calculateShippingRates({
      cache: context.cache,
      input,
      payload: resolvedPayload,
      secret: context.secret,
    });
  };

let redisClient: Redis | null = null;
let sharedCache: ShippingRateCache | null = null;

export const resolveRateCache = (redisUrl?: string): ShippingRateCache => {
  if (sharedCache) {
    return sharedCache;
  }

  if (redisUrl) {
    try {
      if (!redisClient) {
        redisClient = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
        });
      }

      const client = redisClient;
      sharedCache = createRedisRateCache({
        get: (key: string) => client.get(key),
        set: (key: string, value: string, _mode?: string, duration?: number) =>
          client.set(key, value, "EX", duration ?? 21_600),
      });

      return sharedCache;
    } catch {
      // Gracefully fall back to in-memory cache if Redis initialization fails
    }
  }

  sharedCache = createInMemoryRateCache();
  return sharedCache;
};

export const getShippingRates = createShippingRatesAction({
  cache: resolveRateCache(env.REDIS_URL),
  secret: env.PAYLOAD_SECRET,
  getPayloadClient: () => getPayload({ config }),
});
