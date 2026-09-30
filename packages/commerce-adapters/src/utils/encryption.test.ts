import { describe, expect, it } from "vitest";

import {
  decryptCredential,
  encryptCredential,
  isCiphertext,
} from "./encryption";

const TEST_SECRET = "omset-digital-test-master-secret-32b!";

describe(isCiphertext, () => {
  it("returns true for valid versioned ciphertext strings", () => {
    const validCiphertext =
      "v1:0123456789abcdef01234567:0123456789abcdef0123456789abcdef:deadbeef";
    expect(isCiphertext(validCiphertext)).toBeTruthy();
    const emptyPayloadCiphertext =
      "v1:0123456789abcdef01234567:0123456789abcdef0123456789abcdef:";
    expect(isCiphertext(emptyPayloadCiphertext)).toBeTruthy();
  });

  it("returns false for strings not following the versioned ciphertext format", () => {
    expect(isCiphertext("v2:abc:def:123")).toBeFalsy();
    expect(isCiphertext("SB-Mid-server-12345")).toBeFalsy();
    expect(isCiphertext("v1:")).toBeFalsy();
    expect(isCiphertext("v1:short-iv:short-tag:abc")).toBeFalsy();
    expect(isCiphertext("")).toBeFalsy();
  });

  it("returns false for null and undefined", () => {
    expect(isCiphertext(null)).toBeFalsy();
    expect(isCiphertext()).toBeFalsy();
  });

  it("returns false for non-string objects and primitives", () => {
    expect(isCiphertext(12_345)).toBeFalsy();
    expect(isCiphertext({})).toBeFalsy();
    expect(isCiphertext(["v1:test"])).toBeFalsy();
    expect(isCiphertext(true)).toBeFalsy();
  });
});

describe(encryptCredential, () => {
  it("encrypts plaintext into v1:<iv>:<tag>:<ciphertext> format", () => {
    const plaintext = "SB-Mid-server-secret-key-12345";
    const encrypted = encryptCredential(plaintext, TEST_SECRET);

    expect(isCiphertext(encrypted)).toBeTruthy();

    const parts = encrypted.split(":");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("v1");
  });

  it("generates 96-bit IV, 128-bit tag, and hex ciphertext", () => {
    const plaintext = "SB-Mid-server-secret-key-12345";
    const encrypted = encryptCredential(plaintext, TEST_SECRET);
    const [, ivHex, tagHex, cipherHex] = encrypted.split(":");

    // 12 bytes = 24 hex characters (96 bits)
    expect(ivHex).toMatch(/^[0-9a-f]{24}$/u);
    // 16 bytes = 32 hex characters (128 bits)
    expect(tagHex).toMatch(/^[0-9a-f]{32}$/u);
    // Non-empty hex ciphertext
    expect(cipherHex).toMatch(/^[0-9a-f]+$/u);
  });

  it("produces distinct ciphertexts for identical plaintext due to random IV", () => {
    const plaintext = "SB-Mid-server-secret-key-12345";
    const encrypted1 = encryptCredential(plaintext, TEST_SECRET);
    const encrypted2 = encryptCredential(plaintext, TEST_SECRET);

    expect(encrypted1).not.toBe(encrypted2);
    expect(encrypted1.split(":")[1]).not.toBe(encrypted2.split(":")[1]);
  });

  it("encrypts empty string plaintext into valid versioned ciphertext", () => {
    const encrypted = encryptCredential("", TEST_SECRET);
    expect(isCiphertext(encrypted)).toBeTruthy();
    expect(decryptCredential(encrypted, TEST_SECRET)).toBe("");
  });

  it("throws an error when secret is shorter than 32 characters", () => {
    expect(() => encryptCredential("secret-key", "too-short")).toThrow(
      /secret must be at least 32 characters/iu
    );
  });

  it("accepts options object with secret", () => {
    const encrypted = encryptCredential("test-key", { secret: TEST_SECRET });
    expect(isCiphertext(encrypted)).toBeTruthy();
  });
});

describe(decryptCredential, () => {
  it("successfully round-trips encrypted plaintext", () => {
    const plaintext = "SB-Mid-server-secret-key-12345";
    const encrypted = encryptCredential(plaintext, TEST_SECRET);
    const decrypted = decryptCredential(encrypted, TEST_SECRET);

    expect(decrypted).toBe(plaintext);
  });

  it("successfully round-trips unicode and multi-byte content", () => {
    const plaintext = "Toko Kopi Arabika Gayo ☕ - Rp 150.000";
    const encrypted = encryptCredential(plaintext, TEST_SECRET);
    const decrypted = decryptCredential(encrypted, TEST_SECRET);

    expect(decrypted).toBe(plaintext);
  });

  it("accepts options object with secret", () => {
    const plaintext = "webhook-callback-secret-token";
    const encrypted = encryptCredential(plaintext, { secret: TEST_SECRET });
    const decrypted = decryptCredential(encrypted, { secret: TEST_SECRET });

    expect(decrypted).toBe(plaintext);
  });

  it("throws when input does not start with v1: prefix", () => {
    expect(() =>
      decryptCredential("raw-unencrypted-legacy-key", TEST_SECRET)
    ).toThrow(/missing version prefix/iu);
    expect(() => decryptCredential("", TEST_SECRET)).toThrow(
      /missing version prefix/iu
    );
  });

  it("throws when serialized ciphertext format is malformed", () => {
    expect(() => decryptCredential("v1:only-two-parts", TEST_SECRET)).toThrow(
      /invalid ciphertext format/iu
    );
    expect(() =>
      decryptCredential("v1:part1:part2:part3:part4", TEST_SECRET)
    ).toThrow(/invalid ciphertext format/iu);
  });

  it("throws cryptographic authentication error when ciphertext is tampered with", () => {
    const plaintext = "SB-Mid-server-secret-key-12345";
    const encrypted = encryptCredential(plaintext, TEST_SECRET);
    const [version, iv, tag, ciphertext] = encrypted.split(":");

    // Flip the first character of the ciphertext hex
    const tamperedHexChar = ciphertext[0] === "a" ? "b" : "a";
    const tamperedCiphertext = `${tamperedHexChar}${ciphertext.slice(1)}`;
    const tampered = `${version}:${iv}:${tag}:${tamperedCiphertext}`;

    expect(() => decryptCredential(tampered, TEST_SECRET)).toThrow(
      /unable to authenticate data/iu
    );
  });

  it("throws cryptographic authentication error when authentication tag is tampered with", () => {
    const plaintext = "SB-Mid-server-secret-key-12345";
    const encrypted = encryptCredential(plaintext, TEST_SECRET);
    const [version, iv, tag, ciphertext] = encrypted.split(":");

    // Flip the first character of the auth tag hex
    const tamperedTagChar = tag[0] === "a" ? "b" : "a";
    const tamperedTag = `${tamperedTagChar}${tag.slice(1)}`;
    const tampered = `${version}:${iv}:${tamperedTag}:${ciphertext}`;

    expect(() => decryptCredential(tampered, TEST_SECRET)).toThrow(
      /unable to authenticate data/iu
    );
  });

  it("throws cryptographic authentication error when decrypted with wrong secret", () => {
    const plaintext = "SB-Mid-server-secret-key-12345";
    const encrypted = encryptCredential(plaintext, TEST_SECRET);
    const wrongSecret = "different-master-secret-at-least-32b!";

    expect(() => decryptCredential(encrypted, wrongSecret)).toThrow(
      /unable to authenticate data/iu
    );
  });
});
