"use client";

import type { ReactElement } from "react";
import type { ResolvedAddress } from "@repo/payload-plugin-commerce/client";

import {
  getCities,
  getProvinces,
  getSubdistricts,
} from "@/actions/administrativeAreas";
import { AddressSelector } from "@repo/payload-plugin-commerce/client";

export interface CheckoutAddressSectionProps {
  className?: string;
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

export const CheckoutAddressSection = ({
  className,
  initialValue,
  onChange,
}: CheckoutAddressSectionProps): ReactElement => (
  <section aria-labelledby="shipping-destination-heading" className={className}>
    <h2
      id="shipping-destination-heading"
      className="mb-4 text-lg font-semibold"
    >
      Shipping Destination
    </h2>
    <AddressSelector
      fetchCities={getCities}
      fetchProvinces={getProvinces}
      fetchSubdistricts={getSubdistricts}
      idPrefix="storefront-checkout"
      initialValue={initialValue}
      onChange={onChange}
    />
  </section>
);
