// oxlint-disable no-await-in-loop
import { getAdministrativeAreasSeedData } from "./seedData";

export interface SeedAdministrativeAreasOptions {
  batchSize?: number;
  checkExisting?: boolean;
  tableName?: string;
}

const escapeSqlString = (str: string): string => str.replaceAll("'", "''");

const resolveDbExecutor = (
  dbOrPayload: unknown
): ((sql: string) => Promise<unknown>) => {
  if (!dbOrPayload || typeof dbOrPayload !== "object") {
    throw new TypeError("Database or Payload instance must be provided");
  }

  // SAFETY: Checking for Payload Local API structure with db.drizzle.
  const payloadLike = dbOrPayload as {
    db?: { drizzle?: { execute?: (query: unknown) => Promise<unknown> } };
    drizzle?: { execute?: (query: unknown) => Promise<unknown> };
    execute?: (query: unknown) => Promise<unknown>;
    query?: (sql: string) => Promise<unknown>;
  };

  const drizzleExecute =
    payloadLike.db?.drizzle?.execute ??
    payloadLike.drizzle?.execute ??
    payloadLike.execute;

  if (typeof drizzleExecute === "function") {
    const context =
      payloadLike.db?.drizzle ?? payloadLike.drizzle ?? payloadLike;
    return (sqlString: string) => {
      // Drizzle execute accepts query object with toSQL or raw object with text/sql
      const queryObj = {
        params: [],
        sql: sqlString,
        text: sqlString,
        toSQL: () => ({ params: [], sql: sqlString }),
      };
      return drizzleExecute.call(context, queryObj);
    };
  }

  const queryFn = payloadLike.query;
  if (typeof queryFn === "function") {
    return (sqlString: string) => queryFn.call(payloadLike, sqlString);
  }

  throw new Error(
    "Unable to resolve SQL executor from the provided database instance"
  );
};

export const seedAdministrativeAreas = async (
  dbOrPayload: unknown,
  options: SeedAdministrativeAreasOptions = {}
): Promise<number> => {
  const execute = resolveDbExecutor(dbOrPayload);
  const tableName = options.tableName ?? "administrative_areas";
  const batchSize = options.batchSize ?? 500;

  const seedData = getAdministrativeAreasSeedData();

  // Sequential batch insertion prevents database connection pool exhaustion
  for (let i = 0; i < seedData.length; i += batchSize) {
    const batch = seedData.slice(i, i + batchSize);
    const valueClauses = batch.map((r) => {
      const subdistrictId = Number(r.subdistrict_id);
      const subdistrictName = `'${escapeSqlString(r.subdistrict_name)}'`;
      const cityId = Number(r.city_id);
      const cityName = `'${escapeSqlString(r.city_name)}'`;
      const cityType = `'${escapeSqlString(r.city_type)}'`;
      const provinceId = Number(r.province_id);
      const provinceName = `'${escapeSqlString(r.province_name)}'`;
      const postalCode = r.postal_code
        ? `'${escapeSqlString(r.postal_code)}'`
        : "NULL";

      return `(${subdistrictId}, ${subdistrictName}, ${cityId}, ${cityName}, ${cityType}, ${provinceId}, ${provinceName}, ${postalCode}, now(), now())`;
    });

    const sqlQuery = `INSERT INTO ${tableName} (subdistrict_id, subdistrict_name, city_id, city_name, city_type, province_id, province_name, postal_code, created_at, updated_at) VALUES ${valueClauses.join(",\n")} ON CONFLICT DO NOTHING;`;

    await execute(sqlQuery);
  }

  return seedData.length;
};
