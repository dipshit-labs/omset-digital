import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import {
  midtransHandlers,
  rajaongkirHandlers,
  resendHandlers,
  xenditHandlers,
} from "./handlers";
import { handlers, server } from "./index";

describe("@repo/test-kit MSW centralized handlers", () => {
  it("exports handler arrays for each provider", () => {
    expect(Array.isArray(midtransHandlers)).toBeTruthy();
    expect(Array.isArray(xenditHandlers)).toBeTruthy();
    expect(Array.isArray(rajaongkirHandlers)).toBeTruthy();
    expect(Array.isArray(resendHandlers)).toBeTruthy();
  });

  it("exports aggregated handlers array with all provider routes", () => {
    expect(Array.isArray(handlers)).toBeTruthy();
    expect(handlers.length).toBeGreaterThanOrEqual(8);
  });

  describe("Midtrans handlers", () => {
    it("intercepts Snap transaction creation with token and redirect URL", async () => {
      const response = await fetch(
        "https://app.sandbox.midtrans.com/snap/v1/transactions",
        {
          headers: { "Content-Type": "application/json" },
          method: "POST",
          body: JSON.stringify({
            transaction_details: { gross_amount: 50_000, order_id: "ORD-M-1" },
          }),
        }
      );

      expect(response.status).toBe(201);
      // SAFETY: Midtrans mock handler returns typed Snap transaction response.
      const data = (await response.json()) as {
        redirect_url: string;
        token: string;
      };
      expect(data.token).toBeTypeOf("string");
      expect(data.redirect_url).toContain(data.token);
    });

    it("intercepts Core API transaction status inquiry with matching orderId", async () => {
      const response = await fetch(
        "https://api.sandbox.midtrans.com/v2/ORD-TEST-99/status"
      );

      expect(response.status).toBe(200);
      // SAFETY: Midtrans mock handler returns transaction status payload.
      const data = (await response.json()) as {
        order_id: string;
        status_code: string;
        transaction_status: string;
      };
      expect(data.order_id).toBe("ORD-TEST-99");
      expect(data.status_code).toBe("200");
      expect(data.transaction_status).toBe("settlement");
    });
  });

  describe("Xendit handlers", () => {
    it("intercepts invoice creation with externalId and invoice URL", async () => {
      const response = await fetch("https://api.xendit.co/v2/invoices", {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({
          amount: 75_000,
          external_id: "ORD-X-1",
        }),
      });

      expect(response.status).toBe(200);
      // SAFETY: Xendit mock handler returns typed invoice payload.
      const data = (await response.json()) as {
        external_id: string;
        id: string;
        invoice_url: string;
        status: string;
      };
      expect(data.id).toBeTypeOf("string");
      expect(data.external_id).toBe("ORD-X-1");
      expect(data.status).toBe("PENDING");
      expect(data.invoice_url).toContain("https://");
    });

    it("intercepts invoice lookup by invoice ID", async () => {
      const response = await fetch(
        "https://api.xendit.co/v2/invoices/inv_custom_123"
      );

      expect(response.status).toBe(200);
      // SAFETY: Xendit mock handler returns invoice document matching ID.
      const data = (await response.json()) as { id: string; status: string };
      expect(data.id).toBe("inv_custom_123");
      expect(data.status).toBe("PAID");
    });

    it("intercepts invoice lookup by external ID query parameter", async () => {
      const response = await fetch(
        "https://api.xendit.co/v2/invoices?external_id=ORD-X-QUERY"
      );

      expect(response.status).toBe(200);
      // SAFETY: Xendit mock handler returns list of invoices for query.
      const data = (await response.json()) as {
        external_id: string;
        id: string;
      }[];
      expect(Array.isArray(data)).toBeTruthy();
      expect(data[0]?.external_id).toBe("ORD-X-QUERY");
    });
  });

  describe("RajaOngkir handlers", () => {
    it("intercepts cost calculation for starter account endpoint", async () => {
      const params = new URLSearchParams({
        courier: "jne",
        destination: "114",
        origin: "501",
        weight: "1000",
      });

      const response = await fetch("https://api.rajaongkir.com/starter/cost", {
        body: params.toString(),
        method: "POST",
        headers: {
          key: "test-api-key",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      expect(response.status).toBe(200);
      // SAFETY: RajaOngkir starter endpoint returns cost calculation payload.
      const data = (await response.json()) as {
        rajaongkir: {
          results: { code: string; costs: unknown[] }[];
          status: { code: number };
        };
      };
      expect(data.rajaongkir.status.code).toBe(200);
      expect(data.rajaongkir.results.length).toBeGreaterThan(0);
      expect(data.rajaongkir.results[0]?.code).toBe("jne");
    });

    it("intercepts cost calculation for pro account endpoint", async () => {
      const params = new URLSearchParams({
        courier: "sicepat",
        destination: "200",
        origin: "100",
        weight: "2000",
      });

      const response = await fetch("https://pro.rajaongkir.com/api/cost", {
        body: params.toString(),
        method: "POST",
        headers: {
          key: "test-api-key",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      expect(response.status).toBe(200);
      // SAFETY: RajaOngkir pro endpoint returns cost calculation payload.
      const data = (await response.json()) as {
        rajaongkir: { status: { code: number } };
      };
      expect(data.rajaongkir.status.code).toBe(200);
    });
  });

  describe("Resend handlers", () => {
    it("intercepts email dispatch returning generated email ID", async () => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        body: JSON.stringify({
          from: "noreply@omsetdigital.com",
          subject: "Welcome",
          to: "buyer@example.com",
        }),
        headers: {
          Authorization: "Bearer re_123",
          "Content-Type": "application/json",
        },
      });

      expect(response.status).toBe(200);
      // SAFETY: Resend mock handler returns response containing email id.
      const data = (await response.json()) as { id: string };
      expect(data.id).toMatch(/^re_/u);
    });
  });

  describe("Server runtime override and reset lifecycle", () => {
    it("allows per-test override with server.use()", async () => {
      server.use(
        http.post("https://api.resend.com/emails", () =>
          HttpResponse.json(
            { message: "Rate limit exceeded", statusCode: 429 },
            { status: 429 }
          )
        )
      );

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
      });

      expect(response.status).toBe(429);
    });

    it("restores original default handler after resetHandlers() runs in afterEach", async () => {
      const response = await fetch("https://api.resend.com/emails", {
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(200);
      // SAFETY: Resend default mock handler returns response containing email id.
      const data = (await response.json()) as { id: string };
      expect(data.id).toMatch(/^re_/u);
    });
  });
});
