import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  testConnection,
  testMidtransConnection,
  testRajaOngkirConnection,
  testXenditConnection,
} from "./testConnection";

const createMockResponse = (body: unknown, status = 200): Response => {
  const res = {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
  // SAFETY: Mock object satisfies fetch Response interface in tests.
  return res as Response;
};

describe("Test Connection Actions", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe(testMidtransConnection, () => {
    it("returns success when Midtrans responds with 404 transaction not found (authenticated probe)", async () => {
      const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
        createMockResponse(
          {
            status_code: "404",
            status_message: "Transaction doesn't exist.",
          },
          404
        )
      );
      vi.stubGlobal("fetch", mockFetch);

      const result = await testMidtransConnection({
        isProduction: false,
        serverKey: "SB-Mid-server-valid-key",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(
          /^https:\/\/api\.sandbox\.midtrans\.com\/v2\/.*\/status$/u
        ),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: `Basic ${Buffer.from("SB-Mid-server-valid-key:").toString("base64")}`,
          }),
        })
      );
      expect(result.success).toBeTruthy();
      expect(result.message).toContain("Midtrans");
    });

    it("returns failure when Midtrans responds with 401 unauthorized", async () => {
      const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
        createMockResponse(
          {
            status_code: "401",
            status_message: "Access denied due to unauthorized transaction.",
          },
          401
        )
      );
      vi.stubGlobal("fetch", mockFetch);

      const result = await testMidtransConnection({
        isProduction: false,
        serverKey: "invalid-key",
      });

      expect(result.success).toBeFalsy();
      expect(result.message).toContain("unauthorized");
    });

    it("targets production endpoint when isProduction is true", async () => {
      const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
        createMockResponse(
          {
            status_code: "404",
            status_message: "Transaction doesn't exist.",
          },
          404
        )
      );
      vi.stubGlobal("fetch", mockFetch);

      await testMidtransConnection({
        isProduction: true,
        serverKey: "Mid-server-prod-key",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(
          /^https:\/\/api\.midtrans\.com\/v2\/.*\/status$/u
        ),
        expect.anything()
      );
    });
  });

  describe(testXenditConnection, () => {
    it("returns success when Xendit responds with 200 and balance", async () => {
      const mockFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValue(createMockResponse({ balance: 5_000_000 }, 200));
      vi.stubGlobal("fetch", mockFetch);

      const result = await testXenditConnection({
        secretKey: "xnd_development_valid_secret",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.xendit.co/balance?account_type=CASH",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: `Basic ${Buffer.from("xnd_development_valid_secret:").toString("base64")}`,
          }),
        })
      );
      expect(result.success).toBeTruthy();
      expect(result.data).toStrictEqual({ balance: 5_000_000 });
    });

    it("returns failure when Xendit responds with 401 unauthorized", async () => {
      const mockFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          createMockResponse(
            { error_code: "UNAUTHORIZED", message: "Invalid API key." },
            401
          )
        );
      vi.stubGlobal("fetch", mockFetch);

      const result = await testXenditConnection({
        secretKey: "invalid-secret",
      });

      expect(result.success).toBeFalsy();
      expect(result.message).toContain("Invalid Xendit Secret Key");
    });
  });

  describe(testRajaOngkirConnection, () => {
    it("returns success for Starter tier when GET /province returns 200", async () => {
      const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
        createMockResponse(
          {
            rajaongkir: {
              results: [{ province: "Bali", province_id: "1" }],
              status: { code: 200, description: "OK" },
            },
          },
          200
        )
      );
      vi.stubGlobal("fetch", mockFetch);

      const result = await testRajaOngkirConnection({
        accountType: "starter",
        apiKey: "valid-rajaongkir-key",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.rajaongkir.com/starter/province",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            key: "valid-rajaongkir-key",
          }),
        })
      );
      expect(result.success).toBeTruthy();
    });

    it("routes Pro tier to pro.rajaongkir.com/api/province", async () => {
      const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
        createMockResponse(
          {
            rajaongkir: {
              results: [{ province: "Bali", province_id: "1" }],
              status: { code: 200, description: "OK" },
            },
          },
          200
        )
      );
      vi.stubGlobal("fetch", mockFetch);

      const result = await testRajaOngkirConnection({
        accountType: "pro",
        apiKey: "pro-key",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://pro.rajaongkir.com/api/province",
        expect.anything()
      );
      expect(result.success).toBeTruthy();
    });

    it("returns failure when RajaOngkir returns 400 invalid key", async () => {
      const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
        createMockResponse(
          {
            rajaongkir: {
              status: { code: 400, description: "Invalid key" },
            },
          },
          400
        )
      );
      vi.stubGlobal("fetch", mockFetch);

      const result = await testRajaOngkirConnection({
        accountType: "starter",
        apiKey: "bad-key",
      });

      expect(result.success).toBeFalsy();
      expect(result.message).toContain("Invalid RajaOngkir API key");
    });
  });

  describe("testConnection unified dispatcher", () => {
    it("dispatches midtrans input correctly", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>().mockResolvedValue(
          createMockResponse(
            {
              status_code: "404",
              status_message: "Transaction doesn't exist.",
            },
            404
          )
        )
      );

      const result = await testConnection({
        isProduction: false,
        provider: "midtrans",
        serverKey: "server-key",
      });

      expect(result.success).toBeTruthy();
    });

    it("dispatches xendit input correctly", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(createMockResponse({ balance: 1_000_000 }, 200))
      );

      const result = await testConnection({
        isProduction: false,
        provider: "xendit",
        secretKey: "xnd_test_123",
      });

      expect(result.success).toBeTruthy();
    });

    it("dispatches rajaongkir input correctly", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>().mockResolvedValue(
          createMockResponse(
            {
              rajaongkir: {
                results: [{ province_id: "1" }],
                status: { code: 200 },
              },
            },
            200
          )
        )
      );

      const result = await testConnection({
        accountType: "starter",
        apiKey: "raja_123",
        provider: "rajaongkir",
      });

      expect(result.success).toBeTruthy();
    });

    it("handles unsupported provider safely", async () => {
      // SAFETY: Testing runtime fallback for unsupported provider input.
      const unknownInput = { provider: "unknown" };
      const result = await testConnection(unknownInput as never);

      expect(result.success).toBeFalsy();
      expect(result.error).toBe("UNSUPPORTED_PROVIDER");
    });

    it("handles network errors and rejection across providers", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn<typeof fetch>()
          .mockRejectedValue(new Error("Network connection down"))
      );

      const midtransRes = await testMidtransConnection({
        isProduction: false,
        serverKey: "server-key",
      });
      expect(midtransRes.error).toBe("NETWORK_ERROR");

      const xenditRes = await testXenditConnection({
        isProduction: false,
        secretKey: "secret-key",
      });
      expect(xenditRes.error).toBe("NETWORK_ERROR");

      const rajaRes = await testRajaOngkirConnection({
        accountType: "starter",
        apiKey: "api-key",
      });
      expect(rajaRes.error).toBe("NETWORK_ERROR");

      // Non-Error rejection fallback
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>().mockRejectedValue("string-error")
      );
      const rajaRes2 = await testRajaOngkirConnection({
        accountType: "starter",
        apiKey: "api-key",
      });
      expect(rajaRes2.error).toBe("NETWORK_ERROR");
    });
  });
});
