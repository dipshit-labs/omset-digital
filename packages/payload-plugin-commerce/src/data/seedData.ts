import {
  RAW_CITIES,
  RAW_PROVINCES,
  RAW_SUBDISTRICTS,
} from "./rawAdministrativeData";

export interface AdministrativeAreaSeedRecord {
  city_id: number;
  city_name: string;
  city_type: string;
  postal_code: string;
  province_id: number;
  province_name: string;
  subdistrict_id: number;
  subdistrict_name: string;
}

let cachedSeedData: AdministrativeAreaSeedRecord[] | null = null;

export const getAdministrativeAreasSeedData =
  (): AdministrativeAreaSeedRecord[] => {
    if (cachedSeedData) {
      return cachedSeedData;
    }

    const provinceMap = new Map<number, string>();
    for (const [provinceId, provinceName] of RAW_PROVINCES) {
      provinceMap.set(provinceId, provinceName);
    }

    const cityMap = new Map<
      number,
      {
        cityName: string;
        cityType: string;
        postalCode: string;
        provinceId: number;
      }
    >();
    for (const [
      cityId,
      provinceId,
      cityName,
      cityType,
      postalCode,
    ] of RAW_CITIES) {
      cityMap.set(cityId, {
        cityName,
        cityType,
        postalCode,
        provinceId,
      });
    }

    const records: AdministrativeAreaSeedRecord[] = [];
    for (const [subdistrictId, cityId, subdistrictName] of RAW_SUBDISTRICTS) {
      const city = cityMap.get(cityId);
      if (!city) {
        continue;
      }
      const provinceName = provinceMap.get(city.provinceId) ?? "";

      records.push({
        city_id: cityId,
        city_name: city.cityName,
        city_type: city.cityType,
        postal_code: city.postalCode,
        province_id: city.provinceId,
        province_name: provinceName,
        subdistrict_id: subdistrictId,
        subdistrict_name: subdistrictName,
      });
    }

    cachedSeedData = records;
    return records;
  };
