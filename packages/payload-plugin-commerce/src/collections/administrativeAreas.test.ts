import type { Field, NumberField, TextField } from "payload";
import { describe, expect, it } from "vitest";

import { createAdministrativeAreasCollection } from "./administrativeAreas";

describe("administrativeAreas collection factory", () => {
  it("creates collection hidden from admin navigation with default slug administrativeAreas", () => {
    const collection = createAdministrativeAreasCollection();

    expect(collection.slug).toBe("administrativeAreas");
    expect(collection.admin?.hidden).toBeTruthy();
  });

  it("allows custom collection slug via options", () => {
    const collection = createAdministrativeAreasCollection({
      slug: "customAreas",
    });

    expect(collection.slug).toBe("customAreas");
  });

  it("defines restricted access control: read allowed, mutations disallowed", () => {
    const collection = createAdministrativeAreasCollection();
    const { access } = collection;

    const readFn = access?.read as ((ctx: unknown) => boolean) | undefined;
    const createFn = access?.create as ((ctx: unknown) => boolean) | undefined;
    const updateFn = access?.update as ((ctx: unknown) => boolean) | undefined;
    const deleteFn = access?.delete as ((ctx: unknown) => boolean) | undefined;

    expect(readFn?.({})).toBeTruthy();
    expect(createFn?.({})).toBeFalsy();
    expect(updateFn?.({})).toBeFalsy();
    expect(deleteFn?.({})).toBeFalsy();
  });

  it("defines subdistrict_id and subdistrict_name fields", () => {
    const collection = createAdministrativeAreasCollection();
    const subdistrictId = collection.fields.find(
      (f: Field): boolean => "name" in f && f.name === "subdistrict_id"
    ) as NumberField | undefined;
    const subdistrictName = collection.fields.find(
      (f: Field): boolean => "name" in f && f.name === "subdistrict_name"
    ) as TextField | undefined;

    expect(subdistrictId?.type).toBe("number");
    expect(subdistrictId?.required).toBeTruthy();
    expect(subdistrictId?.index).toBeTruthy();
    expect(subdistrictName?.type).toBe("text");
    expect(subdistrictName?.required).toBeTruthy();
  });

  it("defines city_id, city_name, and city_type fields", () => {
    const collection = createAdministrativeAreasCollection();
    const cityId = collection.fields.find(
      (f: Field): boolean => "name" in f && f.name === "city_id"
    ) as NumberField | undefined;
    const cityName = collection.fields.find(
      (f: Field): boolean => "name" in f && f.name === "city_name"
    ) as TextField | undefined;
    const cityType = collection.fields.find(
      (f: Field): boolean => "name" in f && f.name === "city_type"
    ) as TextField | undefined;

    expect(cityId?.type).toBe("number");
    expect(cityId?.index).toBeTruthy();
    expect(cityName?.required).toBeTruthy();
    expect(cityType?.required).toBeTruthy();
  });

  it("defines province_id, province_name, and postal_code fields", () => {
    const collection = createAdministrativeAreasCollection();
    const provinceId = collection.fields.find(
      (f: Field): boolean => "name" in f && f.name === "province_id"
    ) as NumberField | undefined;
    const provinceName = collection.fields.find(
      (f: Field): boolean => "name" in f && f.name === "province_name"
    ) as TextField | undefined;
    const postalCode = collection.fields.find(
      (f: Field): boolean => "name" in f && f.name === "postal_code"
    ) as TextField | undefined;

    expect(provinceId?.type).toBe("number");
    expect(provinceId?.index).toBeTruthy();
    expect(provinceName?.required).toBeTruthy();
    expect(postalCode?.type).toBe("text");
  });
});
