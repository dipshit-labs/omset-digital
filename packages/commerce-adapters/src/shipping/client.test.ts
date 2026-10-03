import { server } from "@repo/test-kit";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { RajaOngkirClient } from "./client";
import type { CourierCostResult } from "./types";

describe(RajaOngkirClient, () => {
  const mockApiKey = "mock-rajaongkir-api-key-12345";

  const mockCostResults: CourierCostResult[] = [
    {
      code: "jne",
      name: "Jalur Nugraha Ekakurir (JNE)",
      costs: [
        {
          cost: [{ etd: "1-2", note: "", value: 18_000 }],
          description: "Layanan Reguler",
          service: "REG",
        },
      ],
    },
  ];

  describe("calculateCost on Starter tier", () => {
    it("posts to starter cost endpoint with correct headers and URL", async () => {
      const client = new RajaOngkirClient({
        accountType: "starter",
        apiKey: mockApiKey,
      });

      let capturedUrl = "";
      let capturedMethod = "";
      let capturedApiKey: string | null = null;
      let capturedContentType: string | null = null;

      server.use(
        http.post("https://api.rajaongkir.com/starter/cost", ({ request }) => {
          capturedUrl = request.url;
          capturedMethod = request.method;
          capturedApiKey = request.headers.get("key");
          capturedContentType = request.headers.get("content-type");
          return HttpResponse.json(
            {
              rajaongkir: {
                results: mockCostResults,
                status: { code: 200, description: "OK" },
              },
            },
            { status: 200 }
          );
        })
      );

      const results = await client.calculateCost({
        couriers: ["jne"],
        destination: 501,
        origin: 152,
        weightInGrams: 1250,
      });

      expect(results).toStrictEqual(mockCostResults);
      expect(capturedUrl).toBe("https://api.rajaongkir.com/starter/cost");
      expect(capturedMethod).toBe("POST");
      expect(capturedApiKey).toBe(mockApiKey);
      expect(capturedContentType).toContain(
        "application/x-www-form-urlencoded"
      );
    });

    it("encodes standard URL-encoded body parameters without subdistrict types on Starter tier", async () => {
      const client = new RajaOngkirClient({
        accountType: "starter",
        apiKey: mockApiKey,
      });

      let capturedBody = "";
      server.use(
        http.post(
          "https://api.rajaongkir.com/starter/cost",
          async ({ request }) => {
            capturedBody = await request.text();
            return HttpResponse.json(
              {
                rajaongkir: {
                  results: mockCostResults,
                  status: { code: 200, description: "OK" },
                },
              },
              { status: 200 }
            );
          }
        )
      );

      await client.calculateCost({
        couriers: ["jne"],
        destination: 501,
        origin: 152,
        weightInGrams: 1250,
      });

      const bodyParams = new URLSearchParams(capturedBody);
      expect(bodyParams.get("origin")).toBe("152");
      expect(bodyParams.get("destination")).toBe("501");
      expect(bodyParams.get("weight")).toBe("1250");
      expect(bodyParams.get("courier")).toBe("jne");
      expect(bodyParams.get("originType")).toBeNull();
    });

    it("queries each courier separately without colons on Starter tier when multiple couriers requested", async () => {
      const client = new RajaOngkirClient({
        accountType: "starter",
        apiKey: mockApiKey,
      });

      const capturedCouriers: string[] = [];
      server.use(
        http.post(
          "https://api.rajaongkir.com/starter/cost",
          async ({ request }) => {
            const body = await request.text();
            const bodyParams = new URLSearchParams(body);
            capturedCouriers.push(bodyParams.get("courier") ?? "");
            return HttpResponse.json(
              {
                rajaongkir: {
                  results: mockCostResults,
                  status: { code: 200, description: "OK" },
                },
              },
              { status: 200 }
            );
          }
        )
      );

      const results = await client.calculateCost({
        couriers: ["jne", "tiki"],
        destination: 501,
        origin: 152,
        weightInGrams: 1000,
      });

      expect(results).toHaveLength(2);
      expect(capturedCouriers).toStrictEqual(["jne", "tiki"]);
    });
  });

  describe("calculateCost on Pro tier", () => {
    it("posts to pro endpoint with subdistrict types and colon-delimited couriers", async () => {
      const client = new RajaOngkirClient({
        accountType: "pro",
        apiKey: mockApiKey,
      });

      let capturedUrl = "";
      let capturedBody = "";

      server.use(
        http.post(
          "https://pro.rajaongkir.com/api/cost",
          async ({ request }) => {
            capturedUrl = request.url;
            capturedBody = await request.text();
            return HttpResponse.json(
              {
                rajaongkir: {
                  results: mockCostResults,
                  status: { code: 200, description: "OK" },
                },
              },
              { status: 200 }
            );
          }
        )
      );

      const results = await client.calculateCost({
        couriers: ["jne", "pos", "tiki"],
        destination: 2105,
        destinationType: "subdistrict",
        origin: 574,
        originType: "subdistrict",
        weightInGrams: 1800,
      });

      expect(results).toStrictEqual(mockCostResults);
      expect(capturedUrl).toBe("https://pro.rajaongkir.com/api/cost");

      const bodyParams = new URLSearchParams(capturedBody);
      expect(bodyParams.get("courier")).toBe("jne:pos:tiki");
      expect(bodyParams.get("originType")).toBe("subdistrict");
      expect(bodyParams.get("destinationType")).toBe("subdistrict");
    });

    it("defaults originType and destinationType to subdistrict when omitted on Pro tier", async () => {
      const client = new RajaOngkirClient({
        accountType: "pro",
        apiKey: mockApiKey,
      });

      let capturedBody = "";
      server.use(
        http.post(
          "https://pro.rajaongkir.com/api/cost",
          async ({ request }) => {
            capturedBody = await request.text();
            return HttpResponse.json(
              {
                rajaongkir: {
                  results: mockCostResults,
                  status: { code: 200, description: "OK" },
                },
              },
              { status: 200 }
            );
          }
        )
      );

      await client.calculateCost({
        couriers: "jne:sicepat",
        destination: 1234,
        origin: 5678,
        weightInGrams: 500,
      });

      const bodyParams = new URLSearchParams(capturedBody);
      expect(bodyParams.get("originType")).toBe("subdistrict");
      expect(bodyParams.get("destinationType")).toBe("subdistrict");
      expect(bodyParams.get("courier")).toBe("jne:sicepat");
    });

    it("allows city originType and destinationType on Pro tier", async () => {
      const client = new RajaOngkirClient({
        accountType: "pro",
        apiKey: mockApiKey,
      });

      let capturedBody = "";
      server.use(
        http.post(
          "https://pro.rajaongkir.com/api/cost",
          async ({ request }) => {
            capturedBody = await request.text();
            return HttpResponse.json(
              {
                rajaongkir: {
                  results: mockCostResults,
                  status: { code: 200, description: "OK" },
                },
              },
              { status: 200 }
            );
          }
        )
      );

      await client.calculateCost({
        couriers: ["jne"],
        destination: 501,
        destinationType: "city",
        origin: 152,
        originType: "city",
        weightInGrams: 500,
      });

      const bodyParams = new URLSearchParams(capturedBody);
      expect(bodyParams.get("originType")).toBe("city");
      expect(bodyParams.get("destinationType")).toBe("city");
    });
  });

  describe("validation and error handling", () => {
    it("throws an error when apiKey is empty or blank", () => {
      expect(() => new RajaOngkirClient({ apiKey: "" })).toThrow(
        /API key is required/iu
      );
      expect(() => new RajaOngkirClient({ apiKey: "   " })).toThrow(
        /API key is required/iu
      );
    });

    it("clamps weight to at least 1 gram integer", async () => {
      const client = new RajaOngkirClient({
        accountType: "starter",
        apiKey: mockApiKey,
      });

      let capturedBody = "";
      server.use(
        http.post(
          "https://api.rajaongkir.com/starter/cost",
          async ({ request }) => {
            capturedBody = await request.text();
            return HttpResponse.json(
              {
                rajaongkir: {
                  results: mockCostResults,
                  status: { code: 200, description: "OK" },
                },
              },
              { status: 200 }
            );
          }
        )
      );

      await client.calculateCost({
        couriers: ["jne"],
        destination: 501,
        origin: 152,
        weightInGrams: 0,
      });

      const bodyParams = new URLSearchParams(capturedBody);
      expect(bodyParams.get("weight")).toBe("1");
    });

    it("throws an error when RajaOngkir returns non-200 status envelope", async () => {
      const client = new RajaOngkirClient({
        accountType: "starter",
        apiKey: mockApiKey,
      });

      server.use(
        http.post("https://api.rajaongkir.com/starter/cost", () =>
          HttpResponse.json(
            {
              rajaongkir: {
                results: [],
                status: {
                  code: 400,
                  description: "Unknown destination ID",
                },
              },
            },
            { status: 200 }
          )
        )
      );

      await expect(
        client.calculateCost({
          couriers: ["jne"],
          destination: 999_999,
          origin: 152,
          weightInGrams: 1000,
        })
      ).rejects.toThrow("RajaOngkir error: Unknown destination ID");
    });

    it("throws an error when HTTP request fails with 401 Unauthorized", async () => {
      const client = new RajaOngkirClient({
        accountType: "starter",
        apiKey: mockApiKey,
      });

      server.use(
        http.post(
          "https://api.rajaongkir.com/starter/cost",
          () => new HttpResponse("Invalid key", { status: 401 })
        )
      );

      await expect(
        client.calculateCost({
          couriers: ["jne"],
          destination: 501,
          origin: 152,
          weightInGrams: 1000,
        })
      ).rejects.toThrow(/RajaOngkir API HTTP error \(401\)/iu);
    });
  });
});
