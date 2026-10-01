import { Buffer } from "node:buffer";
import crypto from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { XenditClient } from "./client";
import {
  generateXenditHmacSignature,
  verifyXenditCallbackToken,
  verifyXenditHmacSignature,
} from "./signature";
import type { CreateXenditInvoiceInput } from "./types";

describe(XenditClient, () => {
  const mockSecretKey = "xnd_development_secret_key_12345";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createInvoice", () => {
    it("creates an invoice session with correct Basic Auth header and payload", async () => {
      const client = new XenditClient({
        secretKey: mockSecretKey,
      });

      const input: CreateXenditInvoiceInput = {
        amount: 250_000,
        currency: "IDR",
        description: "Payment for Order #ORDER-2001",
        externalId: "ORDER-2001",
        failureRedirectUrl: "https://toko.example.com/checkout/failure",
        invoiceDuration: 86_400,
        payerEmail: "buyer@example.com",
        successRedirectUrl: "https://toko.example.com/checkout/success",
        customer: {
          email: "buyer@example.com",
          givenNames: "Siti",
          mobileNumber: "+6281234567890",
          surname: "Rahma",
        },
        items: [
          {
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
      let capturedOptions: RequestInit | undefined;

      vi.spyOn(globalThis, "fetch").mockImplementation(
        (url: string | URL | Request, init?: RequestInit) => {
          capturedUrl = String(url);
          capturedOptions = init;
          return Promise.resolve(
            Response.json(
              {
                amount: 250_000,
                created: "2026-10-01T10:00:00.000Z",
                currency: "IDR",
                description: input.description,
                expiry_date: "2026-10-02T10:00:00.000Z",
                external_id: input.externalId,
                id: expectedInvoiceId,
                invoice_url: expectedInvoiceUrl,
                merchant_name: "Toko Batik",
                payer_email: input.payerEmail,
                status: "PENDING",
                updated: "2026-10-01T10:00:00.000Z",
                user_id: "user_6500000000000000",
              },
              { status: 200 }
            )
          );
        }
      );

      const response = await client.createInvoice(input);

      expect(response).toMatchObject({
        external_id: "ORDER-2001",
        id: expectedInvoiceId,
        invoice_url: expectedInvoiceUrl,
        status: "PENDING",
      });
      expect(capturedUrl).toBe("https://api.xendit.co/v2/invoices");

      const expectedBasicAuth = `Basic ${Buffer.from(`${mockSecretKey}:`).toString("base64")}`;
      expect(capturedOptions?.headers).toMatchObject({
        Accept: "application/json",
        Authorization: expectedBasicAuth,
        "Content-Type": "application/json",
      });

      const body = JSON.parse(String(capturedOptions?.body));
      expect(body).toStrictEqual({
        amount: 250_000,
        currency: "IDR",
        description: "Payment for Order #ORDER-2001",
        external_id: "ORDER-2001",
        failure_redirect_url: "https://toko.example.com/checkout/failure",
        invoice_duration: 86_400,
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

    it("throws descriptive error when Xendit returns HTTP failure on createInvoice", async () => {
      const client = new XenditClient({
        secretKey: mockSecretKey,
      });

      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        Response.json(
          {
            error_code: "DUPLICATE_EXTERNAL_ID",
            message: "An invoice with this external_id already exists",
          },
          { status: 400 }
        )
      );

      await expect(
        client.createInvoice({
          amount: 100_000,
          description: "Test",
          externalId: "DUPLICATE-ORDER",
          payerEmail: "test@example.com",
        })
      ).rejects.toThrow("Xendit API error (400)");
    });
  });

  describe("getInvoice", () => {
    it("queries invoice details by ID with Basic Auth", async () => {
      const client = new XenditClient({
        secretKey: mockSecretKey,
      });

      let capturedUrl = "";
      let capturedOptions: RequestInit | undefined;

      const mockInvoice = {
        amount: 250_000,
        created: "2026-10-01T10:00:00.000Z",
        currency: "IDR",
        description: "Payment for Order #ORDER-2001",
        expiry_date: "2026-10-02T10:00:00.000Z",
        external_id: "ORDER-2001",
        id: "inv_12345",
        invoice_url: "https://checkout.xendit.co/web/inv_12345",
        merchant_name: "Toko Batik",
        payer_email: "buyer@example.com",
        payment_channel: "BCA",
        payment_method: "BANK_TRANSFER",
        status: "PAID",
        updated: "2026-10-01T10:15:00.000Z",
        user_id: "user_6500000000000000",
      };

      vi.spyOn(globalThis, "fetch").mockImplementation(
        (url: string | URL | Request, init?: RequestInit) => {
          capturedUrl = String(url);
          capturedOptions = init;
          return Promise.resolve(Response.json(mockInvoice, { status: 200 }));
        }
      );

      const response = await client.getInvoice("inv_12345");

      expect(response).toStrictEqual(mockInvoice);
      expect(capturedUrl).toBe("https://api.xendit.co/v2/invoices/inv_12345");

      const expectedBasicAuth = `Basic ${Buffer.from(`${mockSecretKey}:`).toString("base64")}`;
      const headers = capturedOptions?.headers as Record<string, string>;
      expect(headers["Authorization"]).toBe(expectedBasicAuth);
      expect(headers["Accept"]).toBe("application/json");
    });

    it("throws descriptive error when getInvoice returns 404", async () => {
      const client = new XenditClient({
        secretKey: mockSecretKey,
      });

      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        Response.json(
          {
            error_code: "INVOICE_NOT_FOUND_ERROR",
            message: "Invoice not found",
          },
          { status: 404 }
        )
      );

      await expect(client.getInvoice("inv_not_exist")).rejects.toThrow(
        "Xendit API error (404)"
      );
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
