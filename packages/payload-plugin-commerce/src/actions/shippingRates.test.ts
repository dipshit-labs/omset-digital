import { encryptCredential } from "@repo/commerce-adapters/utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createInMemoryRateCache,
  generateRateCacheKey,
  resolveWeightTier,
} from "./shippingRateCache";
import { calculateShippingRates } from "./shippingRates";
import type {
  GetShippingRatesInput,
  ShippingRatesPayloadClient,
} from "./shippingRates";

interface MockPayloadQueryArgs {
  collection: string;
}
describe(calculateShippingRates, () => {
  const masterSecret = "omset-digital-master-secret-32-chars!!";
  process.env.PAYLOAD_SECRET = masterSecret;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockStore = {
    activeShippingProvider: "rajaongkir",
    id: 10,
    slug: "toko-kopi",
    originAddress: {
      cityId: 501,
      cityName: "Yogyakarta",
      provinceId: 5,
      provinceName: "DI Yogyakarta",
      subdistrictId: 574,
      subdistrictName: "Gondomanan",
    },
  };

  const rawApiKey = "ro-test-api-key-999";
  const encryptedApiKey = encryptCredential(rawApiKey, masterSecret);

  const mockCredentials = {
    shippingProvider: "rajaongkir" as const,
    store: 10,
    rajaongkir: {
      accountType: "pro" as const,
      apiKey: encryptedApiKey,
    },
  };

  const mockDefaultPackage = {
    // 6000 / 6 = 1000g volumetric
    dimensions: { height: 10, length: 30, width: 20 },
    id: 100,
    isDefault: true,
    store: 10,
    tareWeight: { unit: "g" as const, value: 50 },
    title: "Standard Box",
  };

  const mockRajaOngkirResults = [
    {
      code: "jne",
      name: "Jalur Nugraha Ekakurir (JNE)",
      costs: [
        {
          cost: [{ etd: "1-2", note: "", value: 18_000 }],
          description: "Layanan Reguler",
          service: "REG",
        },
        {
          cost: [{ etd: "1", note: "", value: 30_000 }],
          description: "Yakin Esok Sampai",
          service: "YES",
        },
      ],
    },
    {
      code: "pos",
      name: "POS Indonesia",
      costs: [
        {
          cost: [{ etd: "2-3", note: "", value: 15_000 }],
          description: "Pos Reguler",
          service: "Pos Reguler",
        },
      ],
    },
  ];

  const createMockPayload = () => {
    const mockFind = vi
      .fn<
        ({ collection }: MockPayloadQueryArgs) => Promise<{ docs: unknown[] }>
      >()
      .mockImplementation(({ collection }: MockPayloadQueryArgs) => {
        if (collection === "stores") {
          return Promise.resolve({ docs: [mockStore] });
        }
        if (collection === "storeCredentials") {
          return Promise.resolve({ docs: [mockCredentials] });
        }
        if (collection === "packages") {
          return Promise.resolve({ docs: [mockDefaultPackage] });
        }
        return Promise.resolve({ docs: [] });
      });

    const payload: ShippingRatesPayloadClient = { find: mockFind };
    return payload;
  };

  it("calculates quotes and formats rates using volumetric billable weight", async () => {
    const payload = createMockPayload();
    const cache = createInMemoryRateCache();

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        rajaongkir: {
          results: mockRajaOngkirResults,
          status: {
            code: 200,
            description: "OK",
          },
        },
      })
    );

    // 200g items physical
    const input: GetShippingRatesInput = {
      couriers: ["jne", "pos"],
      items: [{ quantity: 1, weight: 200 }],
      storeSlug: "toko-kopi",
      customerDestination: {
        cityId: 152,
        subdistrictId: 2105,
      },
    };

    const result = await calculateShippingRates({
      cache,
      input,
      payload,
      secret: masterSecret,
    });

    expect(result.success).toBeTruthy();
    expect(result.cached).toBeFalsy();
    // 200g items + 50g tare = 250g physical, but 30x20x10 cm box gives 1000g volumetric weight
    expect(result.billableWeight).toBe(1000);
    expect(result.rates).toHaveLength(3);
    expect(result.rates[0]).toStrictEqual({
      cost: 18_000,
      courierCode: "jne",
      courierName: "Jalur Nugraha Ekakurir (JNE)",
      description: "Layanan Reguler",
      etd: "1-2",
      formattedCost: "Rp 18.000",
      service: "REG",
    });
  });

  it("sends subdistrict origin and destination parameters on Pro tier", async () => {
    const payload = createMockPayload();
    const cache = createInMemoryRateCache();

    let capturedBody = "";
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
      capturedBody = String(init?.body ?? "");
      return Promise.resolve(
        Response.json({
          rajaongkir: {
            results: mockRajaOngkirResults,
            status: { code: 200, description: "OK" },
          },
        })
      );
    });

    const input: GetShippingRatesInput = {
      couriers: ["jne", "pos"],
      items: [{ quantity: 1, weight: 200 }],
      storeSlug: "toko-kopi",
      customerDestination: {
        cityId: 152,
        subdistrictId: 2105,
      },
    };

    await calculateShippingRates({
      cache,
      input,
      payload,
      secret: masterSecret,
    });

    const bodyParams = new URLSearchParams(capturedBody);
    // Subdistrict ID 574 on Pro
    expect(bodyParams.get("origin")).toBe("574");
    expect(bodyParams.get("originType")).toBe("subdistrict");
    expect(bodyParams.get("destination")).toBe("2105");
    expect(bodyParams.get("destinationType")).toBe("subdistrict");
    expect(bodyParams.get("courier")).toBe("jne:pos");
  });

  it("caches rate response by deterministic sha256 and serves subsequent cache hits", async () => {
    const payload = createMockPayload();
    const cache = createInMemoryRateCache();

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        rajaongkir: {
          results: mockRajaOngkirResults,
          status: {
            code: 200,
            description: "OK",
          },
        },
      })
    );

    const input: GetShippingRatesInput = {
      couriers: ["jne", "pos"],
      items: [{ quantity: 1, weight: 200 }],
      storeSlug: "toko-kopi",
      customerDestination: {
        cityId: 152,
        subdistrictId: 2105,
      },
    };

    // First call: cache miss, queries RajaOngkir
    const firstResult = await calculateShippingRates({
      cache,
      input,
      payload,
      secret: masterSecret,
    });
    expect(firstResult.cached).toBeFalsy();
    expect(fetchSpy).toHaveBeenCalledOnce();

    // Verify cache key was populated
    const expectedKey = generateRateCacheKey({
      couriers: ["jne", "pos"],
      destId: 2105,
      originId: 574,
      weightTier: resolveWeightTier(1000),
    });
    const cachedEntry = await cache.get(expectedKey);
    expect(cachedEntry).not.toBeNull();

    // Second call: cache hit, zero external HTTP calls
    const secondResult = await calculateShippingRates({
      cache,
      input,
      payload,
      secret: masterSecret,
    });
    expect(secondResult.cached).toBeTruthy();
    expect(secondResult.rates).toStrictEqual(firstResult.rates);
  });

  it("formats Starter tier queries using city IDs without subdistrict types", async () => {
    const starterCredentials = {
      ...mockCredentials,
      rajaongkir: {
        accountType: "starter" as const,
        apiKey: encryptedApiKey,
      },
    };

    const mockFind = vi
      .fn<
        ({ collection }: MockPayloadQueryArgs) => Promise<{ docs: unknown[] }>
      >()
      .mockImplementation(({ collection }: MockPayloadQueryArgs) => {
        if (collection === "stores") {
          return Promise.resolve({ docs: [mockStore] });
        }
        if (collection === "storeCredentials") {
          return Promise.resolve({ docs: [starterCredentials] });
        }
        if (collection === "packages") {
          return Promise.resolve({ docs: [mockDefaultPackage] });
        }
        return Promise.resolve({ docs: [] });
      });

    const payload: ShippingRatesPayloadClient = { find: mockFind };
    let capturedBody = "";
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
      capturedBody = String(init?.body ?? "");
      return Promise.resolve(
        Response.json({
          rajaongkir: {
            results: mockRajaOngkirResults,
            status: { code: 200, description: "OK" },
          },
        })
      );
    });

    const input: GetShippingRatesInput = {
      couriers: ["jne"],
      items: [{ quantity: 1, weight: 500 }],
      storeSlug: "toko-kopi",
      customerDestination: {
        cityId: 152,
      },
    };

    const result = await calculateShippingRates({
      cache: createInMemoryRateCache(),
      input,
      payload,
      secret: masterSecret,
    });

    const bodyParams = new URLSearchParams(capturedBody);
    expect(result.success).toBeTruthy();
    // City ID 501 on Starter
    expect(bodyParams.get("origin")).toBe("501");
    // City ID 152 on Starter
    expect(bodyParams.get("destination")).toBe("152");
    expect(bodyParams.get("originType")).toBeNull();
    expect(bodyParams.get("destinationType")).toBeNull();
  });

  it("fails gracefully when store does not have active shipping provider", async () => {
    const storeWithoutShipping = {
      ...mockStore,
      activeShippingProvider: "none",
    };

    const mockFind = vi
      .fn<() => Promise<{ docs: unknown[] }>>()
      .mockResolvedValue({ docs: [storeWithoutShipping] });

    const payload: ShippingRatesPayloadClient = { find: mockFind };
    const result = await calculateShippingRates({
      cache: createInMemoryRateCache(),
      payload,
      input: {
        customerDestination: { cityId: 152 },
        items: [{ weight: 100 }],
        storeSlug: "toko-kopi",
      },
    });
    expect(result.success).toBeFalsy();
    expect(result.error).toMatch(/shipping is not enabled/iu);
    expect(result.rates).toHaveLength(0);
  });

  it("handles missing store, missing originAddress, and missing credentials", async () => {
    const cache = createInMemoryRateCache();
    // 1. Missing store
    const emptyPayload: ShippingRatesPayloadClient = {
      find: vi
        .fn<() => Promise<{ docs: unknown[] }>>()
        .mockResolvedValue({ docs: [] }),
    };
    const resNoStore = await calculateShippingRates({
      cache,
      payload: emptyPayload,
      input: {
        customerDestination: { cityId: 152 },
        items: [{ weight: 100 }],
        storeSlug: "missing-store",
      },
    });
    expect(resNoStore.success).toBeFalsy();

    // 2. Store missing originAddress
    const storeNoOrigin = { ...mockStore, originAddress: null };
    const noOriginPayload: ShippingRatesPayloadClient = {
      find: vi
        .fn<() => Promise<{ docs: unknown[] }>>()
        .mockResolvedValue({ docs: [storeNoOrigin] }),
    };
    const resNoOrigin = await calculateShippingRates({
      cache,
      payload: noOriginPayload,
      input: {
        customerDestination: { cityId: 152 },
        items: [{ weight: 100 }],
        storeSlug: "toko-kopi",
      },
    });
    expect(resNoOrigin.success).toBeFalsy();

    // 3. Missing RajaOngkir credentials
    const noCredsPayload: ShippingRatesPayloadClient = {
      find: vi
        .fn<
          ({ collection }: MockPayloadQueryArgs) => Promise<{ docs: unknown[] }>
        >()
        .mockImplementation(({ collection }: MockPayloadQueryArgs) => {
          if (collection === "stores") {
            return Promise.resolve({ docs: [mockStore] });
          }
          return Promise.resolve({ docs: [] });
        }),
    };
    const resNoCreds = await calculateShippingRates({
      cache,
      payload: noCredsPayload,
      input: {
        customerDestination: { cityId: 152 },
        items: [{ weight: 100 }],
        storeSlug: "toko-kopi",
      },
    });
    expect(resNoCreds.success).toBeFalsy();
  });

  it("recovers from corrupted cache and uses explicit packageId", async () => {
    const cache = createInMemoryRateCache();
    const explicitPackage = {
      dimensions: { height: 10, length: 20, width: 15 },
      id: 99,
      isDefault: false,
      store: 1,
      tareWeight: { unit: "g", value: 50 },
    };

    const mockFind = vi
      .fn<
        ({ collection }: MockPayloadQueryArgs) => Promise<{ docs: unknown[] }>
      >()
      .mockImplementation(({ collection }: MockPayloadQueryArgs) => {
        if (collection === "stores") {
          return Promise.resolve({ docs: [mockStore] });
        }
        if (collection === "storeCredentials") {
          return Promise.resolve({ docs: [mockCredentials] });
        }
        if (collection === "packages") {
          return Promise.resolve({ docs: [explicitPackage] });
        }
        return Promise.resolve({ docs: [] });
      });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        rajaongkir: {
          results: mockRajaOngkirResults,
          status: { code: 200, description: "OK" },
        },
      })
    );

    // Corrupt the cache key
    const key = generateRateCacheKey({
      couriers: ["jne", "pos", "tiki"],
      destId: 152,
      originId: 574,
      weightTier: resolveWeightTier(1000),
    });
    await cache.set(key, "invalid-json{{{");

    const result = await calculateShippingRates({
      cache,
      payload: { find: mockFind },
      secret: masterSecret,
      input: {
        customerDestination: { cityId: 152 },
        items: [{ weight: 500 }],
        packageId: 99,
        storeSlug: "toko-kopi",
      },
    });

    expect(result.success).toBeTruthy();
    expect(result.rates.length).toBeGreaterThan(0);
  });
});
