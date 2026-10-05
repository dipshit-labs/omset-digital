import { describe, expect, it } from "vitest";

import {
  generateXenditHmacSignature,
  verifyXenditCallbackToken,
  verifyXenditHmacSignature,
} from "./signature";

describe("xendit signature and token verification", () => {
  describe(generateXenditHmacSignature, () => {
    it("computes correct HMAC-SHA256 hex digest", () => {
      const rawBody = JSON.stringify({ id: "xnd_123", status: "PAID" });
      const secret = "webhook-verification-secret-xyz";
      // Independently verified HMAC-SHA256 digest
      const expected =
        "2716957ea3d9aa6276ba9faf1940412fab95abe5bb259ef336e817b71d775099";

      expect(generateXenditHmacSignature(rawBody, secret)).toBe(expected);
    });
  });

  describe(verifyXenditCallbackToken, () => {
    const validToken = "xendit_callback_token_secret_123456789";

    it("returns true for matching callback token", () => {
      expect(verifyXenditCallbackToken(validToken, validToken)).toBeTruthy();
    });

    it("returns false for equal-length differing callback token", () => {
      const alteredToken = `a${validToken.slice(1)}`;
      expect(verifyXenditCallbackToken(alteredToken, validToken)).toBeFalsy();
    });

    it("returns false for differing-length callback token without throwing", () => {
      expect(verifyXenditCallbackToken("short", validToken)).toBeFalsy();
      expect(
        verifyXenditCallbackToken(validToken.repeat(2), validToken)
      ).toBeFalsy();
    });

    it("returns false when tokenHeader or configuredToken is empty string", () => {
      expect(verifyXenditCallbackToken("", validToken)).toBeFalsy();
      expect(verifyXenditCallbackToken(validToken, "")).toBeFalsy();
      expect(verifyXenditCallbackToken("", "")).toBeFalsy();
    });

    it("returns false when tokenHeader or configuredToken is undefined", () => {
      // @ts-expect-error testing undefined input robustness
      expect(verifyXenditCallbackToken(undefined, validToken)).toBeFalsy();
      // @ts-expect-error testing undefined input robustness
      expect(verifyXenditCallbackToken(validToken)).toBeFalsy();
      // @ts-expect-error testing undefined input robustness
      expect(verifyXenditCallbackToken()).toBeFalsy();
    });
  });

  describe(verifyXenditHmacSignature, () => {
    const rawBody = JSON.stringify({ id: "inv_123", event: "invoice.paid" });
    const secret = "webhook-hmac-secret-98765";
    // Independently verified HMAC-SHA256 digest
    const expectedDigest =
      "4db086eeaf732ed4350435dda6bc6b36648c25db23c689503c46aae2468baa4b";

    it("returns true for matching HMAC signature regardless of case", () => {
      expect(
        verifyXenditHmacSignature(rawBody, expectedDigest.toUpperCase(), secret)
      ).toBeTruthy();
      expect(
        verifyXenditHmacSignature(rawBody, expectedDigest.toLowerCase(), secret)
      ).toBeTruthy();
    });

    it("returns false for equal-length differing HMAC signature", () => {
      const alteredDigest = `f${expectedDigest.slice(1)}`;
      expect(
        verifyXenditHmacSignature(rawBody, alteredDigest, secret)
      ).toBeFalsy();
    });

    it("returns false for differing-length HMAC signature without throwing", () => {
      expect(
        verifyXenditHmacSignature(rawBody, "short-sig", secret)
      ).toBeFalsy();
      expect(
        verifyXenditHmacSignature(rawBody, expectedDigest.repeat(2), secret)
      ).toBeFalsy();
    });

    it("returns false when rawBody, signatureHeader, or secret is empty string", () => {
      expect(verifyXenditHmacSignature("", expectedDigest, secret)).toBeFalsy();
      expect(verifyXenditHmacSignature(rawBody, "", secret)).toBeFalsy();
      expect(
        verifyXenditHmacSignature(rawBody, expectedDigest, "")
      ).toBeFalsy();
    });

    it("returns false when rawBody, signatureHeader, or secret is undefined", () => {
      expect(
        // @ts-expect-error testing undefined input robustness
        verifyXenditHmacSignature(undefined, expectedDigest, secret)
      ).toBeFalsy();
      expect(
        // @ts-expect-error testing undefined input robustness
        verifyXenditHmacSignature(rawBody, undefined, secret)
      ).toBeFalsy();
      expect(
        // @ts-expect-error testing undefined input robustness
        verifyXenditHmacSignature(rawBody, expectedDigest)
      ).toBeFalsy();
    });
  });
});
