"use client";

import type { CityItem, ProvinceItem, SubdistrictItem } from "../types";

import { useCallback, useEffect, useState } from "react";

export interface ResolvedAddress {
  cityId: number;
  cityName: string;
  cityType: string;
  postalCode: string;
  provinceId: number;
  provinceName: string;
  streetAddress: string;
  subdistrictId: number;
  subdistrictName: string;
}

export interface UseAdministrativeAreasOptions {
  fetchCities?: (provinceId: number | string) => Promise<CityItem[]>;
  fetchProvinces?: () => Promise<ProvinceItem[]>;
  fetchSubdistricts?: (cityId: number | string) => Promise<SubdistrictItem[]>;
  initialValue?: {
    cityId?: number | string | null;
    cityName?: string | null;
    cityType?: string | null;
    postalCode?: string | null;
    provinceId?: number | string | null;
    provinceName?: string | null;
    streetAddress?: string | null;
    subdistrictId?: number | string | null;
    subdistrictName?: string | null;
  };
  onChange?: (address: ResolvedAddress) => void;
}

export interface UseAdministrativeAreasReturn {
  cities: CityItem[];
  error: string | null;
  isLoadingCities: boolean;
  isLoadingProvinces: boolean;
  isLoadingSubdistricts: boolean;
  postalCode: string;
  provinces: ProvinceItem[];
  selectedCityId: number | null;
  selectedCityName: string;
  selectedCityType: string;
  selectedProvinceId: number | null;
  selectedProvinceName: string;
  selectedSubdistrictId: number | null;
  selectedSubdistrictName: string;
  selectCity: (cityId: number | string) => Promise<void>;
  selectProvince: (provinceId: number | string) => Promise<void>;
  selectSubdistrict: (subdistrictId: number | string) => void;
  setPostalCode: (postalCode: string) => void;
  setStreetAddress: (streetAddress: string) => void;
  streetAddress: string;
  subdistricts: SubdistrictItem[];
}

export const useAdministrativeAreas = (
  options: UseAdministrativeAreasOptions = {}
): UseAdministrativeAreasReturn => {
  const {
    fetchCities,
    fetchProvinces,
    fetchSubdistricts,
    initialValue,
    onChange,
  } = options;

  const [provinces, setProvinces] = useState<ProvinceItem[]>([]);
  const [cities, setCities] = useState<CityItem[]>([]);
  const [subdistricts, setSubdistricts] = useState<SubdistrictItem[]>([]);

  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(
    initialValue?.provinceId ? Number(initialValue.provinceId) : null
  );
  const [selectedProvinceName, setSelectedProvinceName] = useState<string>(
    initialValue?.provinceName ?? ""
  );

  const [selectedCityId, setSelectedCityId] = useState<number | null>(
    initialValue?.cityId ? Number(initialValue.cityId) : null
  );
  const [selectedCityName, setSelectedCityName] = useState<string>(
    initialValue?.cityName ?? ""
  );
  const [selectedCityType, setSelectedCityType] = useState<string>(
    initialValue?.cityType ?? ""
  );

  const [selectedSubdistrictId, setSelectedSubdistrictId] = useState<
    number | null
  >(initialValue?.subdistrictId ? Number(initialValue.subdistrictId) : null);
  const [selectedSubdistrictName, setSelectedSubdistrictName] =
    useState<string>(initialValue?.subdistrictName ?? "");

  const [postalCode, setPostalCode] = useState<string>(
    initialValue?.postalCode ?? ""
  );
  const [streetAddress, setStreetAddress] = useState<string>(
    initialValue?.streetAddress ?? ""
  );

  const [isLoadingProvinces, setIsLoadingProvinces] = useState<boolean>(false);
  const [isLoadingCities, setIsLoadingCities] = useState<boolean>(false);
  const [isLoadingSubdistricts, setIsLoadingSubdistricts] =
    useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load provinces on mount
  useEffect(() => {
    let mounted = true;
    if (!fetchProvinces) {
      return () => {
        mounted = false;
      };
    }

    const loadProvinces = async (): Promise<void> => {
      try {
        const data = await fetchProvinces();
        if (mounted) {
          setProvinces(data);
          setError(null);
        }
      } catch (loadError: unknown) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load provinces"
          );
        }
      }
      if (mounted) {
        setIsLoadingProvinces(false);
      }
    };
    void loadProvinces();

    return () => {
      mounted = false;
    };
  }, [fetchProvinces]);

  const selectProvince = useCallback(
    async (provinceId: number | string): Promise<void> => {
      const numId = Number(provinceId);
      const found = provinces.find((p) => p.province_id === numId);
      const name = found?.province_name ?? "";

      setSelectedProvinceId(numId);
      setSelectedProvinceName(name);

      setSelectedCityId(null);
      setSelectedCityName("");
      setSelectedCityType("");
      setCities([]);

      setSelectedSubdistrictId(null);
      setSelectedSubdistrictName("");
      setSubdistricts([]);

      if (!fetchCities) {
        return;
      }

      setIsLoadingCities(true);
      try {
        const loadedCities = await fetchCities(numId);
        setCities(loadedCities);
        setError(null);
      } catch (cityError: unknown) {
        setError(
          cityError instanceof Error
            ? cityError.message
            : "Failed to load cities"
        );
      }
      setIsLoadingCities(false);
    },
    [fetchCities, provinces]
  );

  const selectCity = useCallback(
    async (cityId: number | string): Promise<void> => {
      const numId = Number(cityId);
      const found = cities.find((c) => c.city_id === numId);
      const name = found?.city_name ?? "";
      const type = found?.city_type ?? "";

      setSelectedCityId(numId);
      setSelectedCityName(name);
      setSelectedCityType(type);

      setSelectedSubdistrictId(null);
      setSelectedSubdistrictName("");
      setSubdistricts([]);

      if (!fetchSubdistricts) {
        return;
      }

      setIsLoadingSubdistricts(true);
      try {
        const loadedSubdistricts = await fetchSubdistricts(numId);
        setSubdistricts(loadedSubdistricts);
        setError(null);
      } catch (subdistrictError: unknown) {
        setError(
          subdistrictError instanceof Error
            ? subdistrictError.message
            : "Failed to load subdistricts"
        );
      }
      setIsLoadingSubdistricts(false);
    },
    [cities, fetchSubdistricts]
  );

  const triggerChange = useCallback(
    (overrides: Partial<ResolvedAddress>): void => {
      if (!onChange) {
        return;
      }
      onChange({
        cityId: overrides.cityId ?? selectedCityId ?? 0,
        cityName: overrides.cityName ?? selectedCityName,
        cityType: overrides.cityType ?? selectedCityType,
        postalCode: overrides.postalCode ?? postalCode,
        provinceId: overrides.provinceId ?? selectedProvinceId ?? 0,
        provinceName: overrides.provinceName ?? selectedProvinceName,
        streetAddress: overrides.streetAddress ?? streetAddress,
        subdistrictId: overrides.subdistrictId ?? selectedSubdistrictId ?? 0,
        subdistrictName: overrides.subdistrictName ?? selectedSubdistrictName,
      });
    },
    [
      onChange,
      postalCode,
      selectedCityId,
      selectedCityName,
      selectedCityType,
      selectedProvinceId,
      selectedProvinceName,
      selectedSubdistrictId,
      selectedSubdistrictName,
      streetAddress,
    ]
  );

  const selectSubdistrict = useCallback(
    (subdistrictId: number | string): void => {
      const numId = Number(subdistrictId);
      const found = subdistricts.find((s) => s.subdistrict_id === numId);
      const name = found?.subdistrict_name ?? "";
      const postCode = found?.postal_code ?? postalCode;

      setSelectedSubdistrictId(numId);
      setSelectedSubdistrictName(name);
      if (postCode) {
        setPostalCode(postCode);
      }

      triggerChange({
        postalCode: postCode,
        subdistrictId: numId,
        subdistrictName: name,
      });
    },
    [postalCode, subdistricts, triggerChange]
  );

  const handleSetPostalCode = useCallback(
    (code: string): void => {
      setPostalCode(code);
      triggerChange({ postalCode: code });
    },
    [triggerChange]
  );

  const handleSetStreetAddress = useCallback(
    (address: string): void => {
      setStreetAddress(address);
      triggerChange({ streetAddress: address });
    },
    [triggerChange]
  );

  return {
    cities,
    error,
    isLoadingCities,
    isLoadingProvinces,
    isLoadingSubdistricts,
    postalCode,
    provinces,
    selectCity,
    selectedCityId,
    selectedCityName,
    selectedCityType,
    selectedProvinceId,
    selectedProvinceName,
    selectedSubdistrictId,
    selectedSubdistrictName,
    selectProvince,
    selectSubdistrict,
    setPostalCode: handleSetPostalCode,
    setStreetAddress: handleSetStreetAddress,
    streetAddress,
    subdistricts,
  };
};
