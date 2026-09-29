// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import { ProductPrice } from "./ProductPrice";

describe("ProductPrice primitive", () => {
  afterEach(() => {
    cleanup();
  });

  it("formats standard price with default currency", () => {
    render(<ProductPrice price={150_000} />);
    const currentPrice = screen.getByTestId("current-price");
    expect(currentPrice).toBeDefined();
    // In IDR, 150000 formats with Rp and 150.000 or similar
    expect(currentPrice.textContent).toMatch(/150/u);
    expect(screen.queryByTestId("compare-at-price")).toBeNull();
  });

  it("renders compare-at price with del element when compareAtPrice > price", () => {
    render(<ProductPrice compareAtPrice={200_000} price={150_000} />);

    const currentPrice = screen.getByTestId("current-price");
    const comparePrice = screen.getByTestId("compare-at-price");

    expect(currentPrice).toBeDefined();
    expect(comparePrice).toBeDefined();
    expect(comparePrice.tagName).toBe("DEL");
    expect(comparePrice.textContent).toMatch(/200/u);
    expect(currentPrice.textContent).toMatch(/150/u);
  });

  it("does not render compare-at price when compareAtPrice <= price", () => {
    render(<ProductPrice compareAtPrice={150_000} price={150_000} />);
    expect(screen.queryByTestId("compare-at-price")).toBeNull();
  });

  it("supports custom currency and locale", () => {
    render(
      <ProductPrice
        compareAtPrice={35}
        currency="USD"
        locale="en-US"
        price={25}
      />
    );

    const currentPrice = screen.getByTestId("current-price");
    const comparePrice = screen.getByTestId("compare-at-price");

    expect(currentPrice.textContent).toContain("$25.00");
    expect(comparePrice.textContent).toContain("$35.00");
  });

  it("supports custom formatFn", () => {
    render(
      <ProductPrice
        formatFn={(val: number, cur: string) => `${cur} ${val / 1000}k`}
        price={50_000}
      />
    );

    const currentPrice = screen.getByTestId("current-price");
    expect(currentPrice.textContent).toBe("IDR 50k");
  });
});
