import { Buffer } from "node:buffer";
import crypto from "node:crypto";

import { server } from "@repo/test-kit";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import type { CreatePaymentSessionInput } from "../types";
import { PaymentWebhookError } from "../types";
import { XenditClient } from "./client";
import {
  generateXenditHmacSignature,
  verifyXenditCallbackToken,
  verifyXenditHmacSignature,
} from "./signature";

describe(XenditClient, () => {
  const mockSecretKey = "xnd_development_secret_key_12345";

  it("exposes canonical payment provider id", () => {
    const client = new XenditClient({
      secretKey: mockSecretKey,
    });
    expect(client.id).toBe("xendit");
  });

  describe("createSession", () => {
    it("creates an invoice session with correct Basic Auth header, payload, and normalizes to PaymentSession", async () => {
      const client = new XenditClient({
        secretKey: mockSecretKey,
      });

      const input: CreatePaymentSessionInput = {
        description: "Payment for Order #ORDER-2001",
        failureUrl: "https://toko.example.com/checkout/failure",
        grossAmount: 250_000,
        orderId: "ORDER-2001",
        successUrl: "https://toko.example.com/checkout/success",
        customer: {
          email: "buyer@example.com",
          firstName: "Siti",
          lastName: "Rahma",
          phone: "+6281234567890",
        },
        items: [
          {
            id: "VAR-1",
            name: "Batik Tulis Premium",
            price: 250_000,
            quantity: 1,
          },
        ],
      };

      const expectedInvoiceId = "inv_651234567890abcdef";
      const expectedInvoiceUrl =
        "https://checkout.xendit.co/web/inv_651234567890abcdef";

      let capturedUrl = "";
      let capturedAuthHeader: string | null = null;
      let capturedContentType: string | null = null;
      let capturedMethod: string | null = null;
      let parsedBody: Record<string, unknown> | null = null;

      server.use(
        http.post("https://api.xendit.co/v2/invoices", async ({ request }) => {
          capturedUrl = request.url;
          capturedMethod = request.method;
          capturedAuthHeader = request.headers.get("authorization");
          capturedContentType = request.headers.get("content-type");
          // SAFETY: MSW parses JSON request payload as a generic record.
          parsedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(
            {
              amount: 250_000,
              external_id: "ORDER-2001",
              id: expectedInvoiceId,
              invoice_url: expectedInvoiceUrl,
              status: "PENDING",
            },
            { status: 201 }
          );
        })
      );

      const session = await client.createSession(input);

      expect(session).toStrictEqual({
        redirectUrl: expectedInvoiceUrl,
        token: expectedInvoiceId,
      });

      const expectedBase64 = Buffer.from(`${mockSecretKey}:`).toString(
        "base64"
      );
      expect({
        authHeader: capturedAuthHeader,
        contentType: capturedContentType,
        method: capturedMethod,
        url: capturedUrl,
      }).toStrictEqual({
        authHeader: `Basic ${expectedBase64}`,
        contentType: "application/json",
        method: "POST",
        url: "https://api.xendit.co/v2/invoices",
      });
      expect(parsedBody).toStrictEqual({
        amount: 250_000,
        currency: "IDR",
        description: "Payment for Order #ORDER-2001",
        external_id: "ORDER-2001",
        failure_redirect_url: "https://toko.example.com/checkout/failure",
        payer_email: "buyer@example.com",
        success_redirect_url: "https://toko.example.com/checkout/success",
        customer: {
          email: "buyer@example.com",
          given_names: "Siti",
          mobile_number: "+6281234567890",
          surname: "Rahma",
        },
        items: [
          {
            name: "Batik Tulis Premium",
            price: 250_000,
            quantity: 1,
          },
        ],
      });
    });

    it("creates invoice session with minimal input using default description", async () => {
      const client = new XenditClient({
        secretKey: mockSecretKey,
      });

      const input: CreatePaymentSessionInput = {
        grossAmount: 100_000,
        orderId: "ORDER-MINIMAL",
      };

      let parsedBody: Record<string, unknown> | null = null;

      server.use(
        http.post("https://api.xendit.co/v2/invoices", async ({ request }) => {
          // SAFETY: MSW parses JSON request payload as a generic record.
          parsedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(
            {
              id: "inv_min_1",
              invoice_url: "https://checkout.xendit.co/web/inv_min_1",
            },
            { status: 201 }
          );
        })
      );

      const session = await client.createSession(input);

      expect(session).toStrictEqual({
        redirectUrl: "https://checkout.xendit.co/web/inv_min_1",
        token: "inv_min_1",
      });

      expect(parsedBody).toStrictEqual({
        amount: 100_000,
        currency: "IDR",
        description: "Order #ORDER-MINIMAL",
        external_id: "ORDER-MINIMAL",
      });
    });

    it("throws descriptive error when Xendit returns HTTP failure on createSession", async () => {
      const client = new XenditClient({
        secretKey: mockSecretKey,
      });

      server.use(
        http.post("https://api.xendit.co/v2/invoices", () =>
          HttpResponse.json(
            {
              error_code: "DUPLICATE_EXTERNAL_ID",
              message: "An invoice with this external_id already exists",
            },
            {
              status: 400,
              statusText: "Bad Request",
            }
          )
        )
      );

      await expect(
        client.createSession({
          grossAmount: 100_000,
          orderId: "DUPLICATE-ORDER",
        })
      ).rejects.toThrow("Xendit API error (400)");
    });

    it("throws descriptive error when Xendit returns invalid session schema", async () => {
      const client = new XenditClient({
        secretKey: mockSecretKey,
      });

      server.use(
        http.post("https://api.xendit.co/v2/invoices", () =>
          HttpResponse.json({ id: "inv_missing_url" }, { status: 200 })
        )
      );

      await expect(
        client.createSession({
          grossAmount: 100_000,
          orderId: "ORDER-BAD-SCHEMA",
        })
      ).rejects.toThrow("Failed to validate Xendit invoice response");
    });
  });

  describe("getTransactionStatus", () => {
    const mockInvoiceResponse = {
      amount: 150_000,
      created: "2026-09-30T10:00:00.000Z",
      currency: "IDR",
      description: "Order #ORDER-1001",
      expiry_date: "2026-10-01T10:00:00.000Z",
      external_id: "ORDER-1001",
      id: "inv_12345",
      invoice_url: "https://checkout.xendit.co/web/inv_12345",
      merchant_name: "Omset Digital Store",
      paid_amount: 150_000,
      paid_at: "2026-09-30T11:30:00.000Z",
      payer_email: "customer@example.com",
      payment_channel: "BCA",
      payment_destination: "12345678",
      payment_method: "BANK_TRANSFER",
      status: "PAID",
      updated: "2026-09-30T11:30:00.000Z",
      user_id: "user_67890",
    };

    it("queries invoice by ID with Basic Auth and normalizes to ParsedPaymentStatus for PAID", async () => {
      const client = new XenditClient({
        secretKey: mockSecretKey,
      });

      let capturedUrl = "";
      let capturedAuthHeader: string | null = null;
      let capturedMethod: string | null = null;

      server.use(
        http.get(
          "https://api.xendit.co/v2/invoices/:invoiceId",
          ({ request }) => {
            capturedUrl = request.url;
            capturedMethod = request.method;
            capturedAuthHeader = request.headers.get("authorization");
            return HttpResponse.json(mockInvoiceResponse, { status: 200 });
          }
        )
      );

      const status = await client.getTransactionStatus("inv_12345");

      expect(status).toStrictEqual({
        grossAmount: 150_000,
        orderId: "ORDER-1001",
        paymentStatus: "paid",
        paymentType: "BANK_TRANSFER",
        settlementTime: "2026-09-30T11:30:00.000Z",
        transactionId: "inv_12345",
        metadata: {
          amount: 150_000,
          created: "2026-09-30T10:00:00.000Z",
          currency: "IDR",
          description: "Order #ORDER-1001",
          event: undefined,
          expiryDate: "2026-10-01T10:00:00.000Z",
          externalId: "ORDER-1001",
          id: "inv_12345",
          invoiceUrl: "https://checkout.xendit.co/web/inv_12345",
          isHigh: undefined,
          merchantName: "Omset Digital Store",
          paidAmount: 150_000,
          paidAt: "2026-09-30T11:30:00.000Z",
          payerEmail: "customer@example.com",
          paymentChannel: "BCA",
          paymentDestination: "12345678",
          paymentId: undefined,
          paymentMethod: "BANK_TRANSFER",
          status: "PAID",
          updated: "2026-09-30T11:30:00.000Z",
          userId: "user_67890",
        },
      });

      expect(capturedUrl).toBe("https://api.xendit.co/v2/invoices/inv_12345");
      expect(capturedMethod).toBe("GET");
      const expectedBase64 = Buffer.from(`${mockSecretKey}:`).toString(
        "base64"
      );
      expect(capturedAuthHeader).toBe(`Basic ${expectedBase64}`);
    });

    it.each([
      ["SETTLED", "paid"],
      ["EXPIRED", "expired"],
      ["FAILED", "failed"],
      ["CANCELLED", "cancelled"],
      ["PENDING", "pending"],
    ] as const)(
      "maps status %s to canonical PaymentStatus %s",
      async (vendorStatus, canonicalStatus) => {
        const client = new XenditClient({
          secretKey: mockSecretKey,
        });

        server.use(
          http.get("https://api.xendit.co/v2/invoices/:invoiceId", () =>
            HttpResponse.json(
              {
                ...mockInvoiceResponse,
                status: vendorStatus,
              },
              { status: 200 }
            )
          )
        );

        const result = await client.getTransactionStatus("inv_12345");
        expect(result.paymentStatus).toBe(canonicalStatus);
      }
    );

    it("falls back to querying by external_id when path lookup returns 404", async () => {
      const client = new XenditClient({
        secretKey: mockSecretKey,
      });

      const capturedUrls: string[] = [];
      server.use(
        http.get(
          "https://api.xendit.co/v2/invoices/:invoiceId",
          ({ request }) => {
            capturedUrls.push(request.url);
            return HttpResponse.json(
              { error_code: "INVOICE_NOT_FOUND" },
              { status: 404 }
            );
          }
        ),
        http.get("https://api.xendit.co/v2/invoices", ({ request }) => {
          capturedUrls.push(request.url);
          return HttpResponse.json([mockInvoiceResponse], { status: 200 });
        })
      );

      const result = await client.getTransactionStatus("ORDER-1001");
      expect(result.orderId).toBe("ORDER-1001");
      expect(result.transactionId).toBe("inv_12345");
      expect(capturedUrls).toStrictEqual([
        "https://api.xendit.co/v2/invoices/ORDER-1001",
        "https://api.xendit.co/v2/invoices?external_id=ORDER-1001",
      ]);
    });

    it("throws descriptive error when both path and query fail", async () => {
      const client = new XenditClient({
        secretKey: mockSecretKey,
      });

      server.use(
        http.get("https://api.xendit.co/v2/invoices/:invoiceId", () =>
          HttpResponse.json(
            {
              error_code: "INVOICE_NOT_FOUND",
              message: "Invoice not found",
            },
            { status: 404 }
          )
        ),
        http.get("https://api.xendit.co/v2/invoices", () =>
          HttpResponse.json(
            {
              error_code: "INVOICE_NOT_FOUND",
              message: "Invoice not found",
            },
            { status: 404 }
          )
        )
      );

      await expect(client.getTransactionStatus("NONEXISTENT")).rejects.toThrow(
        "Xendit API error (404)"
      );
    });

    it("throws descriptive error when status response fails schema validation", async () => {
      const client = new XenditClient({
        secretKey: mockSecretKey,
      });

      server.use(
        http.get("https://api.xendit.co/v2/invoices/:invoiceId", () =>
          HttpResponse.json({ id: "inv_12345" }, { status: 200 })
        )
      );

      await expect(client.getTransactionStatus("inv_12345")).rejects.toThrow(
        "Failed to validate Xendit status response"
      );
    });
  });

  describe("parseWebhook", () => {
    const webhookToken = "xnd_webhook_verification_token_secret";
    const webhookSecret = "xnd_webhook_hmac_secret_key_12345";
    const sampleInvoicePayload = {
      amount: 250_000,
      created: "2026-09-30T10:00:00.000Z",
      currency: "IDR",
      description: "Payment for Order #ORDER-2001",
      external_id: "ORDER-2001",
      id: "inv_651234567890abcdef",
      is_high: false,
      merchant_name: "Omset Digital Store",
      paid_amount: 250_000,
      paid_at: "2026-09-30T10:05:00.000Z",
      payer_email: "buyer@example.com",
      payment_channel: "BCA",
      payment_destination: "12345678",
      payment_id: "pay_12345",
      payment_method: "BANK_TRANSFER",
      status: "PAID",
      updated: "2026-09-30T10:05:00.000Z",
      user_id: "user_67890",
    };
    const rawInvoiceBody = JSON.stringify(sampleInvoicePayload);

    describe("legacy callback token verification (x-callback-token)", () => {
      it("parses and normalizes valid webhook with configured webhookToken", async () => {
        const client = new XenditClient({
          secretKey: mockSecretKey,
          webhookToken,
        });

        const result = await client.parseWebhook({
          rawBody: rawInvoiceBody,
          headers: {
            "x-callback-token": webhookToken,
          },
        });

        expect(result).toStrictEqual({
          orderId: "ORDER-2001",
          paymentStatus: "paid",
          providerEventId: "inv_651234567890abcdef",
          metadata: {
            amount: 250_000,
            created: "2026-09-30T10:00:00.000Z",
            currency: "IDR",
            description: "Payment for Order #ORDER-2001",
            event: undefined,
            expiryDate: undefined,
            externalId: "ORDER-2001",
            id: "inv_651234567890abcdef",
            invoiceUrl: undefined,
            isHigh: false,
            merchantName: "Omset Digital Store",
            paidAmount: 250_000,
            paidAt: "2026-09-30T10:05:00.000Z",
            payerEmail: "buyer@example.com",
            paymentChannel: "BCA",
            paymentDestination: "12345678",
            paymentId: "pay_12345",
            paymentMethod: "BANK_TRANSFER",
            status: "PAID",
            updated: "2026-09-30T10:05:00.000Z",
            userId: "user_67890",
          },
        });
      });

      it("supports Web standard Headers instance with case-insensitive header name", async () => {
        const client = new XenditClient({
          secretKey: mockSecretKey,
          webhookToken,
        });

        const headers = new Headers();
        headers.set("X-Callback-Token", webhookToken);

        const result = await client.parseWebhook({
          headers,
          rawBody: rawInvoiceBody,
        });

        expect(result.orderId).toBe("ORDER-2001");
        expect(result.paymentStatus).toBe("paid");
      });

      it("allows overriding verification token via input.secret", async () => {
        const client = new XenditClient({
          secretKey: mockSecretKey,
        });
        const customSecret = "custom-token-secret-999";

        const result = await client.parseWebhook({
          rawBody: rawInvoiceBody,
          secret: customSecret,
          headers: {
            "x-callback-token": customSecret,
          },
        });

        expect(result.orderId).toBe("ORDER-2001");
      });

      it("rejects mismatched callback token with 401 PaymentWebhookError", async () => {
        const client = new XenditClient({
          secretKey: mockSecretKey,
          webhookToken,
        });

        await expect(
          client.parseWebhook({
            rawBody: rawInvoiceBody,
            headers: {
              "x-callback-token": "wrong-token-value",
            },
          })
        ).rejects.toThrow(PaymentWebhookError);

        await expect(
          client.parseWebhook({
            rawBody: rawInvoiceBody,
            headers: {
              "x-callback-token": "wrong-token-value",
            },
          })
        ).rejects.toThrow("Invalid webhook token");
      });

      it("rejects with 401 when token header is present but no webhook token configured", async () => {
        const client = new XenditClient({
          secretKey: mockSecretKey,
        });

        await expect(
          client.parseWebhook({
            rawBody: rawInvoiceBody,
            headers: {
              "x-callback-token": "any-token",
            },
          })
        ).rejects.toThrow("Missing webhook token for verification");
      });
    });

    describe("modern HMAC signature verification (x-callback-signature)", () => {
      it("parses and normalizes valid webhook with HMAC signature", async () => {
        const client = new XenditClient({
          secretKey: webhookSecret,
        });

        const signature = generateXenditHmacSignature(
          rawInvoiceBody,
          webhookSecret
        );

        const result = await client.parseWebhook({
          rawBody: rawInvoiceBody,
          headers: {
            "x-callback-signature": signature,
          },
        });

        expect(result.orderId).toBe("ORDER-2001");
        expect(result.paymentStatus).toBe("paid");
      });

      it("allows overriding HMAC secret via input.secret", async () => {
        const client = new XenditClient({
          secretKey: "default-secret",
        });
        const overrideSecret = "override-hmac-secret-123";
        const signature = generateXenditHmacSignature(
          rawInvoiceBody,
          overrideSecret
        );

        const result = await client.parseWebhook({
          rawBody: rawInvoiceBody,
          secret: overrideSecret,
          headers: {
            "x-callback-signature": signature,
          },
        });

        expect(result.orderId).toBe("ORDER-2001");
      });

      it("rejects invalid HMAC signature with 401 PaymentWebhookError", async () => {
        const client = new XenditClient({
          secretKey: webhookSecret,
        });

        await expect(
          client.parseWebhook({
            rawBody: rawInvoiceBody,
            headers: {
              "x-callback-signature":
                "bad086eeaf732ed4350435dda6bc6b36648c25db23c689503c46aae2468baa4b",
            },
          })
        ).rejects.toThrow("Invalid webhook signature");
      });

      it("rejects when signature header is present but secret is empty", async () => {
        const client = new XenditClient({
          secretKey: "",
        });

        await expect(
          client.parseWebhook({
            rawBody: rawInvoiceBody,
            headers: {
              "x-callback-signature": "some-signature",
            },
          })
        ).rejects.toThrow("Missing secret for webhook signature verification");
      });
    });

    describe("missing authentication headers", () => {
      it("rejects with 401 when headers are completely missing", async () => {
        const client = new XenditClient({
          secretKey: mockSecretKey,
          webhookToken,
        });

        await expect(
          client.parseWebhook({
            rawBody: rawInvoiceBody,
          })
        ).rejects.toThrow("Missing Xendit webhook verification headers");
      });

      it("rejects with 401 when neither token nor signature header is provided", async () => {
        const client = new XenditClient({
          secretKey: mockSecretKey,
          webhookToken,
        });

        await expect(
          client.parseWebhook({
            rawBody: rawInvoiceBody,
            headers: {
              "content-type": "application/json",
            },
          })
        ).rejects.toThrow("Missing Xendit webhook verification headers");
      });
    });

    describe("payload validation and error handling", () => {
      it("rejects invalid JSON with 400 PaymentWebhookError", async () => {
        const client = new XenditClient({
          secretKey: mockSecretKey,
          webhookToken,
        });

        await expect(
          client.parseWebhook({
            headers: { "x-callback-token": webhookToken },
            rawBody: "not-json-content{{{",
          })
        ).rejects.toThrow("Malformed webhook payload: Invalid JSON");
      });

      it("rejects schema mismatch with 400 PaymentWebhookError", async () => {
        const client = new XenditClient({
          secretKey: mockSecretKey,
          webhookToken,
        });

        await expect(
          client.parseWebhook({
            headers: { "x-callback-token": webhookToken },
            rawBody: JSON.stringify({
              amount: "not-a-number",
              external_id: "ORDER-1",
            }),
          })
        ).rejects.toThrow("Malformed webhook payload:");
      });

      it("rejects payload missing order identifier with 400 PaymentWebhookError", async () => {
        const client = new XenditClient({
          secretKey: mockSecretKey,
          webhookToken,
        });

        await expect(
          client.parseWebhook({
            headers: { "x-callback-token": webhookToken },
            rawBody: JSON.stringify({
              amount: 100_000,
              id: "inv_123",
              status: "PAID",
              // missing external_id and data.reference_id
            }),
          })
        ).rejects.toThrow(
          "Missing required order identifier in webhook payload"
        );
      });
    });

    describe("status mapping and payload normalization", () => {
      it.each([
        ["PAID", "paid"],
        ["SETTLED", "paid"],
        ["EXPIRED", "expired"],
        ["FAILED", "failed"],
        ["CANCELLED", "cancelled"],
        ["CANCELED", "cancelled"],
        ["PENDING", "pending"],
        ["UNKNOWN_STATUS", "pending"],
      ] as const)(
        "maps webhook status %s to canonical PaymentStatus %s",
        async (statusValue, expectedCanonical) => {
          const client = new XenditClient({
            secretKey: mockSecretKey,
            webhookToken,
          });

          const body = JSON.stringify({
            ...sampleInvoicePayload,
            status: statusValue,
          });

          const result = await client.parseWebhook({
            headers: { "x-callback-token": webhookToken },
            rawBody: body,
          });

          expect(result.paymentStatus).toBe(expectedCanonical);
        }
      );

      it("normalizes modern payment request payload with data wrapper", async () => {
        const client = new XenditClient({
          secretKey: mockSecretKey,
          webhookToken,
        });

        const modernPayload = {
          created: "2026-09-30T12:00:00.000Z",
          event: "payment.succeeded",
          data: {
            amount: 300_000,
            currency: "IDR",
            id: "pr_9999",
            reference_id: "ORDER-MODERN-77",
            status: "SUCCEEDED",
          },
        };

        const result = await client.parseWebhook({
          headers: { "x-callback-token": webhookToken },
          rawBody: JSON.stringify(modernPayload),
        });

        expect(result).toStrictEqual({
          orderId: "ORDER-MODERN-77",
          paymentStatus: "paid",
          providerEventId: "pr_9999",
          metadata: {
            amount: 300_000,
            created: "2026-09-30T12:00:00.000Z",
            currency: "IDR",
            description: undefined,
            event: "payment.succeeded",
            expiryDate: undefined,
            externalId: "ORDER-MODERN-77",
            id: "pr_9999",
            invoiceUrl: undefined,
            isHigh: undefined,
            merchantName: undefined,
            paidAmount: undefined,
            paidAt: undefined,
            payerEmail: undefined,
            paymentChannel: undefined,
            paymentDestination: undefined,
            paymentId: undefined,
            paymentMethod: undefined,
            status: "SUCCEEDED",
            updated: undefined,
            userId: undefined,
          },
        });
      });
    });
  });

  describe("verifyWebhookToken (legacy x-callback-token)", () => {
    const configuredToken = "xnd_webhook_verification_token_secret";

    it("verifies valid callback token using timing-safe comparison", () => {
      expect(
        verifyXenditCallbackToken(configuredToken, configuredToken)
      ).toBeTruthy();
    });

    it("rejects mismatched callback token", () => {
      expect(
        verifyXenditCallbackToken("wrong-token", configuredToken)
      ).toBeFalsy();
    });

    it("rejects empty token", () => {
      expect(verifyXenditCallbackToken("", configuredToken)).toBeFalsy();
      expect(verifyXenditCallbackToken(configuredToken, "")).toBeFalsy();
    });
  });

  describe("verifyHmacSignature (modern x-callback-signature)", () => {
    const secret = "xnd_webhook_secret_key_abcdef";
    const rawBody = JSON.stringify({
      amount: 250_000,
      external_id: "ORDER-2001",
      id: "inv_12345",
      status: "PAID",
    });

    it("verifies valid HMAC-SHA256 signature against raw body text", () => {
      const validSignature = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

      expect(
        verifyXenditHmacSignature(rawBody, validSignature, secret)
      ).toBeTruthy();
    });

    it("rejects tampered body text", () => {
      const validSignature = generateXenditHmacSignature(rawBody, secret);
      const tamperedBody = JSON.stringify({
        amount: 10_000,
        external_id: "ORDER-2001",
        id: "inv_12345",
        status: "PAID",
      });

      expect(
        verifyXenditHmacSignature(tamperedBody, validSignature, secret)
      ).toBeFalsy();
    });

    it("rejects tampered signature", () => {
      const tamperedSignature =
        "0000000000000000000000000000000000000000000000000000000000000000";

      expect(
        verifyXenditHmacSignature(rawBody, tamperedSignature, secret)
      ).toBeFalsy();
    });

    it("returns false if any required input is empty", () => {
      expect(verifyXenditHmacSignature("", "sig", secret)).toBeFalsy();
      expect(verifyXenditHmacSignature(rawBody, "", secret)).toBeFalsy();
      expect(verifyXenditHmacSignature(rawBody, "sig", "")).toBeFalsy();
    });
  });
});
