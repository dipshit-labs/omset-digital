import crypto from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CreatePaymentSessionInput } from "../types";
import { PaymentWebhookError } from "../types";
import { MidtransClient } from "./client";
import { verifyMidtransSignature } from "./signature";

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

      const input: CreatePaymentSessionInput = {
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
        redirectUrl: expectedRedirectUrl,
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

    it("throws descriptive error when Midtrans returns malformed Snap response", async () => {
      const client = new MidtransClient({
        serverKey: mockServerKey,
      });

      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        Response.json(
          {
            status: "ok",
          },
          { status: 200 }
        )
      );

      await expect(
        client.createSession({
          grossAmount: 50_000,
          orderId: "ORDER-MALFORMED",
        })
      ).rejects.toThrow("Failed to validate Midtrans Snap response");
    });
  });

  describe("getTransactionStatus", () => {
    it("queries order status in sandbox environment with Basic Auth and normalizes to ParsedPaymentStatus", async () => {
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

      expect(status).toStrictEqual({
        grossAmount: 150_000,
        orderId: "ORDER-1001",
        paymentStatus: "paid",
        paymentType: "qris",
        settlementTime: undefined,
        transactionId: "tx-uuid-1234",
        metadata: {
          fraudStatus: "accept",
          grossAmountRaw: "150000.00",
          paymentType: "qris",
          settlementTime: undefined,
          statusCode: "200",
          statusMessage: "Success, transaction found",
          transactionId: "tx-uuid-1234",
          transactionStatus: "settlement",
          transactionTime: "2026-10-01 10:00:00",
        },
      });
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
                gross_amount: "50000.00",
                order_id: "ORDER-PROD-99",
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

    it("throws descriptive error when transaction status returns malformed payload", async () => {
      const client = new MidtransClient({
        serverKey: mockServerKey,
      });

      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        Response.json(
          {
            status: "not_a_valid_status_payload",
          },
          { status: 200 }
        )
      );

      await expect(
        client.getTransactionStatus("ORDER-MALFORMED")
      ).rejects.toThrow("Failed to validate Midtrans status response");
    });
  });

  describe("parseWebhook", () => {
    const orderId = "ORDER-WEBHOOK-1";
    const statusCode = "200";
    const grossAmount = "250000.00";

    const computeSignature = (
      key: string,
      oid = orderId,
      sc = statusCode,
      ga = grossAmount
    ) => {
      const hash = crypto.createHash("sha512");
      hash.update(`${oid}${sc}${ga}${key}`);
      return hash.digest("hex");
    };

    it("validates incoming raw body, verifies signature via tsscmp preserving decimal gross_amount, and returns canonical ParsedWebhookEvent", async () => {
      const client = new MidtransClient({
        serverKey: mockServerKey,
      });

      const signatureKey = computeSignature(mockServerKey);
      const rawPayload = {
        fraud_status: "accept",
        gross_amount: grossAmount,
        order_id: orderId,
        payment_type: "bank_transfer",
        settlement_time: "2026-10-01 12:00:00",
        signature_key: signatureKey,
        status_code: statusCode,
        status_message: "Success",
        transaction_id: "tx-midtrans-uuid-999",
        transaction_status: "settlement",
        transaction_time: "2026-10-01 11:59:00",
      };

      const event = await client.parseWebhook({
        rawBody: JSON.stringify(rawPayload),
      });

      expect(event).toStrictEqual({
        orderId,
        paymentStatus: "paid",
        providerEventId: "tx-midtrans-uuid-999",
        metadata: {
          currency: undefined,
          fraudStatus: "accept",
          grossAmount: "250000.00",
          merchantId: undefined,
          paymentType: "bank_transfer",
          settlementTime: "2026-10-01 12:00:00",
          statusCode: "200",
          statusMessage: "Success",
          transactionId: "tx-midtrans-uuid-999",
          transactionStatus: "settlement",
          transactionTime: "2026-10-01 11:59:00",
        },
      });
    });

    it("maps capture transaction with challenge fraud status to pending", async () => {
      const client = new MidtransClient({
        serverKey: mockServerKey,
      });

      const signatureKey = computeSignature(
        mockServerKey,
        orderId,
        "200",
        grossAmount
      );
      const rawPayload = {
        fraud_status: "challenge",
        gross_amount: grossAmount,
        order_id: orderId,
        signature_key: signatureKey,
        status_code: "200",
        transaction_id: "tx-capture-1",
        transaction_status: "capture",
      };

      const event = await client.parseWebhook({
        rawBody: JSON.stringify(rawPayload),
      });

      expect(event.paymentStatus).toBe("pending");
      expect(event.providerEventId).toBe("tx-capture-1");
    });

    it("maps capture transaction with deny fraud status to failed", async () => {
      const client = new MidtransClient({
        serverKey: mockServerKey,
      });

      const signatureKey = computeSignature(
        mockServerKey,
        orderId,
        "200",
        grossAmount
      );
      const rawPayload = {
        fraud_status: "deny",
        gross_amount: grossAmount,
        order_id: orderId,
        signature_key: signatureKey,
        status_code: "200",
        transaction_id: "tx-capture-deny",
        transaction_status: "capture",
      };

      const event = await client.parseWebhook({
        rawBody: JSON.stringify(rawPayload),
      });

      expect(event.paymentStatus).toBe("failed");
      expect(event.providerEventId).toBe("tx-capture-deny");
    });

    it("accepts merchant secret override in ParseWebhookInput", async () => {
      const client = new MidtransClient({
        serverKey: "dummy-key",
      });

      const customSecret = "custom-server-key-override";
      const signatureKey = computeSignature(
        customSecret,
        orderId,
        "200",
        grossAmount
      );
      const rawPayload = {
        gross_amount: grossAmount,
        order_id: orderId,
        signature_key: signatureKey,
        status_code: "200",
        transaction_id: "tx-custom-1",
        transaction_status: "settlement",
      };

      const event = await client.parseWebhook({
        rawBody: JSON.stringify(rawPayload),
        secret: customSecret,
      });

      expect(event.paymentStatus).toBe("paid");
      expect(event.orderId).toBe(orderId);
    });

    it("rejects invalid signature with 401 PaymentWebhookError", async () => {
      const client = new MidtransClient({
        serverKey: mockServerKey,
      });

      const rawPayload = {
        gross_amount: grossAmount,
        order_id: orderId,
        signature_key: "tampered_wrong_signature_hex",
        status_code: statusCode,
        transaction_status: "settlement",
      };

      await expect(
        client.parseWebhook({
          rawBody: JSON.stringify(rawPayload),
        })
      ).rejects.toSatisfy((err: unknown) => {
        if (!(err instanceof PaymentWebhookError)) {
          return false;
        }
        expect(err.statusCode).toBe(401);
        expect(err.message).toContain("Invalid webhook signature");
        return true;
      });
    });

    it("rejects signature when gross_amount is modified from decimal with 401", async () => {
      const client = new MidtransClient({
        serverKey: mockServerKey,
      });

      const signatureKey = computeSignature(
        mockServerKey,
        orderId,
        statusCode,
        "250000.00"
      );
      const rawPayload = {
        gross_amount: "250000",
        order_id: orderId,
        signature_key: signatureKey,
        status_code: statusCode,
        transaction_status: "settlement",
      };

      await expect(
        client.parseWebhook({
          rawBody: JSON.stringify(rawPayload),
        })
      ).rejects.toSatisfy((err: unknown) => {
        if (!(err instanceof PaymentWebhookError)) {
          return false;
        }
        expect(err.statusCode).toBe(401);
        return true;
      });
    });

    it("rejects when no serverKey is available with 401", async () => {
      const client = new MidtransClient({
        serverKey: "",
      });

      const rawPayload = {
        gross_amount: grossAmount,
        order_id: orderId,
        signature_key: "any-signature",
        status_code: statusCode,
        transaction_status: "settlement",
      };

      await expect(
        client.parseWebhook({
          rawBody: JSON.stringify(rawPayload),
        })
      ).rejects.toSatisfy((err: unknown) => {
        if (!(err instanceof PaymentWebhookError)) {
          return false;
        }
        expect(err.statusCode).toBe(401);
        expect(err.message).toContain("Missing server key");
        return true;
      });
    });

    it("rejects non-JSON raw body with 400 PaymentWebhookError", async () => {
      const client = new MidtransClient({
        serverKey: mockServerKey,
      });

      await expect(
        client.parseWebhook({
          rawBody: "{ invalid json format",
        })
      ).rejects.toSatisfy((err: unknown) => {
        if (!(err instanceof PaymentWebhookError)) {
          return false;
        }
        expect(err.statusCode).toBe(400);
        expect(err.message).toContain("Invalid JSON");
        return true;
      });
    });

    it("rejects payload missing required fields with 400 PaymentWebhookError", async () => {
      const client = new MidtransClient({
        serverKey: mockServerKey,
      });

      const invalidPayload = {
        transaction_time: "2026-10-01 10:00:00",
      };

      await expect(
        client.parseWebhook({
          rawBody: JSON.stringify(invalidPayload),
        })
      ).rejects.toSatisfy((err: unknown) => {
        if (!(err instanceof PaymentWebhookError)) {
          return false;
        }
        expect(err.statusCode).toBe(400);
        expect(err.message).toContain("Malformed webhook payload");
        return true;
      });
    });

    it("rejects payload with empty string required fields with 400 PaymentWebhookError", async () => {
      const client = new MidtransClient({
        serverKey: mockServerKey,
      });

      const invalidPayload = {
        gross_amount: "",
        order_id: "",
        signature_key: "",
        status_code: "",
        transaction_status: "",
      };

      await expect(
        client.parseWebhook({
          rawBody: JSON.stringify(invalidPayload),
        })
      ).rejects.toSatisfy((err: unknown) => {
        if (!(err instanceof PaymentWebhookError)) {
          return false;
        }
        expect(err.statusCode).toBe(400);
        return true;
      });
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
