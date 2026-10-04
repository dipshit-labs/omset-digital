import { createInMemoryRateCache } from "@repo/payload-plugin-commerce/actions";
import { describe, expect, it, vi } from "vitest";

import { createShippingRatesAction, resolveRateCache } from "./shippingRates";
import type { ShippingRatesPayloadClient } from "./shippingRates";

interface MockQueryArgs {
  collection: string;
}

describe("shippingRates server actions", () => {
  it("getShippingRates invokes calculateShippingRates with injected payload and cache", async () => {
    const mockStore = {
      activeShippingProvider: "rajaongkir",
      id: 1,
      slug: "test-store",
      originAddress: {
        cityId: 501,
        subdistrictId: 574,
      },
    };

    const mockCredentials = {
      shippingProvider: "rajaongkir",
      rajaongkir: {
        accountType: "starter" as const,
        apiKey: "test-plain-key",
      },
    };

    const mockFind = vi
      .fn<({ collection }: MockQueryArgs) => Promise<{ docs: unknown[] }>>()
      .mockImplementation(({ collection }: MockQueryArgs) => {
        if (collection === "stores") {
          return Promise.resolve({ docs: [mockStore] });
        }
        if (collection === "storeCredentials") {
          return Promise.resolve({ docs: [mockCredentials] });
        }
        return Promise.resolve({ docs: [] });
      });

    const mockPayload: ShippingRatesPayloadClient = {
      find: mockFind,
    };

    vi.spyOn(globalThis, "fetch").mockImplementation((_url) => {
      const responseData = {
        rajaongkir: {
          results: [
            {
              code: "jne",
              name: "Jalur Nugraha Ekakurir (JNE)",
              costs: [
                {
                  cost: [{ etd: "1-2", note: "", value: 12_000 }],
                  description: "Layanan Reguler",
                  service: "REG",
                },
              ],
            },
          ],
          status: {
            code: 200,
            description: "OK",
          },
        },
      };
      return Promise.resolve(Response.json(responseData));
    });

    const cache = createInMemoryRateCache();
    const action = createShippingRatesAction({
      cache,
      secret: "test-secret",
      getPayloadClient: () => Promise.resolve(mockPayload),
    });

    const result = await action({
      couriers: ["jne"],
      customerDestination: { cityId: 152 },
      items: [{ quantity: 1, weight: 500 }],
      storeSlug: "test-store",
    });

    expect(result.success).toBeTruthy();
    expect(result.rates).toHaveLength(1);
    expect(result.rates[0]?.cost).toBe(12_000);
    expect(result.rates[0]?.formattedCost).toBe("Rp 12.000");
  });

  it("resolveRateCache returns in-memory cache when redisUrl is omitted", () => {
    const cache = resolveRateCache();
    expect(cache).toBeDefined();
    expect(cache.get).toBeTypeOf("function");
    expect(cache.set).toBeTypeOf("function");
  });
});
