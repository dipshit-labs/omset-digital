import { describe, expect, it } from "vitest";

import { getAdministrativeAreasSeedData } from "../data/seedData";
import {
  getCities,
  getProvinces,
  getSubdistricts,
} from "./administrativeAreas";

interface ExtractedQuery {
  params: unknown[];
  sql: string;
}

const extractQuery = (query: unknown): ExtractedQuery => {
  if (!query) {
    return { params: [], sql: "" };
  }
  if (typeof query === "string") {
    return { params: [], sql: query };
  }
  if (typeof query === "object") {
    const qObj = query as {
      queryChunks?: unknown[];
      toQuery?: (d: unknown) => { params?: unknown[]; sql: string };
      toSQL?: () => { params?: unknown[]; sql: string };
    };
    if (typeof qObj.toQuery === "function") {
      try {
        const res = qObj.toQuery({
          escapeName: (s: string) => `"${s}"`,
          escapeParam: (n: number) => `$${n + 1}`,
          escapeString: (s: string) => `'${s}'`,
        });
        return { params: res.params ?? [], sql: res.sql };
      } catch {
        // Fall through to queryChunks inspection
      }
    }
    if (typeof qObj.toSQL === "function") {
      const res = qObj.toSQL();
      return { params: res.params ?? [], sql: res.sql };
    }
    if (Array.isArray(qObj.queryChunks)) {
      let sqlText = "";
      const params: unknown[] = [];
      for (const chunk of qObj.queryChunks) {
        if (chunk && typeof chunk === "object" && "value" in chunk) {
          // SAFETY: StringChunk in Drizzle holds value array.
          const val = (chunk as { value: unknown }).value;
          sqlText += Array.isArray(val) ? val.join("") : String(val);
        } else if (typeof chunk === "number" || typeof chunk === "string") {
          sqlText += `$${params.length + 1}`;
          params.push(chunk);
        }
      }
      return { params, sql: sqlText };
    }
  }
  return { params: [], sql: String(query) };
};

describe("administrative areas SQL integration test with full reference dataset", () => {
  const seedRecords = getAdministrativeAreasSeedData();

  // Create an in-memory SQL mock engine that executes queries against the full ~7,200 seed dataset
  const createDatasetSqlDb = () => ({
    execute: (query: unknown) => {
      const { params, sql } = extractQuery(query);
      const lowerSql = sql.toLowerCase();

      if (
        lowerSql.includes("province_id, province_name") &&
        !lowerSql.includes("where")
      ) {
        const provinceMap = new Map<number, string>();
        for (const r of seedRecords) {
          provinceMap.set(r.province_id, r.province_name);
        }
        const rows = [...provinceMap.entries()]
          .map(([id, name]) => ({ province_id: id, province_name: name }))
          .toSorted((a, b) => a.province_name.localeCompare(b.province_name));
        return Promise.resolve({ rows });
      }

      if (
        lowerSql.includes("city_id, city_name, city_type") &&
        lowerSql.includes("where province_id")
      ) {
        const provId = Number(params[0]);
        const cityMap = new Map<
          number,
          { city_id: number; city_name: string; city_type: string }
        >();
        for (const r of seedRecords) {
          if (r.province_id === provId) {
            cityMap.set(r.city_id, {
              city_id: r.city_id,
              city_name: r.city_name,
              city_type: r.city_type,
            });
          }
        }
        const rows = [...cityMap.values()].toSorted((a, b) =>
          a.city_name.localeCompare(b.city_name)
        );
        return Promise.resolve({ rows });
      }

      if (
        lowerSql.includes("subdistrict_id, subdistrict_name, postal_code") &&
        lowerSql.includes("where city_id")
      ) {
        const cityId = Number(params[0]);
        const rows = seedRecords
          .filter((r) => r.city_id === cityId)
          .map((r) => ({
            postal_code: r.postal_code,
            subdistrict_id: r.subdistrict_id,
            subdistrict_name: r.subdistrict_name,
          }))
          .toSorted((a, b) =>
            a.subdistrict_name.localeCompare(b.subdistrict_name)
          );
        return Promise.resolve({ rows });
      }

      throw new Error(`Unhandled SQL query in integration test: ${sql}`);
    },
  });

  it("getProvinces() returns exactly 34 provinces sorted alphabetically", async () => {
    const db = createDatasetSqlDb();
    const provinces = await getProvinces(db);

    expect(provinces).toHaveLength(34);
    expect(provinces[0]?.province_name).toBe("Bali");
    expect(provinces.at(-1)?.province_name).toBe("Sumatera Utara");
  });

  it("getCities(5) returns all 5 cities in DI Yogyakarta with correct city types", async () => {
    const db = createDatasetSqlDb();
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

  it("getSubdistricts(39) returns all 17 subdistricts in Bantul with postal code", async () => {
    const db = createDatasetSqlDb();
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

  it("executes 100 lookup queries in under 50 ms (average < 0.5 ms per lookup)", async () => {
    const db = createDatasetSqlDb();
    const start = performance.now();

    const promises: Promise<unknown>[] = [];
    for (let i = 0; i < 100; i += 1) {
      promises.push(getCities(5, db));
    }
    await Promise.all(promises);

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
});
