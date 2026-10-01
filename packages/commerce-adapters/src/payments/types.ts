/**
 * Canonical payment status representing the lifecycle of an order's payment.
 * State machine: pending -> paid | expired | failed | cancelled
 */
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

export interface PaymentCustomerDetails {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface PaymentItemDetails {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CreatePaymentSessionInput {
  customer?: PaymentCustomerDetails;
  description?: string;
  failureUrl?: string;
  grossAmount: number;
  items?: PaymentItemDetails[];
  orderId: string;
  successUrl?: string;
}

/**
 * Result of creating a payment session via PaymentProvider.createSession().
 */
export interface PaymentSession {
  redirectUrl: string;
  token?: string;
}

/**
 * Input for verifying and parsing an incoming webhook payload.
 */
export interface ParseWebhookInput {
  headers?: Headers | Record<string, string | string[] | undefined>;
  rawBody: string;
  secret?: string;
}

export type PaymentMetadataPrimitive =
  | boolean
  | number
  | string
  | null
  | undefined;

export type PaymentMetadataValue =
  | PaymentMetadataPrimitive
  | { [key: string]: PaymentMetadataValue }
  | PaymentMetadataValue[];

export type PaymentMetadata = Record<string, PaymentMetadataValue>;

/**
 * Canonical normalized output of PaymentProvider.parseWebhook().
 */
export interface ParsedWebhookEvent {
  metadata?: PaymentMetadata;
  orderId: string;
  paymentStatus: PaymentStatus;
  providerEventId?: string;
}

/**
 * Canonical normalized output of PaymentProvider.getTransactionStatus().
 */
export interface ParsedPaymentStatus {
  grossAmount?: number;
  metadata?: PaymentMetadata;
  orderId: string;
  paymentStatus: PaymentStatus;
  paymentType?: string;
  settlementTime?: string;
  transactionId?: string;
}

/**
 * Standard error thrown by payment webhook processing.
 */
export class PaymentWebhookError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "PaymentWebhookError";
    this.statusCode = statusCode;
  }
}

/**
 * Canonical payment provider contract satisfying ADR-0006.
 */
export interface PaymentProvider {
  readonly id: string;
  readonly createSession: (
    input: CreatePaymentSessionInput
  ) => Promise<PaymentSession>;
  readonly getTransactionStatus: (
    orderId: string
  ) => Promise<ParsedPaymentStatus>;
  readonly parseWebhook: (
    input: ParseWebhookInput
  ) => Promise<ParsedWebhookEvent>;
}
