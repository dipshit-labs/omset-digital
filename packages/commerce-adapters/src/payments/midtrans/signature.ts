import crypto from "node:crypto";

import { timingSafeEqualString } from "../../utils/timingSafeEqual";
import type { MidtransSignatureInput } from "./types";

/**
 * Computes the official Midtrans SHA-512 signature digest.
 * Formula: SHA512(order_id + status_code + gross_amount + serverKey)
 *
 * NOTE: gross_amount MUST be the exact decimal string from Midtrans (e.g. "150000.00")
 * without number conversion or stripping trailing zeroes.
 */
export const generateMidtransSignature = (
  input: Omit<MidtransSignatureInput, "signature_key">,
  serverKey: string
): string => {
  const hash = crypto.createHash("sha512");
  hash.update(
    `${input.order_id}${input.status_code}${input.gross_amount}${serverKey}`
  );
  return hash.digest("hex");
};

/**
 * Verifies the incoming Midtrans signature_key against the computed SHA-512 digest
 * using timing-safe comparison to prevent timing attacks.
 */
export const verifyMidtransSignature = (
  input: MidtransSignatureInput,
  serverKey: string
): boolean => {
  if (
    !input.order_id ||
    !input.status_code ||
    !input.gross_amount ||
    !input.signature_key ||
    !serverKey
  ) {
    return false;
  }

  const expectedSignature = generateMidtransSignature(input, serverKey);

  return timingSafeEqualString(
    input.signature_key.toLowerCase(),
    expectedSignature.toLowerCase()
  );
};
