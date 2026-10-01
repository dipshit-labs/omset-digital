import type { CollectionConfig, PayloadRequest } from "payload";

export type PaymentProvider = "midtrans" | "none" | "xendit";
export type ShippingProvider = "none" | "rajaongkir";
export type RajaOngkirAccountType = "basic" | "pro" | "starter";

export interface MidtransCredentials {
  clientKey?: string;
  isProduction?: boolean;
  serverKey?: string;
}

export interface XenditCredentials {
  isProduction?: boolean;
  secretKey?: string;
  webhookToken?: string;
}

export interface RajaOngkirCredentials {
  accountType?: RajaOngkirAccountType;
  apiKey?: string;
}

export interface StoreCredentials {
  createdAt?: string;
  id?: number | string;
  midtrans?: MidtransCredentials;
  paymentProvider?: PaymentProvider;
  rajaongkir?: RajaOngkirCredentials;
  shippingProvider?: ShippingProvider;
  store: number | string;
  updatedAt?: string;
  xendit?: XenditCredentials;
}

export interface OriginAddress {
  cityId?: string;
  cityName?: string;
  postalCode?: string;
  provinceId?: string;
  provinceName?: string;
  streetAddress?: string;
  subdistrictId?: string;
  subdistrictName?: string;
  cityType?: string;
}

export interface ProvinceItem {
  province_id: number;
  province_name: string;
  provinceId?: number;
  provinceName?: string;
}

export interface CityItem {
  city_id: number;
  city_name: string;
  city_type: string;
  cityId?: number;
  cityName?: string;
  cityType?: string;
}

export interface SubdistrictItem {
  subdistrict_id: number;
  subdistrict_name: string;
  postal_code?: string | null;
  subdistrictId?: number;
  subdistrictName?: string;
  postalCode?: string | null;
}

export interface AdministrativeArea {
  cityId: number;
  cityName: string;
  cityType: string;
  id?: number | string;
  postalCode?: string | null;
  provinceId: number;
  provinceName: string;
  subdistrictId: number;
  subdistrictName: string;
}

export interface CreateAdministrativeAreasCollectionOptions {
  overrides?: Partial<CollectionConfig>;
  slug?: string;
}
export interface CreatePackagesCollectionOptions {
  overrides?: Partial<CollectionConfig>;
  slug?: string;
  storesSlug?: string;
}

export interface CreateStoreCredentialsCollectionOptions {
  overrides?: Partial<CollectionConfig>;
  secretOrResolver?: string | ((req: PayloadRequest) => string);
  slug?: string;
  storesSlug?: string;
}

export type PaymentMetadataPrimitive = boolean | number | string | null;

export type PaymentMetadataValue =
  | PaymentMetadataPrimitive
  | { [key: string]: PaymentMetadataValue }
  | PaymentMetadataValue[];

export interface MidtransPaymentMetadata {
  grossAmount?: string;
  paymentType?: string;
  provider?: "midtrans";
  settlementTime?: string;
  transactionId?: string;
}

export interface XenditPaymentMetadata {
  amount?: number;
  externalId?: string;
  invoiceId?: string;
  paidAt?: string;
  paymentChannel?: string;
  paymentMethod?: string;
  provider?: "xendit";
  status?: string;
}

export interface GenericPaymentMetadata {
  auditEvents?: Record<string, PaymentMetadataValue>[];
  feeAmount?: number;
  gatewayReference?: string;
  paidAt?: string;
  paymentChannel?: string;
  paymentMethod?: string;
  provider?: string;
  providerEventId?: string;
  settlementTime?: string;
  transactionId?: string;
}

export type PaymentMetadata =
  | GenericPaymentMetadata
  | MidtransPaymentMetadata
  | XenditPaymentMetadata
  | { [key: string]: PaymentMetadataValue };

export interface LegacyOrderRecord {
  id?: number | string;
  midtrans?: {
    grossAmount?: string | null;
    paymentType?: string | null;
    settlementTime?: string | null;
    transactionId?: string | null;
  } | null;
  orderNumber?: string;
  paymentMetadata?: PaymentMetadata | null;
  xendit?: {
    amount?: number | null;
    externalId?: string | null;
    invoiceId?: string | null;
    paidAt?: string | null;
    paymentChannel?: string | null;
    paymentMethod?: string | null;
    status?: string | null;
  } | null;
}
export interface BackfillPaymentMetadataOptions {
  batchSize?: number;
  collectionSlug?: string;
  overwrite?: boolean;
}

export interface BackfillPaymentMetadataResult {
  skipped: number;
  total: number;
  updated: number;
}
export interface CommercePluginOptions {
  enabled?: boolean;
  secret?: string | ((req: PayloadRequest) => string);
  slugs?: {
    administrativeAreas?: string;
    packages?: string;
    orders?: string;
    storeCredentials?: string;
    stores?: string;
  };
}
