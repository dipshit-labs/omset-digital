import { describe, expect, it } from "vitest";

import { calculateBillableWeight } from "./volumetric";

describe(calculateBillableWeight, () => {
  it("calculates billable weight based on physical weight when it exceeds volumetric weight", () => {
    // Total item weight: 600g + 600g = 1200g
    const items = [
      { quantity: 1, weight: 600 },
      { quantity: 2, weight: 300 },
    ];
    // 500 cm^3 -> volumetric 500 / 6 = 83.3g; physical = 1250g
    const pkg = {
      dimensions: { height: 5, length: 10, width: 10 },
      tareWeight: { unit: "g" as const, value: 50 },
    };

    const result = calculateBillableWeight(items, pkg);

    expect(result).toBe(1250);
  });

  it("calculates billable weight based on volumetric formula when volume exceeds physical weight", () => {
    // 30 cm x 20 cm x 10 cm = 6,000 cm^3 -> 1,000 grams
    // Physical weight: 250g, Volumetric weight: 1000g
    const items = [{ quantity: 1, weight: 200 }];
    const pkg = {
      dimensions: { height: 10, length: 30, width: 20 },
      tareWeight: { unit: "g" as const, value: 50 },
    };

    const result = calculateBillableWeight(items, pkg);

    expect(result).toBe(1000);
  });

  it("converts package tare weight from kilograms to grams correctly", () => {
    // 1000 cm^3 -> 166.7g; physical tare: 250g; total physical: 750g
    const items = [{ quantity: 1, weight: 500 }];
    const pkg = {
      dimensions: { height: 10, length: 10, width: 10 },
      tareWeight: { unit: "kg" as const, value: 0.25 },
    };

    const result = calculateBillableWeight(items, pkg);

    expect(result).toBe(750);
  });

  it("supports numeric tareWeight directly in grams", () => {
    const items = [{ quantity: 1, weight: 400 }];
    const pkg = {
      dimensions: { height: 10, length: 10, width: 10 },
      tareWeight: 100,
    };

    const result = calculateBillableWeight(items, pkg);

    expect(result).toBe(500);
  });

  it("multiplies item quantity when calculating total item weight", () => {
    const items = [{ quantity: 4, weight: 250 }];
    const pkg = {
      dimensions: { height: 5, length: 5, width: 5 },
      tareWeight: 50,
    };

    const result = calculateBillableWeight(items, pkg);

    expect(result).toBe(1050);
  });

  it("clamps to a 1 gram minimum when total weight and dimensions are 0 or empty", () => {
    expect(calculateBillableWeight([], null)).toBe(1);
    expect(
      calculateBillableWeight([], {
        dimensions: { height: 0, length: 0, width: 0 },
        tareWeight: 0,
      })
    ).toBe(1);
  });

  it("clamps to a 1 gram minimum when fractional weight is below 1 gram", () => {
    // Physical: 0.3g, Volumetric: 0.167g -> clamps to 1g
    const items = [{ quantity: 1, weight: 0.2 }];
    const pkg = {
      dimensions: { height: 1, length: 1, width: 1 },
      tareWeight: 0.1,
    };

    const result = calculateBillableWeight(items, pkg);

    expect(result).toBe(1);
  });

  it("handles null or undefined package gracefully", () => {
    const items = [{ quantity: 1, weight: 350 }];

    const result = calculateBillableWeight(items, null);

    expect(result).toBe(350);
  });

  it("rounds non-integer gram calculations to the nearest integer", () => {
    // 25 cm x 15 cm x 11 cm = 4,125 cm^3 -> 687.5 grams -> 688
    const items = [{ quantity: 1, weight: 50 }];
    const pkg = {
      dimensions: { height: 11, length: 25, width: 15 },
      tareWeight: 10,
    };

    const result = calculateBillableWeight(items, pkg);

    expect(result).toBe(688);
  });
});
