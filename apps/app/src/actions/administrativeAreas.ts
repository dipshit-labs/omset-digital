"use server";

import config from "@payload-config";
import {
  getCities as getCitiesQuery,
  getProvinces as getProvincesQuery,
  getSubdistricts as getSubdistrictsQuery,
} from "@repo/payload-plugin-commerce/actions";
import type {
  CityItem,
  ProvinceItem,
  SubdistrictItem,
} from "@repo/payload-plugin-commerce/types";
import { getPayload } from "payload";

export interface AdministrativeAreasPayloadClient {
  db: {
    drizzle: {
      execute: (q: unknown) => Promise<unknown>;
    };
  };
}

export interface AdministrativeAreasActions {
  getCities: (provinceId: number | string) => Promise<CityItem[]>;
  getProvinces: () => Promise<ProvinceItem[]>;
  getSubdistricts: (cityId: number | string) => Promise<SubdistrictItem[]>;
}

export const createAdministrativeAreasActions = (
  getPayloadClient: () => Promise<AdministrativeAreasPayloadClient>
): AdministrativeAreasActions => ({
  getCities: async (provinceId: number | string): Promise<CityItem[]> => {
    const payload = await getPayloadClient();
    return getCitiesQuery(provinceId, payload);
  },
  getProvinces: async (): Promise<ProvinceItem[]> => {
    const payload = await getPayloadClient();
    return getProvincesQuery(payload);
  },
  getSubdistricts: async (
    cityId: number | string
  ): Promise<SubdistrictItem[]> => {
    const payload = await getPayloadClient();
    return getSubdistrictsQuery(cityId, payload);
  },
});

const defaultActions = createAdministrativeAreasActions(async () => {
  const payload = await getPayload({ config });
  // SAFETY: postgresAdapter mounts drizzle instance on payload.db.
  const dbHolder = payload.db as {
    drizzle: { execute: (q: unknown) => Promise<unknown> };
  };

  return {
    db: {
      drizzle: dbHolder.drizzle,
    },
  };
});

export const { getProvinces } = defaultActions;
export const { getCities } = defaultActions;
export const { getSubdistricts } = defaultActions;
