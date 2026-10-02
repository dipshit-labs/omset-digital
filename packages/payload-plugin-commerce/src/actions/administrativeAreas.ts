import { sql } from "@payloadcms/db-postgres";

import type { CityItem, ProvinceItem, SubdistrictItem } from "../types";

export interface RawAdministrativeAreaRow {
  city_id?: number | string;
  city_name?: string;
  city_type?: string;
  postal_code?: string | null;
  province_id?: number | string;
  province_name?: string;
  subdistrict_id?: number | string;
  subdistrict_name?: string;
}

export interface DrizzleDatabaseLike {
  db?: { drizzle?: { execute?: (q: unknown) => Promise<unknown> } };
  drizzle?: { execute?: (q: unknown) => Promise<unknown> };
  execute?: (q: unknown) => Promise<unknown>;
  query?: (sql: string, params?: unknown[]) => Promise<unknown>;
}

export interface CompiledSqlQuery {
  params: unknown[];
  sql: string;
}

export interface DrizzleSqlQueryLike {
  toQuery?: (config: {
    escapeName: (s: string) => string;
    escapeParam: () => string;
    escapeString: (s: string) => string;
  }) => { params?: unknown[]; sql: string };
}

export interface LibSqlClientLike {
  batch?: (stmts: unknown[], mode?: string) => Promise<unknown>;
  execute?: (stmt: unknown) => Promise<unknown>;
}

let defaultAdministrativeAreasDb: DrizzleDatabaseLike | null = null;

export const setAdministrativeAreasDb = (db: unknown): void => {
  // SAFETY: Setter receives unknown target and stores it for resolution by resolveDrizzleExecutor.
  defaultAdministrativeAreasDb = (db ?? null) as DrizzleDatabaseLike | null;
};

export const getAdministrativeAreasDb = (): DrizzleDatabaseLike | null =>
  defaultAdministrativeAreasDb;

const compileDrizzleQuery = (query: unknown): CompiledSqlQuery | null => {
  if (query && typeof query === "object" && "toQuery" in query) {
    // SAFETY: Drizzle SQL query interface exposes toQuery method for parameterized query compilation.
    const candidate = query as DrizzleSqlQueryLike;
    if (typeof candidate.toQuery === "function") {
      const compiled = candidate.toQuery({
        escapeName: (s: string) => `"${s}"`,
        escapeParam: () => "?",
        escapeString: (s: string) => `'${s}'`,
      });
      return {
        params: compiled.params ?? [],
        sql: compiled.sql,
      };
    }
  }
  return null;
};

const resolveDrizzleExecutor = (
  dbOrPayload?: unknown
): ((query: unknown) => Promise<{ rows: RawAdministrativeAreaRow[] }>) => {
  // SAFETY: Caller passes target conforming to DrizzleDatabaseLike or fallback singleton is used.
  const target = (dbOrPayload ?? defaultAdministrativeAreasDb) as
    | DrizzleDatabaseLike
    | undefined;

  if (!target || typeof target !== "object") {
    throw new Error(
      "No database instance provided or configured for administrative areas query. Pass db to the helper or configure it via setAdministrativeAreasDb."
    );
  }

  // Detect LibSQL in-process client passed directly as db
  // SAFETY: Target is checked for LibSQL Client properties batch and execute without drizzle property.
  const libSqlClient = target as LibSqlClientLike;
  const executeFn = libSqlClient.execute;
  if (
    typeof libSqlClient.batch === "function" &&
    typeof executeFn === "function" &&
    !("drizzle" in target)
  ) {
    return async (query: unknown) => {
      const compiled = compileDrizzleQuery(query);
      // SAFETY: LibSQL client execute method accepts statement object with sql and args.
      const res = compiled
        ? await executeFn.call(libSqlClient, {
            args: compiled.params,
            sql: compiled.sql,
          })
        : await executeFn.call(libSqlClient, query);

      // SAFETY: LibSQL query execution returns array of rows or result object with rows.
      const rows = Array.isArray(res)
        ? (res as RawAdministrativeAreaRow[])
        : ((res as { rows?: RawAdministrativeAreaRow[] })?.rows ?? []);
      return { rows };
    };
  }

  const drizzleExecute =
    target.db?.drizzle?.execute ?? target.drizzle?.execute ?? target.execute;

  if (typeof drizzleExecute === "function") {
    const context = target.db?.drizzle ?? target.drizzle ?? target;
    return async (query: unknown) => {
      const res = await drizzleExecute.call(context, query);
      // SAFETY: Drizzle query executor returns array of rows or result object with rows.
      const rows = Array.isArray(res)
        ? (res as RawAdministrativeAreaRow[])
        : ((res as { rows?: RawAdministrativeAreaRow[] })?.rows ?? []);
      return { rows };
    };
  }

  const queryFn = target.query;
  if (typeof queryFn === "function") {
    return async (query: unknown) => {
      const compiled = compileDrizzleQuery(query);
      if (compiled) {
        const res = await queryFn.call(target, compiled.sql, compiled.params);
        // SAFETY: Query execution returns array of rows or result object with rows.
        const rows = Array.isArray(res)
          ? (res as RawAdministrativeAreaRow[])
          : ((res as { rows?: RawAdministrativeAreaRow[] })?.rows ?? []);
        return { rows };
      }
      const res = await queryFn.call(target, String(query));
      // SAFETY: String query execution returns array of rows or result object with rows.
      const rows = Array.isArray(res)
        ? (res as RawAdministrativeAreaRow[])
        : ((res as { rows?: RawAdministrativeAreaRow[] })?.rows ?? []);
      return { rows };
    };
  }

  throw new Error(
    "Unable to execute Drizzle SQL query with the provided database instance."
  );
};

export const getProvinces = async (db?: unknown): Promise<ProvinceItem[]> => {
  const execute = resolveDrizzleExecutor(db);

  const query = sql`
    SELECT DISTINCT province_id, province_name
    FROM administrative_areas
    ORDER BY province_name ASC;
  `;

  const { rows } = await execute(query);

  return rows.map((row) => {
    const provinceId = Number(row.province_id);
    const provinceName = String(row.province_name);
    return {
      province_id: provinceId,
      province_name: provinceName,
      provinceId,
      provinceName,
    };
  });
};

export const getCities = async (
  provinceId: number | string,
  db?: unknown
): Promise<CityItem[]> => {
  const numericProvinceId = Number(provinceId);
  if (Number.isNaN(numericProvinceId)) {
    throw new TypeError(`Invalid provinceId: ${provinceId}`);
  }

  const execute = resolveDrizzleExecutor(db);

  const query = sql`
    SELECT DISTINCT city_id, city_name, city_type
    FROM administrative_areas
    WHERE province_id = ${numericProvinceId}
    ORDER BY city_name ASC;
  `;

  const { rows } = await execute(query);

  return rows.map((row) => {
    const cityId = Number(row.city_id);
    const cityName = String(row.city_name);
    const cityType = String(row.city_type);
    return {
      city_id: cityId,
      city_name: cityName,
      city_type: cityType,
      cityId,
      cityName,
      cityType,
    };
  });
};

export const getSubdistricts = async (
  cityId: number | string,
  db?: unknown
): Promise<SubdistrictItem[]> => {
  const numericCityId = Number(cityId);
  if (Number.isNaN(numericCityId)) {
    throw new TypeError(`Invalid cityId: ${cityId}`);
  }

  const execute = resolveDrizzleExecutor(db);

  const query = sql`
    SELECT DISTINCT subdistrict_id, subdistrict_name, postal_code
    FROM administrative_areas
    WHERE city_id = ${numericCityId}
    ORDER BY subdistrict_name ASC;
  `;

  const { rows } = await execute(query);

  return rows.map((row) => {
    const subdistrictId = Number(row.subdistrict_id);
    const subdistrictName = String(row.subdistrict_name);
    const postalCode =
      row.postal_code !== null && row.postal_code !== undefined
        ? String(row.postal_code)
        : null;
    return {
      postal_code: postalCode,
      postalCode,
      subdistrict_id: subdistrictId,
      subdistrict_name: subdistrictName,
      subdistrictId,
      subdistrictName,
    };
  });
};
