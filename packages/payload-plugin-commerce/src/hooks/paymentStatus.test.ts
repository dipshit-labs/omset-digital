import type { CollectionBeforeValidateHook, PayloadRequest } from "payload";
import type { PaymentStatus } from "./paymentStatus";

import { APIError } from "payload";
import { describe, expect, it } from "vitest";

import {
  isValidPaymentStatusTransition,
  preventPaymentStatusReversion,
} from "./paymentStatus";

type HookArgs = Parameters<CollectionBeforeValidateHook>[0];

const createHookArgs = (overrides: Partial<HookArgs> = {}): HookArgs =>
  ({
    collection: { slug: "orders" },
    context: {},
    data: {},
    operation: "update",
    originalDoc: {},
    req: {} as PayloadRequest,
    ...overrides,
  }) as HookArgs;

describe(isValidPaymentStatusTransition, () => {
  it("allows transitions from pending to all canonical terminal states", () => {
    expect(isValidPaymentStatusTransition("pending", "paid")).toBeTruthy();
    expect(isValidPaymentStatusTransition("pending", "failed")).toBeTruthy();
    expect(isValidPaymentStatusTransition("pending", "expired")).toBeTruthy();
    expect(isValidPaymentStatusTransition("pending", "cancelled")).toBeTruthy();
    expect(isValidPaymentStatusTransition("pending", "pending")).toBeTruthy();
  });

  it("allows idempotent transitions from terminal states to themselves", () => {
    expect(isValidPaymentStatusTransition("paid", "paid")).toBeTruthy();
    expect(isValidPaymentStatusTransition("failed", "failed")).toBeTruthy();
    expect(isValidPaymentStatusTransition("expired", "expired")).toBeTruthy();
    expect(
      isValidPaymentStatusTransition("cancelled", "cancelled")
    ).toBeTruthy();
  });

  it("forbids transitions from paid to any other state", () => {
    expect(isValidPaymentStatusTransition("paid", "pending")).toBeFalsy();
    expect(isValidPaymentStatusTransition("paid", "expired")).toBeFalsy();
    expect(isValidPaymentStatusTransition("paid", "failed")).toBeFalsy();
    expect(isValidPaymentStatusTransition("paid", "cancelled")).toBeFalsy();
  });

  it("forbids transitions from failed to any other state", () => {
    expect(isValidPaymentStatusTransition("failed", "paid")).toBeFalsy();
    expect(isValidPaymentStatusTransition("failed", "pending")).toBeFalsy();
    expect(isValidPaymentStatusTransition("failed", "expired")).toBeFalsy();
    expect(isValidPaymentStatusTransition("failed", "cancelled")).toBeFalsy();
  });

  it("forbids transitions from expired to any other state", () => {
    expect(isValidPaymentStatusTransition("expired", "paid")).toBeFalsy();
    expect(isValidPaymentStatusTransition("expired", "pending")).toBeFalsy();
    expect(isValidPaymentStatusTransition("expired", "failed")).toBeFalsy();
    expect(isValidPaymentStatusTransition("expired", "cancelled")).toBeFalsy();
  });

  it("forbids transitions from cancelled to any other state", () => {
    expect(isValidPaymentStatusTransition("cancelled", "paid")).toBeFalsy();
    expect(isValidPaymentStatusTransition("cancelled", "pending")).toBeFalsy();
    expect(isValidPaymentStatusTransition("cancelled", "failed")).toBeFalsy();
    expect(isValidPaymentStatusTransition("cancelled", "expired")).toBeFalsy();
  });

  it("handles non-canonical and unknown states", () => {
    // SAFETY: Testing runtime validation of invalid string cast
    expect(
      isValidPaymentStatusTransition(undefined, "unknown" as never)
    ).toBeFalsy();
    // SAFETY: Testing runtime validation of invalid string cast
    expect(
      isValidPaymentStatusTransition("unknown" as never, "paid")
    ).toBeFalsy();
  });
});

describe("preventPaymentStatusReversion hook", () => {
  it("allows setting paymentStatus on document creation", () => {
    const args = createHookArgs({
      data: { paymentStatus: "pending" },
      operation: "create",
      originalDoc: undefined,
    });

    const result = preventPaymentStatusReversion(args);
    expect(result).toStrictEqual({ paymentStatus: "pending" });
  });

  it("allows updating paymentStatus from pending to paid", () => {
    const args = createHookArgs({
      data: { paymentStatus: "paid" },
      operation: "update",
      originalDoc: { paymentStatus: "pending" },
    });

    const result = preventPaymentStatusReversion(args);
    expect(result).toStrictEqual({ paymentStatus: "paid" });
  });

  it("allows updating paymentStatus from pending to failed, expired, or cancelled", () => {
    for (const status of [
      "failed",
      "expired",
      "cancelled",
    ] as PaymentStatus[]) {
      const args = createHookArgs({
        data: { paymentStatus: status },
        operation: "update",
        originalDoc: { paymentStatus: "pending" },
      });

      const result = preventPaymentStatusReversion(args);
      expect(result).toStrictEqual({ paymentStatus: status });
    }
  });

  it("allows updating an order without changing paymentStatus (idempotent)", () => {
    const args = createHookArgs({
      data: { note: "Customer changed delivery note" },
      operation: "update",
      originalDoc: { paymentStatus: "paid" },
    });

    const result = preventPaymentStatusReversion(args);
    expect(result).toStrictEqual({ note: "Customer changed delivery note" });
  });

  it("allows re-submitting identical paymentStatus on already paid order", () => {
    const args = createHookArgs({
      data: { paymentStatus: "paid" },
      operation: "update",
      originalDoc: { paymentStatus: "paid" },
    });

    const result = preventPaymentStatusReversion(args);
    expect(result).toStrictEqual({ paymentStatus: "paid" });
  });

  it("throws APIError when attempting to revert paid order to expired", () => {
    const args = createHookArgs({
      data: { paymentStatus: "expired" },
      operation: "update",
      originalDoc: { paymentStatus: "paid" },
    });

    expect(() => preventPaymentStatusReversion(args)).toThrow(APIError);
    expect(() => preventPaymentStatusReversion(args)).toThrow(
      "Cannot transition order payment status from terminal state 'paid' to 'expired'."
    );
  });

  it("throws APIError when attempting to revert paid order to failed", () => {
    const args = createHookArgs({
      data: { paymentStatus: "failed" },
      operation: "update",
      originalDoc: { paymentStatus: "paid" },
    });

    expect(() => preventPaymentStatusReversion(args)).toThrow(APIError);
    expect(() => preventPaymentStatusReversion(args)).toThrow(
      "Cannot transition order payment status from terminal state 'paid' to 'failed'."
    );
  });

  it("throws APIError when attempting to revert failed or expired order to paid", () => {
    const failedArgs = createHookArgs({
      data: { paymentStatus: "paid" },
      operation: "update",
      originalDoc: { paymentStatus: "failed" },
    });
    expect(() => preventPaymentStatusReversion(failedArgs)).toThrow(APIError);

    const expiredArgs = createHookArgs({
      data: { paymentStatus: "paid" },
      operation: "update",
      originalDoc: { paymentStatus: "expired" },
    });
    expect(() => preventPaymentStatusReversion(expiredArgs)).toThrow(APIError);
  });
});
