import type { PayloadRequest } from "payload";

import type { CreateTestReqOptions } from "./types";

export const createTestReq = (
  options?: CreateTestReqOptions
): PayloadRequest => {
  const req = {
    headers: options?.headers ?? new Headers(),
    // SAFETY: Test user option duck-types as PayloadRequest user property for test execution.
    user: (options?.user ?? null) as PayloadRequest["user"],
  };

  // SAFETY: Stub satisfies the subset of PayloadRequest properties accessed by hooks and access controls.
  return req as PayloadRequest;
};
