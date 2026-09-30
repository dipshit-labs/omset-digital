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
}

export interface CreateStoreCredentialsCollectionOptions {
  overrides?: Partial<CollectionConfig>;
  secretOrResolver?: string | ((req: PayloadRequest) => string);
  slug?: string;
  storesSlug?: string;
}

export interface CommercePluginOptions {
  enabled?: boolean;
  secret?: string | ((req: PayloadRequest) => string);
  slugs?: {
    storeCredentials?: string;
    stores?: string;
  };
}
