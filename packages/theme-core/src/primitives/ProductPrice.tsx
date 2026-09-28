import type { HTMLAttributes, ReactElement } from "react";

import { cn } from "../utils/cn";

export interface ProductPriceProps extends HTMLAttributes<HTMLDivElement> {
  compareAtPrice?: number | null;
  compareAtPriceClassName?: string;
  currency?: string;
  formatFn?: (amount: number, currency: string, locale?: string) => string;
  locale?: string;
  price: number;
  priceClassName?: string;
}

const defaultFormatPrice = (
  amount: number,
  currency: string,
  locale?: string
): string => {
  try {
    return new Intl.NumberFormat(locale ?? "id-ID", {
      currency,
      maximumFractionDigits: currency === "IDR" ? 0 : 2,
      minimumFractionDigits: currency === "IDR" ? 0 : 2,
      style: "currency",
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
};

export const ProductPrice = ({
  className,
  compareAtPrice,
  compareAtPriceClassName,
  currency = "IDR",
  formatFn = defaultFormatPrice,
  locale = "id-ID",
  price,
  priceClassName,
  ...props
}: ProductPriceProps): ReactElement => {
  const showCompareAt =
    compareAtPrice !== null &&
    compareAtPrice !== undefined &&
    compareAtPrice > price;
  const formattedPrice = formatFn(price, currency, locale);
  const formattedCompareAt = showCompareAt
    ? formatFn(compareAtPrice, currency, locale)
    : null;

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      data-slot="product-price"
      {...props}
    >
      <span
        className={cn(priceClassName)}
        data-slot="current-price"
        data-testid="current-price"
      >
        {formattedPrice}
      </span>
      {showCompareAt && formattedCompareAt && (
        <del
          className={cn(compareAtPriceClassName)}
          data-slot="compare-at-price"
          data-testid="compare-at-price"
        >
          {formattedCompareAt}
        </del>
      )}
    </div>
  );
};
