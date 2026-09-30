import { Buffer } from "node:buffer";
import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
// 96 bits per NIST SP 800-38D
const IV_LENGTH = 12;
// 128 bits authentication tag
const TAG_LENGTH = 16;
const CURRENT_VERSION = "v1";
const VERSION_PREFIX = `${CURRENT_VERSION}:`;
const HKDF_SALT = "omset-digital-salt";
const HKDF_INFO = "payment-byok-aes-key";
const MINIMUM_SECRET_LENGTH = 32;
const CIPHERTEXT_REGEX = /^v1:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]*$/u;

export type Ciphertext = `v1:${string}`;

export interface CryptoOptions {
  secret: string;
}

const resolveSecret = (secretOrOptions: CryptoOptions | string): string => {
  const secret =
    typeof secretOrOptions === "string"
      ? secretOrOptions
      : secretOrOptions?.secret;

  if (!secret || secret.length < MINIMUM_SECRET_LENGTH) {
    throw new Error(
      `Secret must be at least ${MINIMUM_SECRET_LENGTH} characters`
    );
  }

  return secret;
};

const deriveKey = (secret: string): Buffer => {
  const derived = crypto.hkdfSync("sha256", secret, HKDF_SALT, HKDF_INFO, 32);
  return Buffer.from(derived);
};

/**
 * Type guard that checks if an unknown value is a versioned ciphertext string.
 */
export const isCiphertext = (value?: unknown): value is Ciphertext =>
  typeof value === "string" && CIPHERTEXT_REGEX.test(value);

/**
 * Encrypts a plaintext string using NIST SP 800-38D compliant AES-256-GCM.
 * Generates a 96-bit random IV and 128-bit authentication tag, returning
 * serialized string in format `v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>`.
 */
export const encryptCredential = (
  plaintext: string,
  secretOrOptions: CryptoOptions | string
): Ciphertext => {
  const secret = resolveSecret(secretOrOptions);
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf-8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `${CURRENT_VERSION}:${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
};

/**
 * Decrypts a versioned AES-256-GCM ciphertext string.
 *
 * Validates the 128-bit authentication tag before returning the decrypted plaintext.
 * If the ciphertext or authentication tag was corrupted or tampered with, Node's
 * crypto decipher throws a cryptographic authentication error.
 */
export const decryptCredential = (
  serialized: string,
  secretOrOptions: CryptoOptions | string
): string => {
  if (
    typeof serialized !== "string" ||
    !serialized.startsWith(VERSION_PREFIX)
  ) {
    throw new Error("Invalid ciphertext format: missing version prefix");
  }

  const parts = serialized.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid ciphertext format: expected 4 segments");
  }

  const [version, ivHex, tagHex, cipherHex] = parts;
  if (version !== CURRENT_VERSION) {
    throw new Error(`Unsupported encryption version: ${version}`);
  }

  if (ivHex.length !== IV_LENGTH * 2 || tagHex.length !== TAG_LENGTH * 2) {
    throw new Error("Invalid ciphertext format: invalid segment length");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(cipherHex, "hex");

  const secret = resolveSecret(secretOrOptions);
  const key = deriveKey(secret);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf-8");
};
