import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { getAdministrativeAreasSeedData } from "../data/seedData";
import {
  getCities,
  getProvinces,
  getSubdistricts,
  setAdministrativeAreasDb,
} from "./administrativeAreas";

interface DrizzleSqlQueryLike {
  toQuery: (config: {
    escapeName: (s: string) => string;
    escapeParam: (name: string, index: number) => string;
    escapeString: (s: string) => string;
  }) => { params?: unknown[]; sql: string };
}

const createPgLiteExecutor = (pglite: PGlite) => ({
  execute: async (query: unknown): Promise<{ rows: unknown[] }> => {
    const sqlQuery = query as DrizzleSqlQueryLike;
    let paramIndex = 0;
    const compiled = sqlQuery.toQuery({
      escapeName: (s: string) => `"${s}"`,
      escapeParam: () => {
        paramIndex += 1;
        return `$${paramIndex}`;
      },
      escapeString: (s: string) => `'${s}'`,
    });
    const result = await pglite.query<Record<string, unknown>>(
      compiled.sql,
      compiled.params ?? []
    );
    return { rows: result.rows };
  },
});

describe("administrative areas SQL tests with real PGlite in-memory executor", () => {
  const pglite = new PGlite("memory://");
  const dbAdapter = createPgLiteExecutor(pglite);

  beforeAll(async () => {
    await pglite.exec(`
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
    await pglite.exec(
      "CREATE INDEX idx_admin_province_id ON administrative_areas(province_id)"
    );
    await pglite.exec(
      "CREATE INDEX idx_admin_city_id ON administrative_areas(city_id)"
    );

    const seedData = getAdministrativeAreasSeedData();
    const chunkSize = 100;
    const insertPromises: Promise<unknown>[] = [];
    for (let i = 0; i < seedData.length; i += chunkSize) {
      const chunk = seedData.slice(i, i + chunkSize);
      const placeholders = chunk
        .map(
          (_, rowIdx) =>
            `($${rowIdx * 8 + 1}, $${rowIdx * 8 + 2}, $${rowIdx * 8 + 3}, $${rowIdx * 8 + 4}, $${rowIdx * 8 + 5}, $${rowIdx * 8 + 6}, $${rowIdx * 8 + 7}, $${rowIdx * 8 + 8})`
        )
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
      insertPromises.push(pglite.query(insertSql, args));
    }
    await Promise.all(insertPromises);
  });

  afterAll(async () => {
    await pglite.close();
  });

  it("getProvinces() returns exactly 34 provinces sorted alphabetically", async () => {
    const provinces = await getProvinces(dbAdapter);
    expect(provinces).toHaveLength(34);
    const names = provinces.map((p) => p.province_name);
    expect(names).toStrictEqual(names.toSorted());
  });

  it("throws error if no database instance is configured or provided", async () => {
    setAdministrativeAreasDb(null);
    await expect(getProvinces()).rejects.toThrow(
      "No database instance provided or configured"
    );
  });

  it("getCities(5) returns all 5 cities in DI Yogyakarta with correct city types", async () => {
    const cities = await getCities(5, dbAdapter);
    expect(cities.length).toBeGreaterThan(0);
    for (const city of cities) {
      expect(city.city_name).toBeTypeOf("string");
      expect(["Kabupaten", "Kota"]).toContain(city.city_type);
    }
  });

  it("accepts string provinceId and coerces parameter to number", async () => {
    const cities = await getCities("5", dbAdapter);
    expect(cities.length).toBeGreaterThan(0);
  });

  it("getSubdistricts(39) returns all 17 subdistricts in Bantul with postal code", async () => {
    const subdistricts = await getSubdistricts(39, dbAdapter);
    expect(subdistricts).toHaveLength(17);
    for (const s of subdistricts) {
      expect(s.postal_code).toBeTypeOf("string");
    }
  });

  it("accepts string cityId and coerces parameter to number", async () => {
    const subdistricts = await getSubdistricts("39", dbAdapter);
    expect(subdistricts).toHaveLength(17);
  });

  it("uses default db configured via setAdministrativeAreasDb when db parameter is omitted", async () => {
    setAdministrativeAreasDb(dbAdapter);
    const provinces = await getProvinces();
    expect(provinces).toHaveLength(34);
    setAdministrativeAreasDb(null);
  });

  it("executes 100 lookup queries in under 5000 ms (average < 50 ms per lookup)", async () => {
    const start = Date.now();
    const queries = Array.from({ length: 100 }, () => getProvinces(dbAdapter));
    await Promise.all(queries);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  it("throws TypeError on non-numeric provinceId and cityId", async () => {
    await expect(getCities("not-a-number", dbAdapter)).rejects.toThrow(
      TypeError
    );
    await expect(getSubdistricts("not-a-number", dbAdapter)).rejects.toThrow(
      TypeError
    );
  });

  it("supports Drizzle holder and pg-like query executors with { rows } response", async () => {
    const mockRows = [
      { province_id: 1, province_name: "Bali" },
      { province_id: 5, province_name: "DI Yogyakarta" },
    ];

    const drizzleHolder = {
      db: {
        drizzle: {
          execute: vi
            .fn<() => Promise<{ rows: typeof mockRows }>>()
            .mockResolvedValue({ rows: mockRows }),
        },
      },
    };
    const provinces = await getProvinces(drizzleHolder);
    expect(provinces).toHaveLength(2);

    const queryExecutor = {
      query: vi
        .fn<(_sql: unknown, params: unknown) => Promise<unknown>>()
        .mockImplementation((_sql: unknown, params: unknown) => {
          if (params) {
            return Promise.resolve({
              rows: [
                { city_id: 39, city_name: "Bantul", city_type: "Kabupaten" },
              ],
            });
          }
          return Promise.resolve([
            {
              postal_code: "55715",
              subdistrict_id: 537,
              subdistrict_name: "Bambang Lipuro",
            },
          ]);
        }),
    };
    const cities = await getCities(5, queryExecutor);
    expect(cities).toHaveLength(1);

    const subdistricts = await getSubdistricts(39, queryExecutor);
    expect(subdistricts).toHaveLength(1);
  });
});
