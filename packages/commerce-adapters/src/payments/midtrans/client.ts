import type {
  CreatePaymentSessionInput,
  ParsedPaymentStatus,
  ParsedWebhookEvent,
  ParseWebhookInput,
  PaymentProvider,
  PaymentSession,
  PaymentStatus,
} from "../types";
import type { MidtransConfig, MidtransSignatureInput } from "./types";

import { Buffer } from "node:buffer";
import { minLength, object, optional, string } from "zod/mini";

import { PaymentWebhookError } from "../types";
import { verifyMidtransSignature } from "./signature";

interface SnapTransactionPayload {
  customer_details?: {
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
  item_details?: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  transaction_details: {
    gross_amount: number;
    order_id: string;
  };
}

const snapSessionResponseSchema = object({
  redirect_url: string().check(minLength(1)),
  token: string().check(minLength(1)),
});

const mapMidtransTransactionStatus = (params: {
  fraudStatus?: string;
  transactionStatus: string;
}): PaymentStatus => {
  switch (params.transactionStatus) {
    case "capture": {
      if (params.fraudStatus === "challenge") {
        return "pending";
      }
      if (params.fraudStatus === "deny") {
        return "failed";
      }
      return "paid";
    }
    case "settlement": {
      return "paid";
    }
    case "pending": {
      return "pending";
    }
    case "deny":
    case "failure": {
      return "failed";
    }
    case "expire": {
      return "expired";
    }
    case "cancel":
    case "refund":
    case "partial_refund": {
      return "cancelled";
    }
    default: {
      return "pending";
    }
  }
};

const midtransStatusResponseSchema = object({
  fraud_status: optional(string()),
  gross_amount: string().check(minLength(1)),
  order_id: string().check(minLength(1)),
  payment_type: optional(string()),
  settlement_time: optional(string()),
  signature_key: optional(string()),
  status_code: string().check(minLength(1)),
  status_message: optional(string()),
  transaction_id: optional(string()),
  transaction_status: string().check(minLength(1)),
  transaction_time: optional(string()),
});

const MidtransWebhookSchema = object({
  currency: optional(string()),
  fraud_status: optional(string()),
  gross_amount: string().check(minLength(1)),
  merchant_id: optional(string()),
  order_id: string().check(minLength(1)),
  payment_type: optional(string()),
  settlement_time: optional(string()),
  signature_key: string().check(minLength(1)),
  status_code: string().check(minLength(1)),
  status_message: optional(string()),
  transaction_id: optional(string()),
  transaction_status: string().check(minLength(1)),
  transaction_time: optional(string()),
});

export class MidtransClient implements PaymentProvider {
  public readonly id = "midtrans";
  public readonly clientKey?: string;
  public readonly isProduction: boolean;
  public readonly serverKey: string;

  constructor(config: MidtransConfig) {
    this.serverKey = config.serverKey;
    this.clientKey = config.clientKey;
    this.isProduction = Boolean(config.isProduction);
  }

  private get authHeader(): string {
    const encoded = Buffer.from(`${this.serverKey}:`).toString("base64");
    return `Basic ${encoded}`;
  }

  private get snapBaseUrl(): string {
    return this.isProduction
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";
  }

  private get coreBaseUrl(): string {
    return this.isProduction
      ? "https://api.midtrans.com/v2"
      : "https://api.sandbox.midtrans.com/v2";
  }

  /**
   * Creates a Snap payment session for checkout redirection or popup embed.
   * Calls POST /snap/v1/transactions with Basic Auth.
   */
  public async createSession(
    input: CreatePaymentSessionInput
  ): Promise<PaymentSession> {
    const body: SnapTransactionPayload = {
      transaction_details: {
        gross_amount: input.grossAmount,
        order_id: input.orderId,
      },
    };

    if (input.customer) {
      body.customer_details = {
        email: input.customer.email,
        first_name: input.customer.firstName,
        last_name: input.customer.lastName,
        phone: input.customer.phone,
      };
    }

    if (input.items && input.items.length > 0) {
      body.item_details = input.items.map((item) => ({
        id: item.id,
        name: item.name.slice(0, 50),
        price: item.price,
        quantity: item.quantity,
      }));
    }

    const response = await fetch(this.snapBaseUrl, {
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
      throw new Error(`Midtrans API error (${response.status}): ${errorText}`);
    }

    // SAFETY: Response payload from Midtrans Snap endpoint validated via Zod schema.
    const rawJson = (await response.json()) as unknown;
    const result = snapSessionResponseSchema.safeParse(rawJson);
    if (!result.success) {
      throw new Error(
        `Failed to validate Midtrans Snap response: ${result.error.message}`
      );
    }

    return {
      redirectUrl: result.data.redirect_url,
      token: result.data.token,
    };
  }

  /**
   * Queries transaction status by order ID.
   * Calls GET /v2/{order_id}/status with Basic Auth.
   */
  public async getTransactionStatus(
    orderId: string
  ): Promise<ParsedPaymentStatus> {
    const url = `${this.coreBaseUrl}/${encodeURIComponent(orderId)}/status`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: this.authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Midtrans API error (${response.status}): ${errorText}`);
    }

    // SAFETY: Response payload from Midtrans Status endpoint validated via Zod schema.
    const rawJson = (await response.json()) as unknown;
    const result = midtransStatusResponseSchema.safeParse(rawJson);
    if (!result.success) {
      throw new Error(
        `Failed to validate Midtrans status response: ${result.error.message}`
      );
    }

    const { data } = result;
    const paymentStatus = mapMidtransTransactionStatus({
      fraudStatus: data.fraud_status,
      transactionStatus: data.transaction_status,
    });

    const parsedGross = Number(data.gross_amount);

    return {
      grossAmount: Number.isNaN(parsedGross) ? undefined : parsedGross,
      orderId: data.order_id,
      paymentStatus,
      paymentType: data.payment_type,
      settlementTime: data.settlement_time,
      transactionId: data.transaction_id,
      metadata: {
        fraudStatus: data.fraud_status,
        grossAmountRaw: data.gross_amount,
        paymentType: data.payment_type,
        settlementTime: data.settlement_time,
        statusCode: data.status_code,
        statusMessage: data.status_message,
        transactionId: data.transaction_id,
        transactionStatus: data.transaction_status,
        transactionTime: data.transaction_time,
      },
    };
  }

  /**
   * Verifies an incoming webhook notification's signature against this client's serverKey.
   */
  public verifyWebhookSignature(input: MidtransSignatureInput): boolean {
    return verifyMidtransSignature(input, this.serverKey);
  }

  /**
   * Ingests, validates, verifies, and normalizes an incoming Midtrans webhook notification.
   * Validates payload schema using private Zod v4 schema, preserves decimal gross amounts,
   * verifies SHA-512 signature using tsscmp, and returns a canonical ParsedWebhookEvent.
   */
  public parseWebhook(input: ParseWebhookInput): Promise<ParsedWebhookEvent> {
    return Promise.resolve().then(() => {
      let rawJson: unknown;
      try {
        rawJson = JSON.parse(input.rawBody);
      } catch {
        throw new PaymentWebhookError(
          "Malformed webhook payload: Invalid JSON",
          400
        );
      }

      const result = MidtransWebhookSchema.safeParse(rawJson);
      if (!result.success) {
        throw new PaymentWebhookError(
          `Malformed webhook payload: ${result.error.message}`,
          400
        );
      }

      const { data } = result;
      const serverKey = input.secret ?? this.serverKey;
      if (!serverKey) {
        throw new PaymentWebhookError(
          "Missing server key for webhook verification",
          401
        );
      }

      const isValidSignature = verifyMidtransSignature(
        {
          gross_amount: data.gross_amount,
          order_id: data.order_id,
          signature_key: data.signature_key,
          status_code: data.status_code,
        },
        serverKey
      );

      if (!isValidSignature) {
        throw new PaymentWebhookError("Invalid webhook signature", 401);
      }

      const paymentStatus = mapMidtransTransactionStatus({
        fraudStatus: data.fraud_status,
        transactionStatus: data.transaction_status,
      });

      return {
        orderId: data.order_id,
        paymentStatus,
        providerEventId: data.transaction_id,
        metadata: {
          currency: data.currency,
          fraudStatus: data.fraud_status,
          grossAmount: data.gross_amount,
          merchantId: data.merchant_id,
          paymentType: data.payment_type,
          settlementTime: data.settlement_time,
          statusCode: data.status_code,
          statusMessage: data.status_message,
          transactionId: data.transaction_id,
          transactionStatus: data.transaction_status,
          transactionTime: data.transaction_time,
        },
      };
    });
  }
}
