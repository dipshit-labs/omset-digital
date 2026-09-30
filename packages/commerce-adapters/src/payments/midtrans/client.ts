import { Buffer } from "node:buffer";

import { verifyMidtransSignature } from "./signature";
import type {
  CreateSnapSessionInput,
  MidtransConfig,
  MidtransSignatureInput,
  MidtransTransactionStatusResponse,
  SnapSessionResponse,
} from "./types";

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

export class MidtransClient {
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
    input: CreateSnapSessionInput
  ): Promise<SnapSessionResponse> {
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

    // SAFETY: Midtrans Snap API returns token and redirect_url on 201/200 OK.
    return (await response.json()) as SnapSessionResponse;
  }

  /**
   * Queries transaction status by order ID.
   * Calls GET /v2/{order_id}/status with Basic Auth.
   */
  public async getTransactionStatus(
    orderId: string
  ): Promise<MidtransTransactionStatusResponse> {
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

    // SAFETY: Midtrans Core API returns transaction status payload matching MidtransTransactionStatusResponse.
    return (await response.json()) as MidtransTransactionStatusResponse;
  }

  /**
   * Verifies an incoming webhook notification's signature against this client's serverKey.
   */
  public verifyWebhookSignature(input: MidtransSignatureInput): boolean {
    return verifyMidtransSignature(input, this.serverKey);
  }
}
