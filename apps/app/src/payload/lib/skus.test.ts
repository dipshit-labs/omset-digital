import { describe, expect, it } from "bun:test";
import {
  generateVariants,
  optionsKey,
  type VariantAxis,
  type VariantOverrides,
} from "@/payload/lib/skus";

describe("optionsKey", () => {
  it("produces a stable key regardless of insertion order", () => {
    const a = optionsKey([
      { option: "Color", value: "Red" },
      { option: "Size", value: "M" },
    ]);
    const b = optionsKey([
      { option: "Size", value: "M" },
      { option: "Color", value: "Red" },
    ]);
    expect(a).toBe(b);
  });

  it("distinguishes different option maps", () => {
    const a = optionsKey([{ option: "Color", value: "Red" }]);
    const b = optionsKey([{ option: "Color", value: "Blue" }]);
    expect(a).not.toBe(b);
  });

  it("returns a consistent key for empty options (simple product)", () => {
    expect(optionsKey([])).toBe(optionsKey([]));
  });

  it("does not collide when option name contains special characters", () => {
    const a = optionsKey([{ option: "A|B", value: "x" }]);
    const b = optionsKey([{ option: "A", value: "B|A:x" }]);
    expect(a).not.toBe(b);
  });
});

describe("generateVariants — simple product (no axes)", () => {
  it("returns one variant with empty options when axes is empty", () => {
    const variants = generateVariants([]);
    expect(variants).toHaveLength(1);
    expect(variants[0]?.options).toEqual([]);
  });

  it("preserves existing simple-product overrides on re-generation", () => {
    const existing: VariantOverrides[] = [
      {
        options: [],
        price: 50_000,
        sku: "SIMPLE-001",
        stock: 10,
        weight: 500,
      },
    ];
    const variants = generateVariants([], existing);
    expect(variants[0]).toMatchObject({
      options: [],
      price: 50_000,
      sku: "SIMPLE-001",
      stock: 10,
      weight: 500,
    });
  });

  it("returns null overrides when no existing variant matches", () => {
    const variants = generateVariants([]);
    expect(variants[0]).toMatchObject({
      price: null,
      sku: null,
      stock: null,
      weight: null,
    });
  });
});

describe("generateVariants — single axis", () => {
  const axes: VariantAxis[] = [
    { name: "Color", values: ["Red", "Blue", "Green"] },
  ];

  it("generates one variant per value", () => {
    const variants = generateVariants(axes);
    expect(variants).toHaveLength(3);
    expect(variants.map((v) => v.options[0]?.value)).toEqual([
      "Red",
      "Blue",
      "Green",
    ]);
  });

  it("all variants have null overrides by default", () => {
    const variants = generateVariants(axes);
    for (const v of variants) {
      expect(v.price).toBeNull();
      expect(v.weight).toBeNull();
    }
  });
});

describe("generateVariants — multiple axes (Cartesian product)", () => {
  const axes: VariantAxis[] = [
    { name: "Color", values: ["Red", "Blue"] },
    { name: "Size", values: ["S", "M"] },
  ];

  it("generates the full Cartesian product", () => {
    const variants = generateVariants(axes);
    expect(variants).toHaveLength(4);
    const combos = variants.map((v) => {
      const color = v.options.find((o) => o.option === "Color")?.value;
      const size = v.options.find((o) => o.option === "Size")?.value;
      return `${color}-${size}`;
    });
    expect(combos).toEqual(["Red-S", "Red-M", "Blue-S", "Blue-M"]);
  });

  it("preserves overrides for combinations that still exist", () => {
    const existing: VariantOverrides[] = [
      {
        price: 75_000,
        weight: 300,
        options: [
          { option: "Color", value: "Red" },
          { option: "Size", value: "S" },
        ],
      },
      {
        sku: "BLUE-M",
        weight: 350,
        options: [
          { option: "Color", value: "Blue" },
          { option: "Size", value: "M" },
        ],
      },
    ];
    const variants = generateVariants(axes, existing);

    const redS = variants.find(
      (v) =>
        v.options.find((o) => o.option === "Color")?.value === "Red" &&
        v.options.find((o) => o.option === "Size")?.value === "S"
    );
    expect(redS).toMatchObject({ price: 75_000, weight: 300 });

    const blueM = variants.find(
      (v) =>
        v.options.find((o) => o.option === "Color")?.value === "Blue" &&
        v.options.find((o) => o.option === "Size")?.value === "M"
    );
    expect(blueM).toMatchObject({ sku: "BLUE-M", weight: 350 });
  });

  it("drops overrides for combinations removed by axis change", () => {
    const existing: VariantOverrides[] = [
      {
        price: 99_000,
        weight: 200,
        options: [
          { option: "Color", value: "Green" },
          { option: "Size", value: "S" },
        ],
      },
    ];
    const variants = generateVariants(axes, existing);
    const green = variants.find(
      (v) => v.options.find((o) => o.option === "Color")?.value === "Green"
    );
    expect(green).toBeUndefined();
  });
});

describe("generateVariants — axis with empty values treated as simple product", () => {
  it("returns one variant with empty options when all axes have no values", () => {
    const axes: VariantAxis[] = [{ name: "Color", values: [] }];
    const variants = generateVariants(axes);
    expect(variants).toHaveLength(1);
    expect(variants[0]?.options).toEqual([]);
  });
});
