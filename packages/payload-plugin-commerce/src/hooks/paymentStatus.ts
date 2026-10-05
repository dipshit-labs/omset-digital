import type { CollectionBeforeValidateHook } from "payload";

import { APIError } from "payload";

export type PaymentStatus =
  | "cancelled"
  | "expired"
  | "failed"
  | "paid"
  | "pending";

export const CANONICAL_PAYMENT_STATUSES: readonly PaymentStatus[] = [
  "pending",
  "paid",
  "expired",
  "failed",
  "cancelled",
] as const;

export const TERMINAL_PAYMENT_STATUSES: ReadonlySet<PaymentStatus> = new Set([
  "paid",
  "expired",
  "failed",
  "cancelled",
]);

/**
 * Validates whether transitioning from one payment status to another is permitted
 * according to the canonical payment state machine:
 * pending -> paid | expired | failed | cancelled
 *
 * Terminal states (paid, expired, failed, cancelled) cannot transition to any other status.
 * Re-asserting the identical status is idempotent and allowed.
 */
export const isValidPaymentStatusTransition = (
  from?: PaymentStatus,
  to?: PaymentStatus
): boolean => {
  // If target status is not defined or is identical, allow (no transition or idempotent)
  if (!to || from === to) {
    return true;
  }

  // If no prior status, transition to any canonical status is permitted
  if (!from) {
    return CANONICAL_PAYMENT_STATUSES.includes(to);
  }

  // Terminal states cannot transition to any different status
  if (TERMINAL_PAYMENT_STATUSES.has(from)) {
    return false;
  }

  // From pending, can transition to any valid terminal status
  if (from === "pending") {
    return CANONICAL_PAYMENT_STATUSES.includes(to);
  }

  return false;
};

/**
 * Collection beforeValidate hook for Orders collection that enforces the canonical
 * payment status state machine and prevents reversing terminal states.
 */
export const preventPaymentStatusReversion: CollectionBeforeValidateHook = ({
  data,
  operation,
  originalDoc,
}) => {
  if (operation !== "update") {
    return data;
  }

  // SAFETY: originalDoc paymentStatus adheres to PaymentStatus enum contract.
  const previousStatus = originalDoc?.paymentStatus as
    | PaymentStatus
    | undefined;
  // SAFETY: data paymentStatus is validated against PaymentStatus enum.
  const nextStatus = data?.paymentStatus as PaymentStatus | undefined;

  if (nextStatus === undefined || nextStatus === previousStatus) {
    return data;
  }

  if (previousStatus && TERMINAL_PAYMENT_STATUSES.has(previousStatus)) {
    throw new APIError(
      `Cannot transition order payment status from terminal state '${previousStatus}' to '${nextStatus}'.`,
      400
    );
  }

  if (!isValidPaymentStatusTransition(previousStatus, nextStatus)) {
    throw new APIError(
      `Illegal payment status transition from '${previousStatus ?? "none"}' to '${nextStatus}'.`,
      400
    );
  }

  return data;
};
