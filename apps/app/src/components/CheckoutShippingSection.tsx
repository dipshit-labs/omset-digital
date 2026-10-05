"use client";

import type { ReactElement } from "react";
import type {
  CustomerDestinationInput,
  FormattedShippingRateOption,
  GetShippingRatesInput,
  GetShippingRatesResult,
  ShippingRateItemInput,
} from "@repo/payload-plugin-commerce/actions";

import { useEffect, useState } from "react";

import { formatEstimatedDays } from "@repo/payload-plugin-commerce/actions";
import { cn } from "@repo/theme-core/utils";

export type { FormattedShippingRateOption } from "@repo/payload-plugin-commerce/actions";

export interface CheckoutShippingSectionProps {
  className?: string;
  couriers?: string[];
  customerDestination?: CustomerDestinationInput | null;
  error?: string | null;
  fetchRates?: (
    input: GetShippingRatesInput
  ) => Promise<GetShippingRatesResult>;
  idPrefix?: string;
  isLoading?: boolean;
  items?: ShippingRateItemInput[];
  onSelectRate?: (rate: FormattedShippingRateOption) => void;
  rates?: FormattedShippingRateOption[];
  selectedRate?: FormattedShippingRateOption | null;
  storeSlug?: string;
}

export const CheckoutShippingSection = ({
  className,
  couriers,
  customerDestination,
  error: errorProp,
  fetchRates,
  idPrefix = "checkout-shipping",
  isLoading: isLoadingProp = false,
  items,
  onSelectRate,
  rates: ratesProp,
  selectedRate,
  storeSlug,
}: CheckoutShippingSectionProps): ReactElement => {
  const [fetchedRates, setFetchedRates] = useState<
    FormattedShippingRateOption[]
  >([]);
  const [internalLoading, setInternalLoading] = useState<boolean>(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(
    selectedRate ? `${selectedRate.courierCode}-${selectedRate.service}` : null
  );

  const rates = ratesProp ?? fetchedRates;
  const isLoading = isLoadingProp || internalLoading;
  const error = errorProp ?? internalError;
  const effectiveSelectedKey = selectedRate
    ? `${selectedRate.courierCode}-${selectedRate.service}`
    : selectedKey;

  // Query shipping rates when fetchRates and customerDestination are provided
  useEffect(() => {
    if (!fetchRates || !customerDestination?.cityId) {
      return;
    }

    let isMounted = true;
    const loadRates = async () => {
      setInternalLoading(true);
      setInternalError(null);

      try {
        const res = await fetchRates({
          couriers,
          customerDestination,
          items: items ?? [],
          storeSlug,
        });

        if (!isMounted) {
          return;
        }

        if (res.success) {
          setFetchedRates(res.rates);
        } else {
          setInternalError(res.error ?? "Failed to fetch shipping rates");
          setFetchedRates([]);
        }
        setInternalLoading(false);
      } catch (fetchError: unknown) {
        if (!isMounted) {
          return;
        }
        const msg =
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to fetch shipping rates";
        setInternalError(msg);
        setFetchedRates([]);
        setInternalLoading(false);
      }
    };

    void loadRates();

    return () => {
      isMounted = false;
    };
  }, [fetchRates, customerDestination, couriers, items, storeSlug]);

  const handleSelect = (rate: FormattedShippingRateOption) => {
    const key = `${rate.courierCode}-${rate.service}`;
    setSelectedKey(key);
    onSelectRate?.(rate);
  };

  return (
    <section aria-labelledby={`${idPrefix}-heading`} className={className}>
      <h2 id={`${idPrefix}-heading`} className="mb-4 text-lg font-semibold">
        Shipping Options
      </h2>

      {isLoading && (
        <output
          aria-live="polite"
          className="border-border text-muted-foreground block animate-pulse rounded-md border p-4 text-center text-sm"
        >
          Calculating shipping rates...
        </output>
      )}

      {!isLoading && error && (
        <div
          role="alert"
          className="border-error bg-surface text-error rounded-md border p-4 text-sm"
        >
          {error}
        </div>
      )}

      {!isLoading && !error && rates.length === 0 && (
        <div className="border-border text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
          No shipping options available for this destination.
        </div>
      )}

      {!isLoading && !error && rates.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="sr-only">
            Choose a shipping courier and service
          </legend>
          {rates.map((rate) => {
            const rateKey = `${rate.courierCode}-${rate.service}`;
            const inputId = `${idPrefix}-${rateKey}`;
            const isChecked = effectiveSelectedKey === rateKey;

            return (
              <label
                key={rateKey}
                htmlFor={inputId}
                className={cn(
                  "border-border hover:bg-muted/50 flex cursor-pointer items-start justify-between rounded-lg border p-4 transition-colors",
                  isChecked && "border-primary bg-primary/5 ring-primary ring-1"
                )}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    id={inputId}
                    name={`${idPrefix}-radio`}
                    value={rateKey}
                    checked={isChecked}
                    aria-label={`${rate.courierName} ${rate.service}`}
                    onChange={() => handleSelect(rate)}
                    className="text-primary focus:ring-primary mt-1 h-4 w-4"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-semibold">
                        {rate.courierName}
                      </span>
                      <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs font-medium uppercase">
                        {rate.service}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {rate.description}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Est. {formatEstimatedDays(rate.etd)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-foreground font-semibold">
                    {rate.formattedCost}
                  </span>
                </div>
              </label>
            );
          })}
        </fieldset>
      )}
    </section>
  );
};
