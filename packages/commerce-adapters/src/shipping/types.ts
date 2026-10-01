export interface ShippingItem {
  quantity?: number;
  /** Weight in grams */
  weight: number;
}

export interface ShippingPackageDimensions {
  /** Height in cm */
  height: number;
  /** Length in cm */
  length: number;
  /** Width in cm */
  width: number;
}

export interface ShippingPackageTareWeight {
  unit?: "g" | "kg";
  value: number;
}

export interface ShippingPackageInput {
  dimensions?: ShippingPackageDimensions | null;
  tareWeight?: number | ShippingPackageTareWeight | null;
}

export type RajaOngkirAccountType = "starter" | "basic" | "pro";

export interface RajaOngkirConfig {
  accountType?: RajaOngkirAccountType;
  apiKey: string;
  timeout?: number;
}

export interface CalculateShippingCostInput {
  couriers: string[] | string;
  destination: number | string;
  destinationType?: "city" | "subdistrict";
  origin: number | string;
  originType?: "city" | "subdistrict";
  weightInGrams: number;
}

export type ShippingCostQueryInput = CalculateShippingCostInput;

export interface CourierServiceCost {
  etd: string;
  note: string;
  value: number;
}

export interface CourierCostService {
  cost: CourierServiceCost[];
  description: string;
  service: string;
}

export interface CourierCostResult {
  code: string;
  costs: CourierCostService[];
  name: string;
}

export interface RajaOngkirCostResponse {
  rajaongkir: {
    destination_details?: Record<string, string | number>;
    origin_details?: Record<string, string | number>;
    query?: Record<string, string | number>;
    results: CourierCostResult[];
    status: {
      code: number;
      description: string;
    };
  };
}
