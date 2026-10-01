import { describe, expect, it, vi } from "vitest";

import { seedAdministrativeAreas } from "./seed";

describe(seedAdministrativeAreas, () => {
  it("executes batch inserts into administrative_areas table", async () => {
    const executedQueries: string[] = [];
    const mockDb = {
      execute: vi
        .fn<(q: unknown) => Promise<unknown>>()
        .mockImplementation((query: unknown) => {
          let sqlString = "";
          if (typeof query === "string") {
            sqlString = query;
          } else if (
            query &&
            typeof query === "object" &&
            "toSQL" in query &&
            typeof (query as { toSQL: () => { sql: string } }).toSQL ===
              "function"
          ) {
            sqlString = (query as { toSQL: () => { sql: string } }).toSQL().sql;
          } else {
            sqlString = String(query);
          }
          executedQueries.push(sqlString);
          return Promise.resolve({ rows: [] });
        }),
    };

    const count = await seedAdministrativeAreas(mockDb, { batchSize: 1000 });

    expect(count).toBe(6980);
    expect(mockDb.execute).toHaveBeenCalledWith(expect.anything());
    expect(executedQueries.length).toBeGreaterThan(0);
    expect(executedQueries[0]).toContain("INSERT INTO administrative_areas");
  });

  it("extracts drizzle from payload instance when passed", async () => {
    const execute = vi
      .fn<(q: unknown) => Promise<unknown>>()
      .mockResolvedValue({ rows: [] });
    const mockPayload = {
      db: {
        drizzle: {
          execute,
        },
      },
    };

    const count = await seedAdministrativeAreas(mockPayload, {
      batchSize: 2000,
    });

    expect(count).toBe(6980);
    expect(execute).toHaveBeenCalledWith(expect.anything());
  });
});
