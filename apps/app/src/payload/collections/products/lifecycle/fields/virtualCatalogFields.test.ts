import type { Condition, NamedGroupField } from "payload";
import { describe, expect, it } from "vitest";

import { virtualCatalogFields } from "./virtualCatalogFields";

const dummyContext = {
  blockData: {},
  operation: "create" as const,
  path: [],
  user: null,
};

describe("virtual catalog fields", () => {
  it("exports an array of three virtual group fields", () => {
    expect(virtualCatalogFields).toHaveLength(3);
    const fieldNames = virtualCatalogFields.map((f) =>
      "name" in f ? f.name : ""
    );
    expect(fieldNames).toStrictEqual(["pricing", "inventory", "shipping"]);
  });

  it("marks all fields as virtual groups", () => {
    for (const field of virtualCatalogFields) {
      expect(field.type).toBe("group");
      // SAFETY: virtualCatalogFields defines named group fields where virtual property exists.
      const namedGroup = field as NamedGroupField;
      expect(namedGroup.virtual).toBeTruthy();
    }
  });

  it("applies admin condition to hide pricing when variantTypes exist", () => {
    const pricing = virtualCatalogFields.find(
      (f) => "name" in f && f.name === "pricing"
    );
    // SAFETY: Pricing field in virtualCatalogFields defines an admin condition.
    const condition = pricing?.admin?.condition as Condition;
    expect(condition({}, {}, dummyContext)).toBeTruthy();
    expect(condition({ variantTypes: [] }, {}, dummyContext)).toBeTruthy();
    expect(condition({ variantTypes: [1, 2] }, {}, dummyContext)).toBeFalsy();
  });

  it("applies admin condition to hide inventory when variantTypes exist", () => {
    const inventory = virtualCatalogFields.find(
      (f) => "name" in f && f.name === "inventory"
    );
    // SAFETY: Inventory field in virtualCatalogFields defines an admin condition.
    const condition = inventory?.admin?.condition as Condition;
    expect(condition({}, {}, dummyContext)).toBeTruthy();
    expect(condition({ variantTypes: [] }, {}, dummyContext)).toBeTruthy();
    expect(condition({ variantTypes: [1, 2] }, {}, dummyContext)).toBeFalsy();
  });

  it("applies admin condition to hide shipping when variantTypes exist", () => {
    const shipping = virtualCatalogFields.find(
      (f) => "name" in f && f.name === "shipping"
    );
    // SAFETY: Shipping field in virtualCatalogFields defines an admin condition.
    const condition = shipping?.admin?.condition as Condition;
    expect(condition({}, {}, dummyContext)).toBeTruthy();
    expect(condition({ variantTypes: [] }, {}, dummyContext)).toBeTruthy();
    expect(condition({ variantTypes: [1, 2] }, {}, dummyContext)).toBeFalsy();
  });
});
