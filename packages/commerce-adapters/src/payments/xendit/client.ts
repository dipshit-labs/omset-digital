import { Buffer } from "node:buffer";

import {
  verifyXenditCallbackToken,
  verifyXenditHmacSignature,
} from "./signature";
import type {
  CreateXenditInvoiceInput,
  XenditConfig,
  XenditInvoiceResponse,
} from "./types";

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
  payer_email: string;
  success_redirect_url?: string;
}

export class XenditClient {
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
  public async createInvoice(
    input: CreateXenditInvoiceInput
  ): Promise<XenditInvoiceResponse> {
    const body: XenditInvoicePayload = {
      amount: input.amount,
      description: input.description,
      external_id: input.externalId,
      payer_email: input.payerEmail,
    };

    if (input.currency) {
      body.currency = input.currency;
    }

    if (input.invoiceDuration !== undefined) {
      body.invoice_duration = input.invoiceDuration;
    }

    if (input.successRedirectUrl) {
      body.success_redirect_url = input.successRedirectUrl;
    }

    if (input.failureRedirectUrl) {
      body.failure_redirect_url = input.failureRedirectUrl;
    }

    if (input.customer) {
      body.customer = {
        email: input.customer.email,
        given_names: input.customer.givenNames,
        mobile_number: input.customer.mobileNumber,
        surname: input.customer.surname,
      };
    }

    if (input.items && input.items.length > 0) {
      body.items = input.items.map((item) => ({
        category: item.category,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        url: item.url,
      }));
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

    // SAFETY: Xendit v2 Invoices API returns invoice response matching XenditInvoiceResponse on success.
    return (await response.json()) as XenditInvoiceResponse;
  }

  /**
   * Queries invoice details by invoice ID.
   * Calls GET https://api.xendit.co/v2/invoices/{invoice_id} with Basic Auth.
   */
  public async getInvoice(invoiceId: string): Promise<XenditInvoiceResponse> {
    const url = `${this.baseUrl}/${encodeURIComponent(invoiceId)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: this.authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Xendit API error (${response.status}): ${errorText}`);
    }

    // SAFETY: Xendit v2 Invoices API returns invoice response matching XenditInvoiceResponse on success.
    return (await response.json()) as XenditInvoiceResponse;
  }

  /**
   * Verifies an incoming webhook notification's callback token against this client's webhookToken.
   */
  public verifyWebhookToken(tokenHeader: string): boolean {
    if (!this.webhookToken) {
      return false;
    }
    return verifyXenditCallbackToken(tokenHeader, this.webhookToken);
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
}
