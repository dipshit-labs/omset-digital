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
export interface CommercePluginOptions {
  enabled?: boolean;
  secret?: string | ((req: PayloadRequest) => string);
  slugs?: {
    administrativeAreas?: string;
    packages?: string;
    storeCredentials?: string;
    stores?: string;
  };
}
