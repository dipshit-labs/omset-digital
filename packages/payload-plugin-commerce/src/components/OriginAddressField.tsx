"use client";

import type { ReactElement } from "react";
import type { CityItem, ProvinceItem, SubdistrictItem } from "../types";
import type { ResolvedAddress } from "./useAdministrativeAreas";

import { useField } from "@payloadcms/ui";

import { cn } from "../utils/cn";
import { AddressSelector } from "./AddressSelector";
import styles from "./OriginAddressField.module.css";

export interface OriginAddressFieldProps {
  className?: string;
  fetchCities?: (provinceId: number | string) => Promise<CityItem[]>;
  fetchProvinces?: () => Promise<ProvinceItem[]>;
  fetchSubdistricts?: (cityId: number | string) => Promise<SubdistrictItem[]>;
  path?: string;
  readOnly?: boolean;
}

const defaultFetchProvinces = async (): Promise<ProvinceItem[]> => {
  const res = await fetch("/api/administrative-areas?type=provinces");
  if (!res.ok) {
    throw new Error("Failed to load provinces");
  }
  return res.json();
};

const defaultFetchCities = async (
  provinceId: number | string
): Promise<CityItem[]> => {
  const res = await fetch(
    `/api/administrative-areas?type=cities&provinceId=${provinceId}`
  );
  if (!res.ok) {
    throw new Error("Failed to load cities");
  }
  return res.json();
};

const defaultFetchSubdistricts = async (
  cityId: number | string
): Promise<SubdistrictItem[]> => {
  const res = await fetch(
    `/api/administrative-areas?type=subdistricts&cityId=${cityId}`
  );
  if (!res.ok) {
    throw new Error("Failed to load subdistricts");
  }
  return res.json();
};

interface OriginAddressSummaryProps {
  cityName?: string;
  hasConfiguredOrigin: boolean;
  postalCode?: string;
  provinceName?: string;
  streetAddress?: string;
  subdistrictName?: string;
}

const OriginAddressSummary = ({
  cityName,
  hasConfiguredOrigin,
  postalCode,
  provinceName,
  streetAddress,
  subdistrictName,
}: OriginAddressSummaryProps): ReactElement => {
  const summaryText = hasConfiguredOrigin
    ? `Kec. ${subdistrictName}, ${cityName}, ${provinceName}${
        postalCode ? ` (${postalCode})` : ""
      }`
    : "No fulfillment origin configured. Select your province, city, and subdistrict below.";

  return (
    <div className={styles.summaryCard}>
      <span className={styles.summaryTitle}>Active Origin Location</span>
      <span
        className={
          hasConfiguredOrigin ? styles.summaryText : styles.summaryEmpty
        }
      >
        {summaryText}
      </span>
      {streetAddress ? (
        <span className={styles.summaryDescription}>{streetAddress}</span>
      ) : null}
    </div>
  );
};

interface OriginAddressFormFields {
  cityId?: string;
  cityName?: string;
  cityType?: string;
  handleAddressChange: (addr: ResolvedAddress) => void;
  hasConfiguredOrigin: boolean;
  postalCode?: string;
  provinceId?: string;
  provinceName?: string;
  streetAddress?: string;
  subdistrictId?: string;
  subdistrictName?: string;
}

const useOriginAddressFormFields = (path: string): OriginAddressFormFields => {
  const provinceIdField = useField<string>({ path: `${path}.provinceId` });
  const provinceNameField = useField<string>({ path: `${path}.provinceName` });
  const cityIdField = useField<string>({ path: `${path}.cityId` });
  const cityNameField = useField<string>({ path: `${path}.cityName` });
  const cityTypeField = useField<string>({ path: `${path}.cityType` });
  const subdistrictIdField = useField<string>({
    path: `${path}.subdistrictId`,
  });
  const subdistrictNameField = useField<string>({
    path: `${path}.subdistrictName`,
  });
  const postalCodeField = useField<string>({ path: `${path}.postalCode` });
  const streetAddressField = useField<string>({
    path: `${path}.streetAddress`,
  });

  const hasConfiguredOrigin = Boolean(
    subdistrictNameField?.value &&
    cityNameField?.value &&
    provinceNameField?.value
  );

  const handleAddressChange = (addr: ResolvedAddress): void => {
    provinceIdField?.setValue(String(addr.provinceId));
    provinceNameField?.setValue(addr.provinceName);
    cityIdField?.setValue(String(addr.cityId));
    cityNameField?.setValue(addr.cityName);
    cityTypeField?.setValue(addr.cityType ?? "");
    subdistrictIdField?.setValue(String(addr.subdistrictId));
    subdistrictNameField?.setValue(addr.subdistrictName);
    postalCodeField?.setValue(addr.postalCode);
    streetAddressField?.setValue(addr.streetAddress);
  };

  return {
    cityId: cityIdField?.value,
    cityName: cityNameField?.value,
    cityType: cityTypeField?.value,
    handleAddressChange,
    hasConfiguredOrigin,
    postalCode: postalCodeField?.value,
    provinceId: provinceIdField?.value,
    provinceName: provinceNameField?.value,
    streetAddress: streetAddressField?.value,
    subdistrictId: subdistrictIdField?.value,
    subdistrictName: subdistrictNameField?.value,
  };
};

export const OriginAddressField = ({
  className,
  fetchCities,
  fetchProvinces,
  fetchSubdistricts,
  path = "originAddress",
  readOnly = false,
}: OriginAddressFieldProps): ReactElement => {
  const formFields = useOriginAddressFormFields(path);

  return (
    <div className={cn(styles.container, className)}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Fulfillment Origin Address</h3>
          <p className={styles.sectionDescription}>
            Configure the physical fulfillment location where domestic shipments
            originate. Courier rate calculation strictly relies on these
            administrative identifiers.
          </p>
        </div>

        <OriginAddressSummary
          cityName={formFields.cityName}
          hasConfiguredOrigin={formFields.hasConfiguredOrigin}
          postalCode={formFields.postalCode}
          provinceName={formFields.provinceName}
          streetAddress={formFields.streetAddress}
          subdistrictName={formFields.subdistrictName}
        />

        <AddressSelector
          disabled={readOnly}
          fetchCities={fetchCities ?? defaultFetchCities}
          fetchProvinces={fetchProvinces ?? defaultFetchProvinces}
          fetchSubdistricts={fetchSubdistricts ?? defaultFetchSubdistricts}
          idPrefix="admin-origin-address"
          initialValue={{
            cityId: formFields.cityId,
            cityName: formFields.cityName,
            postalCode: formFields.postalCode,
            provinceId: formFields.provinceId,
            provinceName: formFields.provinceName,
            streetAddress: formFields.streetAddress,
            subdistrictId: formFields.subdistrictId,
            subdistrictName: formFields.subdistrictName,
          }}
          onChange={formFields.handleAddressChange}
          readOnly={readOnly}
          showStreetAddress={true}
        />
      </section>
    </div>
  );
};
