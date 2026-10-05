import type { Payload } from "payload";
import { describe, expect, it, vi } from "vitest";

import { createAppTestPayload } from "./payload";
import {
  dropPostgresWorkerSchema,
  getPostgresWorkerSchemaName,
  provisionPostgresWorkerSchema,
} from "./postgres";
import { resetDatabase } from "./reset";

describe("@repo/test-kit PostgreSQL worker schema utilities", () => {
  it("derives worker-scoped schema name from given pool id", () => {
    expect(getPostgresWorkerSchemaName("3")).toBe("test_worker_3");
  });

  it("derives default worker-scoped schema name when pool id is omitted", () => {
    const originalPoolId = process.env.VITEST_POOL_ID;
    delete process.env.VITEST_POOL_ID;
    try {
      expect(getPostgresWorkerSchemaName()).toBe("test_worker_0");
    } finally {
      if (originalPoolId !== undefined) {
        process.env.VITEST_POOL_ID = originalPoolId;
      }
    }
  });
});

describe("@repo/test-kit createAppTestPayload fail-fast validation", () => {
  it("fails fast when DATABASE_URL is unset", async () => {
    const originalUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      await expect(createAppTestPayload()).rejects.toThrow(
        "DATABASE_URL environment variable must be set to run application integration tests against PostgreSQL"
      );
    } finally {
      if (originalUrl !== undefined) {
        process.env.DATABASE_URL = originalUrl;
      }
    }
  });

  it("fails fast when DATABASE_URL is whitespace or empty string", async () => {
    const originalUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "   ";
    try {
      await expect(createAppTestPayload()).rejects.toThrow(
        "DATABASE_URL environment variable must be set to run application integration tests against PostgreSQL"
      );
    } finally {
      if (originalUrl === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = originalUrl;
      }
    }
  });
});

const createStubPostgresPayload = (
  schemaName: string,
  queryFn: (
    query: string,
    params?: unknown[]
  ) => Promise<{ rows?: { tablename?: string }[] }>
): Payload =>
  // SAFETY: Stub satisfies subset of Payload interface accessed by resetDatabase and dropPostgresWorkerSchema.
  ({
    db: {
      name: "postgres",
      pool: { query: queryFn },
      schemaName,
    },
  }) as never;

describe("@repo/test-kit PostgreSQL schema lifecycle and reset", () => {
  it("provisions schema with CREATE SCHEMA IF NOT EXISTS", async () => {
    const mockQuery = vi
      .fn<(query: string) => Promise<{ rows: unknown[] }>>()
      .mockResolvedValue({ rows: [] });
    const mockEnd = vi.fn<() => Promise<void>>().mockResolvedValue();
    const mockPool = {
      end: mockEnd,
      query: mockQuery,
    };

    await provisionPostgresWorkerSchema({
      pool: mockPool,
      schemaName: "test_worker_5",
    });

    expect(mockQuery).toHaveBeenCalledWith(
      'CREATE SCHEMA IF NOT EXISTS "test_worker_5";'
    );
    expect(mockEnd).toHaveBeenCalledWith();
  });

  it("truncates all tables within active schema during resetDatabase without dropping structure", async () => {
    const mockQuery = vi
      .fn<
        (
          query: string,
          params?: unknown[]
        ) => Promise<{ rows: { tablename?: string }[] }>
      >()
      .mockImplementation((query: string) => {
        if (query.includes("pg_tables")) {
          return Promise.resolve({
            rows: [
              { tablename: "stores" },
              { tablename: "orders" },
              { tablename: "users" },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

    const fakePostgresPayload = createStubPostgresPayload(
      "test_worker_2",
      mockQuery
    );

    await resetDatabase(fakePostgresPayload);

    expect(mockQuery).toHaveBeenCalledWith(
      "SELECT tablename FROM pg_tables WHERE schemaname = $1;",
      ["test_worker_2"]
    );
    expect(mockQuery).toHaveBeenCalledWith(
      'TRUNCATE TABLE "test_worker_2"."stores", "test_worker_2"."orders", "test_worker_2"."users" RESTART IDENTITY CASCADE;'
    );
  });

  it("skips truncate in resetDatabase when active schema contains no tables", async () => {
    const mockQuery = vi
      .fn<
        (
          query: string,
          params?: unknown[]
        ) => Promise<{ rows: { tablename?: string }[] }>
      >()
      .mockResolvedValue({ rows: [] });

    const fakePostgresPayload = createStubPostgresPayload(
      "test_worker_2",
      mockQuery
    );

    await resetDatabase(fakePostgresPayload);

    expect(mockQuery).toHaveBeenCalledExactlyOnceWith(
      "SELECT tablename FROM pg_tables WHERE schemaname = $1;",
      ["test_worker_2"]
    );
  });

  it("drops worker-scoped schema with CASCADE cleanly on teardown", async () => {
    const mockQuery = vi
      .fn<
        (
          query: string,
          params?: unknown[]
        ) => Promise<{ rows: { tablename?: string }[] }>
      >()
      .mockResolvedValue({ rows: [] });

    const fakePostgresPayload = createStubPostgresPayload(
      "test_worker_9",
      mockQuery
    );

    await dropPostgresWorkerSchema(fakePostgresPayload);

    expect(mockQuery).toHaveBeenCalledWith(
      'DROP SCHEMA IF EXISTS "test_worker_9" CASCADE;'
    );
  });
});
