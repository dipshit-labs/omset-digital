import { Buffer } from "node:buffer";
import crypto from "node:crypto";

/**
 * Performs a constant-time comparison of two strings to prevent timing side-channel attacks.
 *
 * Buffer lengths are checked first to prevent Node's crypto.timingSafeEqual from throwing
 * a RangeError on length mismatch.
 */
export const timingSafeEqualString = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
};
