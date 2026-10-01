import { describe, expect, it } from "vitest";

import { getAdministrativeAreasSeedData } from "./seedData";

describe(getAdministrativeAreasSeedData, () => {
  it("returns exactly 6,980 pre-seeded subdistricts with denormalized fields", () => {
    const data = getAdministrativeAreasSeedData();

    expect(data).toHaveLength(6980);
  });

  it("ensures every record contains complete and valid denormalized properties", () => {
    const data = getAdministrativeAreasSeedData();

    const allValid = data.every(
      (r) =>
        r.subdistrict_id > 0 &&
        r.subdistrict_name.trim().length > 0 &&
        r.city_id > 0 &&
        r.city_name.trim().length > 0 &&
        (r.city_type === "Kabupaten" || r.city_type === "Kota") &&
        r.province_id > 0 &&
        r.province_name.trim().length > 0 &&
        /^\d{5}$/u.test(r.postal_code)
    );

    expect(allValid).toBeTruthy();
  });

  it("ensures every subdistrict_id is unique across the entire dataset", () => {
    const data = getAdministrativeAreasSeedData();
    const ids = new Set(data.map((r) => r.subdistrict_id));

    expect(ids.size).toBe(6980);
  });

  it("verifies accurate denormalization for Bantul subdistrict", () => {
    const data = getAdministrativeAreasSeedData();

    const bambangLipuro = data.find(
      (r) => r.subdistrict_name === "Bambang Lipuro"
    );
    expect(bambangLipuro).toBeDefined();
    expect(bambangLipuro?.city_name).toBe("Bantul");
    expect(bambangLipuro?.city_type).toBe("Kabupaten");
    expect(bambangLipuro?.province_name).toBe("DI Yogyakarta");
    expect(bambangLipuro?.postal_code).toBe("55715");
  });

  it("verifies accurate denormalization for Bandung subdistrict", () => {
    const data = getAdministrativeAreasSeedData();

    const bandungSubdistrict = data.find(
      (r) => r.city_name === "Bandung" && r.city_type === "Kota"
    );
    expect(bandungSubdistrict).toBeDefined();
    expect(bandungSubdistrict?.province_name).toBe("Jawa Barat");
  });
});
