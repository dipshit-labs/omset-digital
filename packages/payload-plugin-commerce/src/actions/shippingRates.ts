import type { CollectionSlug, Payload, Where } from "payload";
import type { ShippingRateCache } from "./shippingRateCache";
import type { CourierCostResult } from "@repo/commerce-adapters/shipping";

import {
  calculateBillableWeight,
  RajaOngkirClient,
} from "@repo/commerce-adapters/shipping";
import { decryptCredential, isCiphertext } from "@repo/commerce-adapters/utils";
import {
  DEFAULT_RATE_CACHE_TTL_SECONDS,
  generateRateCacheKey,
  resolveWeightTier,
} from "./shippingRateCache";

export interface ShippingRateItemInput {
  price?: number;
  quantity?: number;
  variantId?: number | string;
  weight: number;
}

export interface CustomerDestinationInput {
  cityId: number | string;
  subdistrictId?: number | string;
}

export interface GetShippingRatesInput {
  couriers?: string[];
  customerDestination: CustomerDestinationInput;
  items: ShippingRateItemInput[];
  packageId?: number | string;
  storeId?: number | string;
  storeSlug?: string;
}

export interface FormattedShippingRateOption {
  cost: number;
  courierCode: string;
  courierName: string;
  description: string;
  etd: string;
  formattedCost: string;
  service: string;
}

export interface GetShippingRatesResult {
  billableWeight: number;
  cached: boolean;
  error?: string;
  rates: FormattedShippingRateOption[];
  success: boolean;
}

interface StoreOriginAddress {
  cityId?: number | string;
  subdistrictId?: number | string;
}

interface StoreRecord {
  activeShippingProvider?: string;
  id: number | string;
  originAddress?: StoreOriginAddress;
  slug?: string;
}

interface StoreCredentialsRecord {
  rajaongkir?: {
    accountType?: "basic" | "pro" | "starter";
    apiKey?: string;
  };
}

interface PackageRecord {
  dimensions?: {
    height: number;
    length: number;
    width: number;
  };
  tareWeight?: number | { unit?: "g" | "kg"; value: number };
}

interface ResolvedCoordinates {
  destId: number | string;
  destinationType?: "city" | "subdistrict";
  originId: number | string;
  originType?: "city" | "subdistrict";
}

/**
 * Formats a numeric currency value in Indonesian Rupiah (IDR).
 * Example: 18000 -> "Rp 18.000"
 */
export const formatIdr = (amount: number): string =>
  `Rp ${amount.toLocaleString("id-ID")}`;
/**
 * Normalizes estimated delivery time string into user-friendly text.
 * Example: "1-2" -> "1-2 days", "1" -> "1 day"
 */
export const formatEstimatedDays = (etd?: string): string => {
  if (!etd || !etd.trim()) {
    return "Estimated time unavailable";
  }

  const clean = etd
    .trim()
    .replace(/\s*hari\s*/iu, "")
    .replace(/\s*days?\s*/iu, "");
  if (clean === "1") {
    return "1 day";
  }
  return `${clean} days`;
};

/**
 * Flattens nested courier and service cost arrays into a standard list of rate options.
 */
export const formatCourierCostResults = (
  results: CourierCostResult[]
): FormattedShippingRateOption[] => {
  const options: FormattedShippingRateOption[] = [];

  for (const courier of results) {
    for (const serviceItem of courier.costs) {
      for (const costDetail of serviceItem.cost) {
        options.push({
          cost: costDetail.value,
          courierCode: courier.code.toLowerCase(),
          courierName: courier.name,
          description: serviceItem.description,
          etd: costDetail.etd,
          formattedCost: formatIdr(costDetail.value),
          service: serviceItem.service,
        });
      }
    }
  }

  return options;
};

const resolveStore = async (
  payload: Payload | ShippingRatesPayloadClient,
  storeSlug?: string,
  storeId?: number | string
): Promise<{ error?: string; store?: StoreRecord }> => {
  if (!storeId && !storeSlug) {
    return { error: "Store identifier (storeId or storeSlug) is required" };
  }

  const storeQuery: Where = storeSlug
    ? { slug: { equals: storeSlug } }
    : { id: { equals: storeId } };

  // SAFETY: Stores collection query returns matching store documents conforming to StoreRecord.
  const storeResult = (await payload.find({
    collection: "stores" as CollectionSlug,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: storeQuery,
  })) as { docs: StoreRecord[] };
  const [store] = storeResult.docs;
  if (!store) {
    return { error: "Store not found" };
  }

  if (store.activeShippingProvider !== "rajaongkir") {
    return { error: "Shipping is not enabled for this store" };
  }

  const { originAddress } = store;
  if (
    !originAddress ||
    (!originAddress.cityId && !originAddress.subdistrictId)
  ) {
    return { error: "Store fulfillment origin address is not configured" };
  }

  return { store };
};

const resolveCredentials = async (
  payload: Payload | ShippingRatesPayloadClient,
  storeId: number | string,
  secret?: string
): Promise<{
  accountType?: "basic" | "pro" | "starter";
  apiKey?: string;
  error?: string;
}> => {
  // SAFETY: StoreCredentials collection query returns matching credentials conforming to StoreCredentialsRecord.
  const credentialsResult = (await payload.find({
    collection: "storeCredentials" as CollectionSlug,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { store: { equals: storeId } } as Where,
  })) as { docs: StoreCredentialsRecord[] };

  const [credentialsDoc] = credentialsResult.docs;
  const rajaongkirConfig = credentialsDoc?.rajaongkir;
  if (!rajaongkirConfig?.apiKey) {
    return {
      error: "RajaOngkir credentials are not configured for this store",
    };
  }

  const apiKey = isCiphertext(rajaongkirConfig.apiKey)
    ? decryptCredential(rajaongkirConfig.apiKey, secret ?? "")
    : rajaongkirConfig.apiKey;

  return {
    accountType: rajaongkirConfig.accountType ?? "starter",
    apiKey,
  };
};

const resolvePackageDoc = async (
  payload: Payload | ShippingRatesPayloadClient,
  storeId: number | string,
  packageId?: number | string
): Promise<PackageRecord | null> => {
  if (packageId) {
    // SAFETY: Packages collection query returns matching package documents conforming to PackageRecord.
    const pkgResult = (await payload.find({
      collection: "packages" as CollectionSlug,
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: {
        and: [{ id: { equals: packageId } }, { store: { equals: storeId } }],
      } as Where,
    })) as { docs: PackageRecord[] };

    const [pkg] = pkgResult.docs;
    if (pkg) {
      return pkg;
    }
  }

  // SAFETY: Packages collection query for default package returns matching document conforming to PackageRecord.
  const defaultPkgResult = (await payload.find({
    collection: "packages" as CollectionSlug,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: {
      and: [{ store: { equals: storeId } }, { isDefault: { equals: true } }],
    } as Where,
  })) as { docs: PackageRecord[] };

  const [defaultPkg] = defaultPkgResult.docs;
  return defaultPkg ?? null;
};

const resolveOriginAndDestination = (
  originAddress: StoreOriginAddress,
  customerDestination: CustomerDestinationInput,
  isPro: boolean
): ResolvedCoordinates => {
  if (isPro) {
    const originId = originAddress.subdistrictId ?? originAddress.cityId ?? 0;
    const originType = originAddress.subdistrictId ? "subdistrict" : "city";
    const destId =
      customerDestination.subdistrictId ?? customerDestination.cityId;
    const destinationType = customerDestination.subdistrictId
      ? "subdistrict"
      : "city";
    return { destId, destinationType, originId, originType };
  }

  const originId = originAddress.cityId ?? 0;
  const destId = customerDestination.cityId;
  return { destId, originId };
};

export interface ShippingRatesPayloadClient {
  find: (args: {
    collection: string;
    depth?: number;
    limit?: number;
    overrideAccess?: boolean;
    where?: unknown;
  }) => Promise<{ docs: unknown[] }>;
}

export interface CalculateShippingRatesParams {
  cache?: ShippingRateCache;
  input: GetShippingRatesInput;
  payload: Payload | ShippingRatesPayloadClient;
  secret?: string;
  ttlSeconds?: number;
}

/**
 * Calculates shipping quotes using merchant fulfillment origin and customer destination.
 * Checks and populates Redis/cache using deterministic sha256 cache keys.
 */
export const calculateShippingRates = async ({
  cache,
  input,
  payload,
  secret,
  ttlSeconds = DEFAULT_RATE_CACHE_TTL_SECONDS,
}: CalculateShippingRatesParams): Promise<GetShippingRatesResult> => {
  const { customerDestination, items, packageId, storeId, storeSlug } = input;

  // 1. Resolve store & origin address
  const { error: storeError, store } = await resolveStore(
    payload,
    storeSlug,
    storeId
  );
  if (storeError || !store || !store.originAddress) {
    return {
      billableWeight: 0,
      cached: false,
      error: storeError,
      rates: [],
      success: false,
    };
  }

  // 2. Resolve credentials
  const {
    accountType = "starter",
    apiKey,
    error: credsError,
  } = await resolveCredentials(payload, store.id, secret);
  if (credsError || !apiKey) {
    return {
      billableWeight: 0,
      cached: false,
      error: credsError,
      rates: [],
      success: false,
    };
  }

  // 3. Resolve package and calculate billable weight
  const packageDoc = await resolvePackageDoc(payload, store.id, packageId);
  const billableWeight = calculateBillableWeight(items, packageDoc);

  // 4. Resolve geographic coordinates and types
  const isPro = accountType === "pro";
  const { destId, destinationType, originId, originType } =
    resolveOriginAndDestination(
      store.originAddress,
      customerDestination,
      isPro
    );

  const couriers =
    input.couriers && input.couriers.length > 0
      ? input.couriers
      : ["jne", "pos", "tiki"];

  // 5. Check cache
  const weightTier = resolveWeightTier(billableWeight);
  const cacheKey = generateRateCacheKey({
    couriers,
    destId,
    originId,
    weightTier,
  });

  if (cache) {
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      try {
        // SAFETY: Parsed JSON cache payload matches FormattedShippingRateOption array schema.
        const rates = JSON.parse(cachedData) as FormattedShippingRateOption[];
        return {
          billableWeight,
          cached: true,
          rates,
          success: true,
        };
      } catch {
        // Fall back to live query if cache read failed
      }
    }
  }

  // 6. Query RajaOngkir
  try {
    const client = new RajaOngkirClient({
      accountType,
      apiKey,
    });

    const costResults = await client.calculateCost({
      couriers,
      destination: destId,
      destinationType,
      origin: originId,
      originType,
      weightInGrams: billableWeight,
    });

    const formattedRates = formatCourierCostResults(costResults);

    if (cache && formattedRates.length > 0) {
      await cache.set(cacheKey, JSON.stringify(formattedRates), ttlSeconds);
    }

    return {
      billableWeight,
      cached: false,
      rates: formattedRates,
      success: true,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to calculate shipping rates";
    return {
      billableWeight,
      cached: false,
      error: message,
      rates: [],
      success: false,
    };
  }
};
