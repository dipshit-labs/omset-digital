import crypto from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MidtransClient } from "./client";
import { verifyMidtransSignature } from "./signature";
import type { CreateSnapSessionInput } from "./types";

describe(MidtransClient, () => {
  const mockServerKey = "SB-Mid-server-TEST12345";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createSession", () => {
    it("creates a Snap transaction session in sandbox environment with correct Basic Auth header and payload", async () => {
      const client = new MidtransClient({
        isProduction: false,
        serverKey: mockServerKey,
      });

      const input: CreateSnapSessionInput = {
        grossAmount: 150_000,
        orderId: "ORDER-1001",
        customer: {
          email: "budi@example.com",
          firstName: "Budi",
          phone: "+6281234567890",
        },
        items: [
          {
            id: "VAR-1",
            name: "Kopi Gayo 250g",
            price: 150_000,
            quantity: 1,
          },
        ],
      };

      const expectedToken = "mock-snap-token-xyz";
      const expectedRedirectUrl =
        "https://app.sandbox.midtrans.com/snap/v2/vtweb/mock-snap-token-xyz";

      let capturedUrl = "";
      let capturedOptions: RequestInit | undefined;

      vi.spyOn(globalThis, "fetch").mockImplementation(
        (url: string | URL | Request, init?: RequestInit) => {
          capturedUrl = String(url);
          capturedOptions = init;
          return Promise.resolve(
            Response.json(
              {
                redirect_url: expectedRedirectUrl,
                token: expectedToken,
              },
              { status: 201 }
            )
          );
        }
      );

      const response = await client.createSession(input);

      expect(response).toStrictEqual({
        redirect_url: expectedRedirectUrl,
        token: expectedToken,
      });

      expect(capturedUrl).toBe(
        "https://app.sandbox.midtrans.com/snap/v1/transactions"
      );

      const expectedBasicAuth = `Basic ${Buffer.from(`${mockServerKey}:`).toString("base64")}`;
      const headers = capturedOptions?.headers as Record<string, string>;
      expect(headers["Authorization"]).toBe(expectedBasicAuth);

      const body = JSON.parse(String(capturedOptions?.body));
      expect(body).toStrictEqual({
        customer_details: {
          email: "budi@example.com",
          first_name: "Budi",
          phone: "+6281234567890",
        },
        item_details: [
          {
            id: "VAR-1",
            name: "Kopi Gayo 250g",
            price: 150_000,
            quantity: 1,
          },
        ],
        transaction_details: {
          gross_amount: 150_000,
          order_id: "ORDER-1001",
        },
      });
    });

    it("uses production Snap URL when isProduction is true", async () => {
      const client = new MidtransClient({
        isProduction: true,
        serverKey: "Mid-server-PROD12345",
      });

      let capturedUrl = "";
      vi.spyOn(globalThis, "fetch").mockImplementation(
        (url: string | URL | Request) => {
          capturedUrl = String(url);
          return Promise.resolve(
            Response.json(
              {
                token: "prod-token",
                redirect_url:
                  "https://app.midtrans.com/snap/v2/vtweb/prod-token",
              },
              { status: 201 }
            )
          );
        }
      );

      await client.createSession({
        grossAmount: 50_000,
        orderId: "ORDER-PROD-1",
      });

      expect(capturedUrl).toBe("https://app.midtrans.com/snap/v1/transactions");
    });

    it("throws descriptive error when Midtrans returns HTTP failure", async () => {
      const client = new MidtransClient({
        serverKey: mockServerKey,
      });

      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        Response.json(
          {
            error_messages: [
              "transaction_details.order_id has already been taken",
            ],
          },
          { status: 400 }
        )
      );

      await expect(
        client.createSession({
          grossAmount: 50_000,
          orderId: "ORDER-DUPLICATE",
        })
      ).rejects.toThrow("Midtrans API error (400)");
    });
  });

  describe("getTransactionStatus", () => {
    it("queries order status in sandbox environment with Basic Auth", async () => {
      const client = new MidtransClient({
        isProduction: false,
        serverKey: mockServerKey,
      });

      let capturedUrl = "";
      let capturedOptions: RequestInit | undefined;

      const mockStatusResponse = {
        fraud_status: "accept",
        gross_amount: "150000.00",
        order_id: "ORDER-1001",
        payment_type: "qris",
        signature_key: "abc123mocksignature",
        status_code: "200",
        status_message: "Success, transaction found",
        transaction_id: "tx-uuid-1234",
        transaction_status: "settlement",
        transaction_time: "2026-10-01 10:00:00",
      };

      vi.spyOn(globalThis, "fetch").mockImplementation(
        (url: string | URL | Request, init?: RequestInit) => {
          capturedUrl = String(url);
          capturedOptions = init;
          return Promise.resolve(
            Response.json(mockStatusResponse, { status: 200 })
          );
        }
      );

      const status = await client.getTransactionStatus("ORDER-1001");

      expect(status).toStrictEqual(mockStatusResponse);
      expect(capturedUrl).toBe(
        "https://api.sandbox.midtrans.com/v2/ORDER-1001/status"
      );

      const expectedBasicAuth = `Basic ${Buffer.from(`${mockServerKey}:`).toString("base64")}`;
      const headers = capturedOptions?.headers as Record<string, string>;
      expect(headers["Authorization"]).toBe(expectedBasicAuth);
    });

    it("queries order status in production environment when isProduction is true", async () => {
      const client = new MidtransClient({
        isProduction: true,
        serverKey: "Mid-server-PROD12345",
      });

      let capturedUrl = "";
      vi.spyOn(globalThis, "fetch").mockImplementation(
        (url: string | URL | Request) => {
          capturedUrl = String(url);
          return Promise.resolve(
            Response.json(
              {
                status_code: "200",
                transaction_status: "settlement",
              },
              { status: 200 }
            )
          );
        }
      );

      await client.getTransactionStatus("ORDER-PROD-99");
      expect(capturedUrl).toBe(
        "https://api.midtrans.com/v2/ORDER-PROD-99/status"
      );
    });

    it("throws descriptive error when transaction status returns 404 or other failure", async () => {
      const client = new MidtransClient({
        serverKey: mockServerKey,
      });

      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        Response.json(
          {
            status_code: "404",
            status_message: "Transaction doesn't exist.",
          },
          { status: 404 }
        )
      );

      await expect(client.getTransactionStatus("NONEXISTENT")).rejects.toThrow(
        "Midtrans API error (404)"
      );
    });
  });

  describe(verifyMidtransSignature, () => {
    const orderId = "ORDER-1001";
    const statusCode = "200";
    const grossAmount = "150000.00";
    const serverKey = "SB-Mid-server-TEST12345";

    it("verifies valid SHA-512 signature against exact unmodified decimal gross_amount", () => {
      const hash = crypto.createHash("sha512");
      hash.update(`${orderId}${statusCode}${grossAmount}${serverKey}`);
      const validSignature = hash.digest("hex");

      const result = verifyMidtransSignature(
        {
          gross_amount: grossAmount,
          order_id: orderId,
          signature_key: validSignature,
          status_code: statusCode,
        },
        serverKey
      );

      expect(result).toBeTruthy();
    });

    it("rejects signature when gross_amount is coerced to integer without decimals", () => {
      const hash = crypto.createHash("sha512");
      hash.update(`${orderId}${statusCode}150000.00${serverKey}`);
      const validSignature = hash.digest("hex");

      const result = verifyMidtransSignature(
        {
          gross_amount: "150000",
          order_id: orderId,
          signature_key: validSignature,
          status_code: statusCode,
        },
        serverKey
      );

      expect(result).toBeFalsy();
    });

    it("rejects tampered signature", () => {
      const result = verifyMidtransSignature(
        {
          gross_amount: grossAmount,
          order_id: orderId,
          status_code: statusCode,
          signature_key:
            "fe5f725ea770c451017e9d6300af72b830a668d2f7d5da9b778ec2c4f9177efe5127d492d9ddfbcf6806ea5cd7dc1a7337c674d6139026b28f49ad0ea1ce5107",
        },
        serverKey
      );

      expect(result).toBeFalsy();
    });

    it("returns false if any required signature verification property is missing or empty", () => {
      expect(
        verifyMidtransSignature(
          {
            gross_amount: "",
            order_id: orderId,
            signature_key: "abc",
            status_code: statusCode,
          },
          serverKey
        )
      ).toBeFalsy();

      expect(
        verifyMidtransSignature(
          {
            gross_amount: grossAmount,
            order_id: "",
            signature_key: "abc",
            status_code: statusCode,
          },
          serverKey
        )
      ).toBeFalsy();

      expect(
        verifyMidtransSignature(
          {
            gross_amount: grossAmount,
            order_id: orderId,
            signature_key: "",
            status_code: statusCode,
          },
          serverKey
        )
      ).toBeFalsy();
    });
  });
});
