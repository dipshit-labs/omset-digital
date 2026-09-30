import { describe, expect, it } from "vitest";

import { timingSafeEqualString } from "./timingSafeEqual";

describe(timingSafeEqualString, () => {
  it("returns true for identical strings", () => {
    expect(
      timingSafeEqualString("secret-token-12345", "secret-token-12345")
    ).toBeTruthy();
  });

  it("returns true for identical empty strings", () => {
    expect(timingSafeEqualString("", "")).toBeTruthy();
  });

  it("returns false for equal-length strings with differing content", () => {
    expect(
      timingSafeEqualString("secret-token-12345", "secret-token-54321")
    ).toBeFalsy();
  });

  it("returns false for strings of differing lengths without throwing", () => {
    expect(timingSafeEqualString("short", "much-longer-string")).toBeFalsy();
    expect(timingSafeEqualString("", "not-empty")).toBeFalsy();
    expect(timingSafeEqualString("not-empty", "")).toBeFalsy();
  });

  it("handles multi-byte unicode characters with matching and mismatched byte lengths", () => {
    expect(timingSafeEqualString("kopi-☕", "kopi-☕")).toBeTruthy();
    // "☕" is 3 bytes (0xE2 0x98 0x95), while "abc" is 3 bytes, but characters differ
    expect(timingSafeEqualString("kopi-☕", "kopi-abc")).toBeFalsy();
    // Different byte lengths due to multi-byte encoding
    expect(timingSafeEqualString("kopi-☕", "kopi-a")).toBeFalsy();
  });
});
