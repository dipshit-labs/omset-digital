import { midtransHandlers } from "./midtrans";
import { rajaongkirHandlers } from "./rajaongkir";
import { resendHandlers } from "./resend";
import { xenditHandlers } from "./xendit";

export { midtransHandlers } from "./midtrans";
export { rajaongkirHandlers } from "./rajaongkir";
export { resendHandlers } from "./resend";
export { xenditHandlers } from "./xendit";

export const handlers = [
  ...midtransHandlers,
  ...xenditHandlers,
  ...rajaongkirHandlers,
  ...resendHandlers,
];
