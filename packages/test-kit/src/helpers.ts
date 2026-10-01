import type { Config, Payload, PayloadRequest } from "payload";

export type TestPayloadConfigOverrides = Partial<Config>;

export interface CreateTestReqOptions {
  headers?: Headers;
  user?: unknown;
}

export const createTestPayload = (
  _overrides?: TestPayloadConfigOverrides
): Promise<Payload> =>
  Promise.reject(new Error("createTestPayload is not implemented yet"));

export const resetDatabase = (_payload: Payload): Promise<void> =>
  Promise.reject(new Error("resetDatabase is not implemented yet"));

export const createTestReq = (
  _options?: CreateTestReqOptions
): PayloadRequest => {
  throw new Error("createTestReq is not implemented yet");
};
