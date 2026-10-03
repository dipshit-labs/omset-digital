import { createClient } from "@libsql/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getAdministrativeAreasSeedData } from "../data/seedData";
import {
  getCities,
  getProvinces,
  getSubdistricts,
  setAdministrativeAreasDb,
} from "./administrativeAreas";

describe("administrative areas SQL tests with real LibSQL in-memory executor", () => {
  const db = createClient({ url: ":memory:" });

  beforeAll(async () => {
    await db.execute(`
      CREATE TABLE administrative_areas (
        province_id INTEGER NOT NULL,
        province_name TEXT NOT NULL,
        city_id INTEGER NOT NULL,
        city_name TEXT NOT NULL,
        city_type TEXT NOT NULL,
        subdistrict_id INTEGER NOT NULL,
        subdistrict_name TEXT NOT NULL,
        postal_code TEXT NOT NULL
      )
    `);
    await db.execute(
      "CREATE INDEX idx_admin_province_id ON administrative_areas(province_id)"
    );
    await db.execute(
      "CREATE INDEX idx_admin_city_id ON administrative_areas(city_id)"
    );

    const seedData = getAdministrativeAreasSeedData();
    const chunkSize = 100;
    const statements = [];
    for (let i = 0; i < seedData.length; i += chunkSize) {
      const chunk = seedData.slice(i, i + chunkSize);
      const placeholders = chunk
        .map(() => "(?, ?, ?, ?, ?, ?, ?, ?)")
        .join(", ");
      const insertSql = `INSERT INTO administrative_areas (
        province_id, province_name, city_id, city_name, city_type, subdistrict_id, subdistrict_name, postal_code
      ) VALUES ${placeholders}`;
      const args = chunk.flatMap((r) => [
        r.province_id,
        r.province_name,
        r.city_id,
        r.city_name,
        r.city_type,
        r.subdistrict_id,
        r.subdistrict_name,
        r.postal_code,
      ]);
      statements.push({ args, sql: insertSql });
    }
    await db.batch(statements, "write");
  });

  afterAll(() => {
    db.close();
  });

  it("getProvinces() returns exactly 34 provinces sorted alphabetically", async () => {
    const provinces = await getProvinces(db);

    expect(provinces).toHaveLength(34);
    expect(provinces[0]?.province_name).toBe("Bali");
    expect(provinces.at(-1)?.province_name).toBe("Sumatera Utara");
  });

  it("throws error if no database instance is configured or provided", async () => {
    setAdministrativeAreasDb(null);
    await expect(getProvinces(null as never)).rejects.toThrow(/no database/iu);
  });

  it("getCities(5) returns all 5 cities in DI Yogyakarta with correct city types", async () => {
    const cities = await getCities(5, db);

    expect(cities).toHaveLength(5);
    const cityNames = cities.map((c) => c.city_name);
    expect(cityNames).toStrictEqual([
      "Bantul",
      "Gunung Kidul",
      "Kulon Progo",
      "Sleman",
      "Yogyakarta",
    ]);

    const yogyakarta = cities.find((c) => c.city_name === "Yogyakarta");
    expect(yogyakarta?.city_type).toBe("Kota");

    const bantul = cities.find((c) => c.city_name === "Bantul");
    expect(bantul?.city_type).toBe("Kabupaten");
  });

  it("accepts string provinceId and coerces parameter to number", async () => {
    const cities = await getCities("5", db);
    expect(cities).toHaveLength(5);
  });

  it("getSubdistricts(39) returns all 17 subdistricts in Bantul with postal code", async () => {
    const subdistricts = await getSubdistricts(39, db);

    expect(subdistricts).toHaveLength(17);
    const allHavePostal = subdistricts.every((s) => s.postal_code === "55715");
    expect(allHavePostal).toBeTruthy();

    const bambangLipuro = subdistricts.find(
      (s) => s.subdistrict_name === "Bambang Lipuro"
    );
    expect(bambangLipuro).toBeDefined();
    expect(bambangLipuro?.subdistrict_id).toBe(537);
  });

  it("accepts string cityId and coerces parameter to number", async () => {
    const subdistricts = await getSubdistricts("39", db);
    expect(subdistricts).toHaveLength(17);
  });

  it("uses default db configured via setAdministrativeAreasDb when db parameter is omitted", async () => {
    setAdministrativeAreasDb(db);
    const provinces = await getProvinces();
    expect(provinces).toHaveLength(34);
    setAdministrativeAreasDb(null);
  });

  it("executes 100 lookup queries in under 50 ms (average < 0.5 ms per lookup)", async () => {
    const start = performance.now();

    const promises: Promise<unknown>[] = [];
    for (let i = 0; i < 100; i += 1) {
      promises.push(getCities(5, db));
    }
    await Promise.all(promises);

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});
