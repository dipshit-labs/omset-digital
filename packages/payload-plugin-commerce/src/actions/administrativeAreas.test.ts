import { describe, expect, it, vi } from "vitest";

import {
  getCities,
  getProvinces,
  getSubdistricts,
  setAdministrativeAreasDb,
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

describe("administrative areas Drizzle SQL helpers", () => {
  describe(getProvinces, () => {
    it("returns sorted list of provinces with province_id and province_name", async () => {
      let capturedQuery: unknown;
      const mockDb = {
        execute: vi
          .fn<(q: unknown) => Promise<unknown>>()
          .mockImplementation((query: unknown) => {
            capturedQuery = query;
            return Promise.resolve({
              rows: [
                { province_id: "1", province_name: "Bali" },
                { province_id: "2", province_name: "Bangka Belitung" },
                { province_id: "5", province_name: "DI Yogyakarta" },
              ],
            });
          }),
      };

      const provinces = await getProvinces(mockDb);

      expect(provinces).toHaveLength(3);
      expect(provinces[0]).toStrictEqual({
        province_id: 1,
        province_name: "Bali",
        provinceId: 1,
        provinceName: "Bali",
      });
      expect(provinces[2]?.province_id).toBe(5);

      const { sql: sqlString } = extractQuery(capturedQuery);
      expect(sqlString.toLowerCase()).toContain("select distinct");
      expect(sqlString.toLowerCase()).toContain("province_id");
    });

    it("throws error if no database instance is configured or provided", async () => {
      setAdministrativeAreasDb(null);
      await expect(getProvinces(null as never)).rejects.toThrow(
        /no database/iu
      );
    });
  });

  describe(getCities, () => {
    it("returns cities for the given province with city_id, city_name, and city_type", async () => {
      let capturedParams: unknown[] = [];
      const mockDb = {
        execute: vi
          .fn<(q: unknown) => Promise<unknown>>()
          .mockImplementation((query: unknown) => {
            capturedParams = extractQuery(query).params;
            return Promise.resolve({
              rows: [
                { city_id: "39", city_name: "Bantul", city_type: "Kabupaten" },
                { city_id: "501", city_name: "Yogyakarta", city_type: "Kota" },
              ],
            });
          }),
      };

      const cities = await getCities(5, mockDb);

      expect(cities).toHaveLength(2);
      expect(cities[0]).toStrictEqual({
        city_id: 39,
        city_name: "Bantul",
        city_type: "Kabupaten",
        cityId: 39,
        cityName: "Bantul",
        cityType: "Kabupaten",
      });
      expect(cities[1]).toStrictEqual({
        city_id: 501,
        city_name: "Yogyakarta",
        city_type: "Kota",
        cityId: 501,
        cityName: "Yogyakarta",
        cityType: "Kota",
      });
      expect(capturedParams).toContain(5);
    });

    it("accepts string provinceId and coerces parameter to number", async () => {
      let capturedParams: unknown[] = [];
      const mockDb = {
        execute: vi
          .fn<(q: unknown) => Promise<unknown>>()
          .mockImplementation((query: unknown) => {
            capturedParams = extractQuery(query).params;
            return Promise.resolve({ rows: [] });
          }),
      };

      await getCities("5", mockDb);
      expect(capturedParams).toContain(5);
    });
  });

  describe(getSubdistricts, () => {
    it("returns subdistricts for the given city with subdistrict_id, subdistrict_name, and postal_code", async () => {
      let capturedParams: unknown[] = [];
      const mockDb = {
        execute: vi
          .fn<(q: unknown) => Promise<unknown>>()
          .mockImplementation((query: unknown) => {
            capturedParams = extractQuery(query).params;
            return Promise.resolve({
              rows: [
                {
                  postal_code: "55715",
                  subdistrict_id: "537",
                  subdistrict_name: "Bambang Lipuro",
                },
                {
                  postal_code: "55715",
                  subdistrict_id: "538",
                  subdistrict_name: "Banguntapan",
                },
              ],
            });
          }),
      };

      const subdistricts = await getSubdistricts(39, mockDb);

      expect(subdistricts).toHaveLength(2);
      expect(subdistricts[0]).toStrictEqual({
        postal_code: "55715",
        postalCode: "55715",
        subdistrict_id: 537,
        subdistrict_name: "Bambang Lipuro",
        subdistrictId: 537,
        subdistrictName: "Bambang Lipuro",
      });
      expect(subdistricts[1]?.subdistrict_id).toBe(538);
      expect(capturedParams).toContain(39);
    });

    it("accepts string cityId and coerces parameter to number", async () => {
      let capturedParams: unknown[] = [];
      const mockDb = {
        execute: vi
          .fn<(q: unknown) => Promise<unknown>>()
          .mockImplementation((query: unknown) => {
            capturedParams = extractQuery(query).params;
            return Promise.resolve({ rows: [] });
          }),
      };

      await getSubdistricts("39", mockDb);
      expect(capturedParams).toContain(39);
    });
  });

  describe("default db singleton", () => {
    it("uses default db configured via setAdministrativeAreasDb when db parameter is omitted", async () => {
      const mockDb = {
        execute: vi.fn<(q: unknown) => Promise<unknown>>().mockResolvedValue({
          rows: [{ province_id: "1", province_name: "Bali" }],
        }),
      };

      setAdministrativeAreasDb(mockDb);

      const provinces = await getProvinces();
      expect(provinces).toHaveLength(1);
      expect(provinces[0]?.province_name).toBe("Bali");
      expect(mockDb.execute).toHaveBeenCalledWith(expect.anything());

      // Clean up
      setAdministrativeAreasDb(null);
    });
  });
});
