import crypto from "node:crypto";

import { timingSafeEqualString } from "../../utils/timingSafeEqual";

/**
 * Computes an HMAC-SHA256 hex digest for an incoming Xendit webhook raw body text.
 */
export const generateXenditHmacSignature = (
  rawBody: string,
  secret: string
): string => crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

/**
 * Verifies an incoming Xendit legacy callback token (x-callback-token header)
 * against the configured merchant webhook token using timing-safe comparison.
 */
export const verifyXenditCallbackToken = (
  tokenHeader: string,
  configuredToken: string
): boolean => {
  if (!tokenHeader || !configuredToken) {
    return false;
  }

  return timingSafeEqualString(tokenHeader, configuredToken);
};

/**
 * Verifies an incoming Xendit modern webhook signature (x-callback-signature header)
 * by computing the HMAC-SHA256 digest of the raw body text and performing timing-safe comparison.
 */
export const verifyXenditHmacSignature = (
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean => {
  if (!rawBody || !signatureHeader || !secret) {
    return false;
  }

  const expectedSignature = generateXenditHmacSignature(rawBody, secret);

  return timingSafeEqualString(
    signatureHeader.toLowerCase(),
    expectedSignature.toLowerCase()
  );
};
