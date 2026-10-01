import { describe, expect, it } from "vitest";

import {
  generateMidtransSignature,
  verifyMidtransSignature,
} from "./signature";
import type { MidtransSignatureInput } from "./types";

describe("midtrans signature verification", () => {
  const serverKey = "SB-Mid-server-TESTKEY12345";
  const baseInput = {
    gross_amount: "150000.00",
    order_id: "ORD-98765",
    status_code: "200",
  };

  // Independently verified SHA-512 digest of "ORD-98765200150000.00SB-Mid-server-TESTKEY12345"
  const expectedDigest =
    "de51abb980a0388c8e6e1ef0458b2cf4b924d0ab4adab1b1380653e809435746facde45bea882f8194c70758ef66fb878865ff87d8aaf1e65079ed2f7dffc538";

  it("generates correct SHA-512 hex signature matching formula", () => {
    const signature = generateMidtransSignature(baseInput, serverKey);
    expect(signature).toBe(expectedDigest);
  });

  it("returns true for matching signature regardless of case", () => {
    const input: MidtransSignatureInput = {
      ...baseInput,
      signature_key: expectedDigest.toUpperCase(),
    };

    expect(verifyMidtransSignature(input, serverKey)).toBeTruthy();
  });

  it("returns false for equal-length differing signature", () => {
    const alteredDigest = `a${expectedDigest.slice(1)}`;
    const input: MidtransSignatureInput = {
      ...baseInput,
      signature_key: alteredDigest,
    };

    expect(verifyMidtransSignature(input, serverKey)).toBeFalsy();
  });

  it("returns false for differing-length signature without throwing", () => {
    const shortInput: MidtransSignatureInput = {
      ...baseInput,
      signature_key: "short-signature",
    };
    const longInput: MidtransSignatureInput = {
      ...baseInput,
      signature_key: expectedDigest.repeat(2),
    };

    expect(verifyMidtransSignature(shortInput, serverKey)).toBeFalsy();
    expect(verifyMidtransSignature(longInput, serverKey)).toBeFalsy();
  });

  it("returns false gracefully when any required input field is missing or empty", () => {
    expect(
      verifyMidtransSignature({ ...baseInput, signature_key: "" }, serverKey)
    ).toBeFalsy();

    expect(
      verifyMidtransSignature(
        { ...baseInput, order_id: "", signature_key: expectedDigest },
        serverKey
      )
    ).toBeFalsy();

    expect(
      verifyMidtransSignature(
        { ...baseInput, signature_key: expectedDigest, status_code: "" },
        serverKey
      )
    ).toBeFalsy();

    expect(
      verifyMidtransSignature(
        { ...baseInput, gross_amount: "", signature_key: expectedDigest },
        serverKey
      )
    ).toBeFalsy();
  });

  it("returns false gracefully when serverKey is empty or undefined", () => {
    expect(
      verifyMidtransSignature(
        { ...baseInput, signature_key: expectedDigest },
        ""
      )
    ).toBeFalsy();
    expect(
      // @ts-expect-error testing missing serverKey argument
      verifyMidtransSignature({ ...baseInput, signature_key: expectedDigest })
    ).toBeFalsy();
    expect(
      verifyMidtransSignature(
        { ...baseInput, signature_key: expectedDigest },
        // @ts-expect-error testing null serverKey robustness
        null
      )
    ).toBeFalsy();
  });

  it("returns false gracefully when input is empty or undefined", () => {
    // @ts-expect-error testing empty object robustness
    expect(verifyMidtransSignature({}, serverKey)).toBeFalsy();
    // @ts-expect-error testing undefined input robustness
    expect(verifyMidtransSignature(undefined, serverKey)).toBeFalsy();
    // @ts-expect-error testing null input robustness
    expect(verifyMidtransSignature(null, serverKey)).toBeFalsy();
  });
});
