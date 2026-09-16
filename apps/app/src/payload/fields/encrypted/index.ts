import type { TextField } from "payload";
import { decryptField, encryptField } from "./hooks";

type EncryptedFieldOverrides = Partial<Omit<TextField, "type" | "name">>;

type EncryptedField = (
  name?: string,
  overrides?: EncryptedFieldOverrides
) => TextField;

export const encryptedField: EncryptedField = (
  name = "encryptedSecret",
  overrides = {}
) => {
  const {
    admin: adminOverrides,
    hooks: hooksOverrides,
    access: accessOverrides,
    ...restOverrides
  } = overrides;

  return {
    name,
    type: "text",
    ...restOverrides,
    access: {
      read: () => false,
      ...accessOverrides,
    },
    admin: {
      ...adminOverrides,
    },
    hooks: {
      ...hooksOverrides,
      afterRead: [decryptField, ...(hooksOverrides?.afterRead ?? [])],
      beforeChange: [...(hooksOverrides?.beforeChange ?? []), encryptField],
    },
  } as TextField;
};
