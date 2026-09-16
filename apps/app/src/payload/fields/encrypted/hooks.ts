import type { FieldHook } from "payload";

export const encryptField: FieldHook = ({ value, req }) => {
  if (!value) {
    return value;
  }

  return req.payload.encrypt(value);
};

export const decryptField: FieldHook = ({ value, req }) => {
  if (!value) {
    return value;
  }

  return req.payload.decrypt(value);
};
