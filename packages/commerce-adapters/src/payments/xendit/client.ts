import { Buffer } from "node:buffer";

import { boolean, minLength, number, object, optional, string } from "zod/mini";

import type {
  CreatePaymentSessionInput,
  ParsedPaymentStatus,
  ParsedWebhookEvent,
  ParseWebhookInput,
  PaymentMetadata,
  PaymentProvider,
  PaymentSession,
  PaymentStatus,
} from "../types";
import { PaymentWebhookError } from "../types";
import {
  verifyXenditCallbackToken,
  verifyXenditHmacSignature,
} from "./signature";
import type { XenditConfig } from "./types";

interface XenditInvoicePayload {
  amount: number;
  currency?: string;
  customer?: {
    email?: string;
    given_names?: string;
    mobile_number?: string;
    surname?: string;
  };
  description: string;
  external_id: string;
  failure_redirect_url?: string;
  invoice_duration?: number;
  items?: {
    category?: string;
    name: string;
    price: number;
    quantity: number;
    url?: string;
  }[];
  payer_email?: string;
  success_redirect_url?: string;
}

const xenditSessionResponseSchema = object({
  id: string().check(minLength(1)),
  invoice_url: string().check(minLength(1)),
});

const mapXenditStatus = (status: string | undefined): PaymentStatus => {
  if (!status) {
    return "pending";
  }

  switch (status.toUpperCase()) {
    case "PAID":
    case "SETTLED":
    case "SUCCEEDED":
    case "COMPLETED": {
      return "paid";
    }
    case "EXPIRED": {
      return "expired";
    }
    case "FAILED": {
      return "failed";
    }
    case "CANCELLED":
    case "CANCELED": {
      return "cancelled";
    }
    default: {
      return "pending";
    }
  }
};

const xenditStatusResponseSchema = object({
  amount: number(),
  created: optional(string()),
  currency: optional(string()),
  description: optional(string()),
  expiry_date: optional(string()),
  external_id: string().check(minLength(1)),
  id: string().check(minLength(1)),
  invoice_url: optional(string()),
  merchant_name: optional(string()),
  paid_amount: optional(number()),
  paid_at: optional(string()),
  payer_email: optional(string()),
  payment_channel: optional(string()),
  payment_destination: optional(string()),
  payment_method: optional(string()),
  status: string().check(minLength(1)),
  updated: optional(string()),
  user_id: optional(string()),
});

interface XenditStatusData {
  amount: number;
  created?: string;
  currency?: string;
  description?: string;
  expiry_date?: string;
  external_id: string;
  id: string;
  invoice_url?: string;
  merchant_name?: string;
  paid_amount?: number;
  paid_at?: string;
  payer_email?: string;
  payment_channel?: string;
  payment_destination?: string;
  payment_method?: string;
  status: string;
  updated?: string;
  user_id?: string;
}

interface RawXenditMetadata {
  amount?: number;
  created?: string;
  currency?: string;
  description?: string;
  event?: string;
  expiry_date?: string;
  external_id?: string;
  id?: string;
  invoice_url?: string;
  is_high?: boolean;
  merchant_name?: string;
  paid_amount?: number;
  paid_at?: string;
  payer_email?: string;
  payment_channel?: string;
  payment_destination?: string;
  payment_id?: string;
  payment_method?: string;
  status?: string;
  updated?: string;
  user_id?: string;
}

const toPaymentMetadata = (data: RawXenditMetadata): PaymentMetadata => ({
  amount: data.amount,
  created: data.created,
  currency: data.currency,
  description: data.description,
  event: data.event,
  expiryDate: data.expiry_date,
  externalId: data.external_id,
  id: data.id,
  invoiceUrl: data.invoice_url,
  isHigh: data.is_high,
  merchantName: data.merchant_name,
  paidAmount: data.paid_amount,
  paidAt: data.paid_at,
  payerEmail: data.payer_email,
  paymentChannel: data.payment_channel,
  paymentDestination: data.payment_destination,
  paymentId: data.payment_id,
  paymentMethod: data.payment_method,
  status: data.status,
  updated: data.updated,
  userId: data.user_id,
});

const normalizeStatusResponse = (
  data: XenditStatusData
): ParsedPaymentStatus => {
  const paymentStatus = mapXenditStatus(data.status);

  return {
    grossAmount: data.amount,
    metadata: toPaymentMetadata(data),
    orderId: data.external_id,
    paymentStatus,
    paymentType: data.payment_method ?? data.payment_channel,
    settlementTime: data.paid_at,
    transactionId: data.id,
  };
};

const getWebhookHeader = (
  headers: Headers | Record<string, string | string[] | undefined> | undefined,
  headerName: string
): string | undefined => {
  if (!headers) {
    return undefined;
  }

  if (headers instanceof Headers) {
    return headers.get(headerName) ?? undefined;
  }

  const target = headerName.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      if (Array.isArray(value)) {
        return value[0];
      }
      return value;
    }
  }

  return undefined;
};

const xenditWebhookDataSchema = object({
  amount: optional(number()),
  currency: optional(string()),
  external_id: optional(string()),
  id: optional(string()),
  reference_id: optional(string()),
  status: optional(string()),
});

const XenditWebhookSchema = object({
  amount: optional(number()),
  created: optional(string()),
  currency: optional(string()),
  data: optional(xenditWebhookDataSchema),
  description: optional(string()),
  event: optional(string()),
  external_id: optional(string()),
  id: optional(string()),
  is_high: optional(boolean()),
  merchant_name: optional(string()),
  paid_amount: optional(number()),
  paid_at: optional(string()),
  payer_email: optional(string()),
  payment_channel: optional(string()),
  payment_destination: optional(string()),
  payment_id: optional(string()),
  payment_method: optional(string()),
  status: optional(string()),
  updated: optional(string()),
  user_id: optional(string()),
}).check((payload) => {
  const hasOrderId = Boolean(
    payload.value.external_id ||
    payload.value.data?.reference_id ||
    payload.value.data?.external_id
  );
  if (!hasOrderId) {
    payload.issues.push({
      code: "custom",
      input: payload.value,
      message: "Missing required order identifier in webhook payload",
      path: ["external_id"],
    });
  }

  const hasStatus = Boolean(payload.value.status || payload.value.data?.status);
  if (!hasStatus) {
    payload.issues.push({
      code: "custom",
      input: payload.value,
      message: "Missing required payment status in webhook payload",
      path: ["status"],
    });
  }
});

export class XenditClient implements PaymentProvider {
  public readonly id = "xendit";
  public readonly isProduction: boolean;
  public readonly secretKey: string;
  public readonly webhookToken?: string;

  private readonly baseUrl = "https://api.xendit.co/v2/invoices";

  constructor(config: XenditConfig) {
    this.isProduction = config.isProduction ?? false;
    this.secretKey = config.secretKey;
    this.webhookToken = config.webhookToken;
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(`${this.secretKey}:`).toString("base64")}`;
  }

  /**
   * Creates an invoice session for checkout redirection.
   * Calls POST https://api.xendit.co/v2/invoices with Basic Auth.
   */
  public async createSession(
    input: CreatePaymentSessionInput
  ): Promise<PaymentSession> {
    const body: XenditInvoicePayload = {
      amount: input.grossAmount,
      currency: "IDR",
      description: input.description ?? `Order #${input.orderId}`,
      external_id: input.orderId,
    };

    if (input.customer) {
      body.customer = {
        email: input.customer.email,
        given_names: input.customer.firstName,
        mobile_number: input.customer.phone,
        surname: input.customer.lastName,
      };
      if (input.customer.email) {
        body.payer_email = input.customer.email;
      }
    }

    if (input.items && input.items.length > 0) {
      body.items = input.items.map((item) => ({
        name: item.name.slice(0, 255),
        price: item.price,
        quantity: item.quantity,
      }));
    }

    if (input.successUrl) {
      body.success_redirect_url = input.successUrl;
    }

    if (input.failureUrl) {
      body.failure_redirect_url = input.failureUrl;
    }

    const response = await fetch(this.baseUrl, {
      body: JSON.stringify(body),
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Xendit API error (${response.status}): ${errorText}`);
    }

    // SAFETY: Response payload from Xendit Invoices endpoint validated via Zod schema.
    const rawJson = (await response.json()) as unknown;
    const result = xenditSessionResponseSchema.safeParse(rawJson);
    if (!result.success) {
      throw new Error(
        `Failed to validate Xendit invoice response: ${result.error.message}`
      );
    }

    return {
      redirectUrl: result.data.invoice_url,
      token: result.data.id,
    };
  }

  /**
   * Queries invoice details by ID or external order ID.
   * Calls GET https://api.xendit.co/v2/invoices/{orderId} with fallback to
   * GET https://api.xendit.co/v2/invoices?external_id={orderId}.
   */
  public async getTransactionStatus(
    orderId: string
  ): Promise<ParsedPaymentStatus> {
    const url = `${this.baseUrl}/${encodeURIComponent(orderId)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: this.authHeader,
      },
    });

    if (response.status === 404) {
      // Fallback: try querying by external_id in case orderId is merchant's external_id
      const queryUrl = `${this.baseUrl}?external_id=${encodeURIComponent(orderId)}`;
      const queryResponse = await fetch(queryUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: this.authHeader,
        },
      });

      if (queryResponse.ok) {
        // SAFETY: Xendit list invoices returns array of invoices
        const listJson = (await queryResponse.json()) as unknown;
        if (Array.isArray(listJson) && listJson.length > 0) {
          const itemResult = xenditStatusResponseSchema.safeParse(listJson[0]);
          if (itemResult.success) {
            return normalizeStatusResponse(itemResult.data);
          }
        }
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Xendit API error (${response.status}): ${errorText}`);
    }

    // SAFETY: Response payload from Xendit Invoices endpoint validated via Zod schema.
    const rawJson = (await response.json()) as unknown;
    const result = xenditStatusResponseSchema.safeParse(rawJson);
    if (!result.success) {
      throw new Error(
        `Failed to validate Xendit status response: ${result.error.message}`
      );
    }

    return normalizeStatusResponse(result.data);
  }

  public verifyWebhookToken(
    tokenHeader: string,
    configuredToken?: string
  ): boolean {
    const token = configuredToken ?? this.webhookToken;
    if (!token) {
      return false;
    }
    return verifyXenditCallbackToken(tokenHeader, token);
  }

  /**
   * Verifies an incoming webhook notification's HMAC-SHA256 signature against raw request body.
   */
  public verifyWebhookHmacSignature(
    rawBody: string,
    signatureHeader: string,
    secret?: string
  ): boolean {
    const verificationSecret = secret || this.webhookToken || this.secretKey;
    return verifyXenditHmacSignature(
      rawBody,
      signatureHeader,
      verificationSecret
    );
  }
  private authenticateWebhook(input: ParseWebhookInput): void {
    const signatureHeader =
      getWebhookHeader(input.headers, "x-callback-signature") ??
      getWebhookHeader(input.headers, "webhook-signature");
    const tokenHeader = getWebhookHeader(input.headers, "x-callback-token");

    if (!signatureHeader && !tokenHeader) {
      throw new PaymentWebhookError(
        "Missing Xendit webhook verification headers",
        401
      );
    }

    if (signatureHeader) {
      const verificationSecret =
        input.secret ?? this.webhookToken ?? this.secretKey;
      if (!verificationSecret) {
        throw new PaymentWebhookError(
          "Missing secret for webhook signature verification",
          401
        );
      }

      const isValid = this.verifyWebhookHmacSignature(
        input.rawBody,
        signatureHeader,
        verificationSecret
      );
      if (!isValid) {
        throw new PaymentWebhookError("Invalid webhook signature", 401);
      }
      return;
    }

    if (tokenHeader) {
      const verificationToken = input.secret ?? this.webhookToken;
      if (!verificationToken) {
        throw new PaymentWebhookError(
          "Missing webhook token for verification",
          401
        );
      }

      const isValid = this.verifyWebhookToken(tokenHeader, verificationToken);
      if (!isValid) {
        throw new PaymentWebhookError("Invalid webhook token", 401);
      }
    }
  }

  /**
   * Ingests, validates, verifies, and normalizes an incoming Xendit webhook notification.
   * Supports both legacy callback token verification (x-callback-token) and modern HMAC-SHA256
   * signature verification (x-callback-signature) using tsscmp.
   * Validates payload schema with private module-level Zod v4 schema and returns a canonical
   * ParsedWebhookEvent.
   */
  public parseWebhook(input: ParseWebhookInput): Promise<ParsedWebhookEvent> {
    return Promise.resolve().then(() => {
      this.authenticateWebhook(input);

      let rawJson: unknown;
      try {
        rawJson = JSON.parse(input.rawBody);
      } catch {
        throw new PaymentWebhookError(
          "Malformed webhook payload: Invalid JSON",
          400
        );
      }

      const result = XenditWebhookSchema.safeParse(rawJson);
      if (!result.success) {
        throw new PaymentWebhookError(
          `Malformed webhook payload: ${result.error.message}`,
          400
        );
      }

      const { data } = result;
      // SAFETY: XenditWebhookSchema refinement check guarantees orderId presence
      const orderId = (data.external_id ??
        data.data?.reference_id ??
        data.data?.external_id) as string;

      const rawStatus = data.status ?? data.data?.status;
      const paymentStatus = mapXenditStatus(rawStatus);
      const providerEventId = data.id ?? data.payment_id ?? data.data?.id;

      return {
        orderId,
        paymentStatus,
        providerEventId,
        metadata: toPaymentMetadata({
          amount: data.amount ?? data.data?.amount,
          created: data.created,
          currency: data.currency ?? data.data?.currency,
          description: data.description,
          event: data.event,
          external_id: orderId,
          id: providerEventId,
          is_high: data.is_high,
          merchant_name: data.merchant_name,
          paid_amount: data.paid_amount,
          paid_at: data.paid_at,
          payer_email: data.payer_email,
          payment_channel: data.payment_channel,
          payment_destination: data.payment_destination,
          payment_id: data.payment_id,
          payment_method: data.payment_method,
          status: rawStatus,
          updated: data.updated,
          user_id: data.user_id,
        }),
      };
    });
  }
}
