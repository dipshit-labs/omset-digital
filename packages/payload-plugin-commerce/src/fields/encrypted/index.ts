import type { PayloadRequest, TextField } from "payload";

import { createEncryptedFieldBeforeChange } from "./hooks";

export interface EncryptedCredentialFieldOptions extends Partial<
  Omit<TextField, "name" | "type">
> {
  secretOrResolver?: string | ((req: PayloadRequest) => string);
}

export const encryptedCredentialField = (
  name: string,
  options: EncryptedCredentialFieldOptions = {}
): TextField => {
  const {
    admin: adminOverrides,
    hooks: hooksOverrides,
    secretOrResolver,
    ...restOverrides
  } = options;

  // SAFETY: Merged configuration conforms to Payload single-value TextField.
  return {
    name,
    type: "text",
    ...restOverrides,
    admin: {
      ...adminOverrides,
    },
    hooks: {
      ...hooksOverrides,
      beforeChange: [
        createEncryptedFieldBeforeChange(secretOrResolver),
        ...(hooksOverrides?.beforeChange ?? []),
      ],
    },
  } as TextField;
};

export { createEncryptedFieldBeforeChange } from "./hooks";
