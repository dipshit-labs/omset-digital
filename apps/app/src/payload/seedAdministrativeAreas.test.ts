import { describe, expect, it, vi } from "vitest";

import {
  down,
  up,
} from "../migrations/20261001_000000_seed_administrative_areas";

describe("administrative areas migration", () => {
  it("up() creates table, indexes, and seeds records", async () => {
    const executedQueries: unknown[] = [];
    const mockExecute = vi
      .fn<(q: unknown) => Promise<unknown>>()
      .mockImplementation((query: unknown) => {
        executedQueries.push(query);
        return Promise.resolve({ rows: [] });
      });

    const mockPayload = {
      db: {
        drizzle: {
          execute: mockExecute,
        },
      },
    };

    // SAFETY: Providing mock payload conforming to MigrateUpArgs shape.
    await up({
      db: mockPayload.db as never,
      payload: mockPayload as never,
      req: {} as never,
    });

    expect(mockExecute).toHaveBeenCalledWith(expect.anything());
    expect(executedQueries.length).toBeGreaterThan(1);
    const ddl = JSON.stringify(executedQueries[0]);
    expect(ddl).toContain("idx_administrative_areas_composite");
    expect(ddl).toContain("subdistrict_id");
  });

  it("down() drops the administrative_areas table", async () => {
    const executedQueries: unknown[] = [];
    const mockExecute = vi
      .fn<(q: unknown) => Promise<unknown>>()
      .mockImplementation((query: unknown) => {
        executedQueries.push(query);
        return Promise.resolve({ rows: [] });
      });

    const mockPayload = {
      db: {
        drizzle: {
          execute: mockExecute,
        },
      },
    };

    // SAFETY: Providing mock payload conforming to MigrateDownArgs shape.
    await down({
      db: mockPayload.db as never,
      payload: mockPayload as never,
      req: {} as never,
    });

    expect(mockExecute).toHaveBeenCalledOnce();
  });
});
