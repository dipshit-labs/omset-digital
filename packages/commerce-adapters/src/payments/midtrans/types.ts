export interface MidtransConfig {
  clientKey?: string;
  isProduction?: boolean;
  serverKey: string;
}

export interface MidtransSignatureInput {
  gross_amount: string;
  order_id: string;
  signature_key: string;
  status_code: string;
}

export interface MidtransWebhookPayload {
  currency?: string;
  fraud_status?: string;
  gross_amount: string;
  merchant_id?: string;
  order_id: string;
  payment_type?: string;
  settlement_time?: string;
  signature_key: string;
  status_code: string;
  status_message?: string;
  transaction_id?: string;
  transaction_status: string;
  transaction_time?: string;
}
