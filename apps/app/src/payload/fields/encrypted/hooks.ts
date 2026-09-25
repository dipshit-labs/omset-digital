import type { FieldHook } from "payload";

export const encryptField: FieldHook = ({ req, value }) => {
  if (!value) {
    return value;
  }

  return req.payload.encrypt(value);
};

export const decryptField: FieldHook = ({ req, value }) => {
  if (!value) {
    return value;
  }

  return req.payload.decrypt(value);
};
