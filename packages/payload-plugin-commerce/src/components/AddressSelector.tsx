"use client";

import type { ReactElement } from "react";

import type { CityItem, ProvinceItem, SubdistrictItem } from "../types";
import { cn } from "../utils/cn";
import type { ResolvedAddress } from "./useAdministrativeAreas";
import { useAdministrativeAreas } from "./useAdministrativeAreas";

import styles from "./AddressSelector.module.css";

export interface AddressSelectorProps {
  className?: string;
  disabled?: boolean;
  fetchCities?: (provinceId: number | string) => Promise<CityItem[]>;
  fetchProvinces?: () => Promise<ProvinceItem[]>;
  fetchSubdistricts?: (cityId: number | string) => Promise<SubdistrictItem[]>;
  idPrefix?: string;
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
  readOnly?: boolean;
  showStreetAddress?: boolean;
}

interface ProvinceSelectProps {
  disabled: boolean;
  idPrefix: string;
  isLoading: boolean;
  onSelect: (val: string) => void;
  provinces: ProvinceItem[];
  selectedId: number | null;
}

const ProvinceSelect = ({
  disabled,
  idPrefix,
  isLoading,
  onSelect,
  provinces,
  selectedId,
}: ProvinceSelectProps): ReactElement => (
  <div className={styles.field}>
    <label className={styles.label} htmlFor={`${idPrefix}-province`}>
      Province {isLoading ? "(Loading...)" : ""}
    </label>
    <select
      aria-label="Province"
      className={styles.select}
      disabled={disabled || isLoading}
      id={`${idPrefix}-province`}
      onChange={(e) => {
        if (e.target.value) {
          onSelect(e.target.value);
        }
      }}
      value={selectedId ?? ""}
    >
      <option value="">Select Province</option>
      {provinces.map((prov) => (
        <option key={prov.province_id} value={prov.province_id}>
          {prov.province_name}
        </option>
      ))}
    </select>
  </div>
);

interface CitySelectProps {
  cities: CityItem[];
  disabled: boolean;
  hasProvince: boolean;
  idPrefix: string;
  isLoading: boolean;
  onSelect: (val: string) => void;
  selectedId: number | null;
}

const CitySelect = ({
  cities,
  disabled,
  hasProvince,
  idPrefix,
  isLoading,
  onSelect,
  selectedId,
}: CitySelectProps): ReactElement => (
  <div className={styles.field}>
    <label className={styles.label} htmlFor={`${idPrefix}-city`}>
      City / Regency {isLoading ? "(Loading...)" : ""}
    </label>
    <select
      aria-label="City or Regency"
      className={styles.select}
      disabled={disabled || !hasProvince || isLoading}
      id={`${idPrefix}-city`}
      onChange={(e) => {
        if (e.target.value) {
          onSelect(e.target.value);
        }
      }}
      value={selectedId ?? ""}
    >
      <option value="">
        {hasProvince ? "Select City / Regency" : "Choose province first"}
      </option>
      {cities.map((city) => (
        <option key={city.city_id} value={city.city_id}>
          {city.city_type} {city.city_name}
        </option>
      ))}
    </select>
  </div>
);

interface SubdistrictSelectProps {
  disabled: boolean;
  hasCity: boolean;
  idPrefix: string;
  isLoading: boolean;
  onSelect: (val: string) => void;
  selectedId: number | null;
  subdistricts: SubdistrictItem[];
}

const SubdistrictSelect = ({
  disabled,
  hasCity,
  idPrefix,
  isLoading,
  onSelect,
  selectedId,
  subdistricts,
}: SubdistrictSelectProps): ReactElement => (
  <div className={styles.field}>
    <label className={styles.label} htmlFor={`${idPrefix}-subdistrict`}>
      Subdistrict (Kecamatan) {isLoading ? "(Loading...)" : ""}
    </label>
    <select
      aria-label="Subdistrict"
      className={styles.select}
      disabled={disabled || !hasCity || isLoading}
      id={`${idPrefix}-subdistrict`}
      onChange={(e) => {
        if (e.target.value) {
          onSelect(e.target.value);
        }
      }}
      value={selectedId ?? ""}
    >
      <option value="">
        {hasCity ? "Select Subdistrict" : "Choose city first"}
      </option>
      {subdistricts.map((sub) => (
        <option key={sub.subdistrict_id} value={sub.subdistrict_id}>
          {sub.subdistrict_name}
        </option>
      ))}
    </select>
  </div>
);

export const AddressSelector = ({
  className,
  disabled = false,
  fetchCities,
  fetchProvinces,
  fetchSubdistricts,
  idPrefix = "checkout-address",
  initialValue,
  onChange,
  readOnly = false,
  showStreetAddress = true,
}: AddressSelectorProps): ReactElement => {
  const {
    cities,
    error,
    isLoadingCities,
    isLoadingProvinces,
    isLoadingSubdistricts,
    postalCode,
    provinces,
    selectCity,
    selectedCityId,
    selectedProvinceId,
    selectedSubdistrictId,
    selectProvince,
    selectSubdistrict,
    setPostalCode,
    setStreetAddress,
    streetAddress,
    subdistricts,
  } = useAdministrativeAreas({
    fetchCities,
    fetchProvinces,
    fetchSubdistricts,
    initialValue,
    onChange,
  });

  const isFormDisabled = disabled || readOnly;

  return (
    <div className={cn(styles.container, className)}>
      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.row}>
        <ProvinceSelect
          disabled={isFormDisabled}
          idPrefix={idPrefix}
          isLoading={isLoadingProvinces}
          onSelect={(val) => {
            void selectProvince(val);
          }}
          provinces={provinces}
          selectedId={selectedProvinceId}
        />
        <CitySelect
          cities={cities}
          disabled={isFormDisabled}
          hasProvince={selectedProvinceId !== null}
          idPrefix={idPrefix}
          isLoading={isLoadingCities}
          onSelect={(val) => {
            void selectCity(val);
          }}
          selectedId={selectedCityId}
        />
      </div>

      <div className={styles.row}>
        <SubdistrictSelect
          disabled={isFormDisabled}
          hasCity={selectedCityId !== null}
          idPrefix={idPrefix}
          isLoading={isLoadingSubdistricts}
          onSelect={selectSubdistrict}
          selectedId={selectedSubdistrictId}
          subdistricts={subdistricts}
        />

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${idPrefix}-postalCode`}>
            Postal Code
          </label>
          <input
            aria-label="Postal Code"
            className={styles.input}
            disabled={isFormDisabled}
            id={`${idPrefix}-postalCode`}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="e.g. 55715"
            type="text"
            value={postalCode}
          />
        </div>
      </div>

      {showStreetAddress ? (
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${idPrefix}-streetAddress`}>
            Street Address
          </label>
          <textarea
            aria-label="Street Address"
            className={styles.textarea}
            disabled={isFormDisabled}
            id={`${idPrefix}-streetAddress`}
            onChange={(e) => setStreetAddress(e.target.value)}
            placeholder="Street name, building, apartment, RT/RW, or landmark"
            rows={3}
            value={streetAddress}
          />
        </div>
      ) : null}
    </div>
  );
};
