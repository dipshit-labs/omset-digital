import crypto from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  createInMemoryRateCache,
  generateRateCacheKey,
  resolveWeightTier,
} from "./shippingRateCache";

describe("shippingRateCache", () => {
  describe(generateRateCacheKey, () => {
    it("generates deterministic sha256 hex digest for originId:destId:weightTier:couriers", () => {
      const originId = 574;
      const destId = 2105;
      const weightTier = 2000;
      const couriers = "jne:pos:tiki";

      const key = generateRateCacheKey({
        couriers,
        destId,
        originId,
        weightTier,
      });

      const expectedRaw = `${originId}:${destId}:${weightTier}:${couriers}`;
      const expectedSha256 = crypto
        .createHash("sha256")
        .update(expectedRaw)
        .digest("hex");

      expect(key).toBe(expectedSha256);
    });

    it("sorts array of couriers deterministically into colon-delimited string", () => {
      const key1 = generateRateCacheKey({
        couriers: ["tiki", "jne", "pos"],
        destId: 100,
        originId: 50,
        weightTier: 1000,
      });

      const key2 = generateRateCacheKey({
        couriers: ["jne", "pos", "tiki"],
        destId: 100,
        originId: 50,
        weightTier: 1000,
      });

      expect(key1).toBe(key2);
    });
  });

  describe(resolveWeightTier, () => {
    it("groups weights up to 1000g into the 1000 tier (1kg)", () => {
      expect(resolveWeightTier(1)).toBe(1000);
      expect(resolveWeightTier(500)).toBe(1000);
      expect(resolveWeightTier(1000)).toBe(1000);
    });

    it("groups weights into 1000g increments above 1000g", () => {
      expect(resolveWeightTier(1001)).toBe(2000);
      expect(resolveWeightTier(1500)).toBe(2000);
      expect(resolveWeightTier(2000)).toBe(2000);
      expect(resolveWeightTier(2001)).toBe(3000);
    });
  });

  describe("InMemoryRateCache", () => {
    it("stores and retrieves cached rate responses with TTL", async () => {
      const cache = createInMemoryRateCache();
      const testKey = "mock-sha256-key-12345";
      const testValue = JSON.stringify([{ cost: 18_000, service: "REG" }]);

      await expect(cache.get(testKey)).resolves.toBeNull();

      // 6 hours TTL (21600 seconds)
      await cache.set(testKey, testValue, 21_600);
      await expect(cache.get(testKey)).resolves.toBe(testValue);
    });

    it("returns null when cache item has expired", async () => {
      const cache = createInMemoryRateCache();
      const testKey = "expiring-key";
      const testValue = "cached-data";

      // Expired TTL (-1 second)
      await cache.set(testKey, testValue, -1);
      await expect(cache.get(testKey)).resolves.toBeNull();
    });
  });
});
