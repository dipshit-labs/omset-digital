import { encryptCredential, isCiphertext } from "@repo/commerce-adapters/utils";
import type { FieldHook, PayloadRequest } from "payload";

const getNestedValue = (
  obj: unknown,
  path?: (number | string)[] | string
): string | undefined => {
  if (!obj || typeof obj !== "object" || !path) {
    return undefined;
  }

  const parts = Array.isArray(path) ? path : path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (
      current === undefined ||
      current === null ||
      typeof current !== "object"
    ) {
      return undefined;
    }

    const key = String(part);
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (!descriptor) {
      return undefined;
    }
    current = descriptor.value;
  }

  return typeof current === "string" ? current : undefined;
};

const resolveSecret = (
  secretOrResolver: string | ((req: PayloadRequest) => string) | undefined,
  req: PayloadRequest
): string => {
  if (typeof secretOrResolver === "string") {
    return secretOrResolver;
  }

  if (typeof secretOrResolver === "function") {
    return secretOrResolver(req);
  }
  if (req.payload?.secret) {
    return req.payload.secret;
  }

  throw new Error(
    "Encryption secret not found. Pass secret to commercePlugin or ensure req.payload.secret is configured."
  );
};

export const createEncryptedFieldBeforeChange =
  (secretOrResolver?: string | ((req: PayloadRequest) => string)): FieldHook =>
  ({ field, originalDoc, path, req, value }) => {
    // 1. If value is undefined, null, or empty string
    if (value === undefined || value === null || value === "") {
      if (originalDoc) {
        const fieldPath = path || field?.name;
        const originalValue = getNestedValue(originalDoc, fieldPath);
        if (
          originalValue !== undefined &&
          originalValue !== null &&
          originalValue !== ""
        ) {
          return originalValue;
        }
      }

      return value;
    }

    // 2. If already valid ciphertext, do not re-encrypt
    if (isCiphertext(value)) {
      return value;
    }

    // 3. Encrypt plaintext
    const secret = resolveSecret(secretOrResolver, req);
    return encryptCredential(String(value), secret);
  };
