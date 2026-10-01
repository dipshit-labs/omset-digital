export interface XenditConfig {
  isProduction?: boolean;
  secretKey: string;
  webhookToken?: string;
}

export interface XenditCustomerDetails {
  email?: string;
  givenNames?: string;
  mobileNumber?: string;
  surname?: string;
}

export interface XenditItemDetails {
  category?: string;
  name: string;
  price: number;
  quantity: number;
  url?: string;
}

export interface CreateXenditInvoiceInput {
  amount: number;
  currency?: string;
  customer?: XenditCustomerDetails;
  description: string;
  externalId: string;
  failureRedirectUrl?: string;
  invoiceDuration?: number;
  items?: XenditItemDetails[];
  payerEmail: string;
  successRedirectUrl?: string;
}

export interface XenditInvoiceResponse {
  amount: number;
  created: string;
  currency: string;
  customer?: XenditCustomerDetails;
  description: string;
  expiry_date: string;
  external_id: string;
  id: string;
  invoice_url: string;
  items?: XenditItemDetails[];
  merchant_name: string;
  merchant_profile_picture_url?: string;
  paid_amount?: number;
  paid_at?: string;
  payer_email: string;
  payment_channel?: string;
  payment_destination?: string;
  payment_method?: string;
  status: string;
  updated: string;
  user_id: string;
}

export interface XenditWebhookPayload {
  amount?: number;
  created?: string;
  currency?: string;
  data?: {
    external_id?: string;
    reference_id?: string;
    status?: string;
  };
  description?: string;
  external_id?: string;
  id?: string;
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
