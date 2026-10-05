import type { Payload } from "payload";
import { describe, expect, it, vi } from "vitest";

import { createAppTestPayload } from "../createTestPayload";
import { resetDatabase } from "../resetDatabase";
import {
  dropPostgresWorkerSchema,
  getPostgresWorkerSchemaName,
  provisionPostgresWorkerSchema,
  truncatePostgresTables,
} from "./postgres";

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
  it("fails fast when TEST_DATABASE_URL and DATABASE_URL are unset", async () => {
    const originalTestUrl = process.env.TEST_DATABASE_URL;
    const originalUrl = process.env.DATABASE_URL;
    delete process.env.TEST_DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      await expect(createAppTestPayload()).rejects.toThrow(
        "TEST_DATABASE_URL environment variable must be set to run application integration tests against PostgreSQL"
      );
    } finally {
      if (originalTestUrl !== undefined) {
        process.env.TEST_DATABASE_URL = originalTestUrl;
      }
      if (originalUrl !== undefined) {
        process.env.DATABASE_URL = originalUrl;
      }
    }
  });

  it("fails fast when connection string is whitespace or empty string", async () => {
    const originalTestUrl = process.env.TEST_DATABASE_URL;
    const originalUrl = process.env.DATABASE_URL;
    process.env.TEST_DATABASE_URL = "   ";
    delete process.env.DATABASE_URL;
    try {
      await expect(createAppTestPayload()).rejects.toThrow(
        "TEST_DATABASE_URL environment variable must be set to run application integration tests against PostgreSQL"
      );
    } finally {
      if (originalTestUrl === undefined) {
        delete process.env.TEST_DATABASE_URL;
      } else {
        process.env.TEST_DATABASE_URL = originalTestUrl;
      }
      if (originalUrl !== undefined) {
        process.env.DATABASE_URL = originalUrl;
      }
    }
  });
});

const createStubPostgresPayload = (
  schemaName: string | undefined,
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
  it("drops dirty schema and recreates cleanly on startup", async () => {
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

    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      'DROP SCHEMA IF EXISTS "test_worker_5" CASCADE;'
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      'CREATE SCHEMA "test_worker_5";'
    );
    expect(mockEnd).toHaveBeenCalledWith();
  });

  it("invokes close() on pool objects that provide close instead of end during provisionPostgresWorkerSchema", async () => {
    const mockQuery = vi
      .fn<(query: string) => Promise<{ rows: unknown[] }>>()
      .mockResolvedValue({ rows: [] });
    const mockClose = vi.fn<() => Promise<void>>().mockResolvedValue();
    const mockCloseOnlyPool = {
      close: mockClose,
      query: mockQuery,
    };

    await provisionPostgresWorkerSchema({
      closePool: true,
      pool: mockCloseOnlyPool,
      schemaName: 'test_worker_"special"',
    });

    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      'DROP SCHEMA IF EXISTS "test_worker_""special""" CASCADE;'
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      'CREATE SCHEMA "test_worker_""special""";'
    );
    expect(mockClose).toHaveBeenCalledWith();
  });

  it("fails fast in provisionPostgresWorkerSchema when TEST_DATABASE_URL is unset", async () => {
    const originalTestUrl = process.env.TEST_DATABASE_URL;
    delete process.env.TEST_DATABASE_URL;
    try {
      await expect(provisionPostgresWorkerSchema()).rejects.toThrow(
        "TEST_DATABASE_URL environment variable must be set to run integration tests against PostgreSQL"
      );
    } finally {
      if (originalTestUrl !== undefined) {
        process.env.TEST_DATABASE_URL = originalTestUrl;
      }
    }
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

  it("defaults to public schema and ignores payload_migrations during resetDatabase", async () => {
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
              { tablename: "payload_migrations" },
              { tablename: "users" },
              { tablename: "articles" },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

    const pglitePayload = createStubPostgresPayload(undefined, mockQuery);

    await resetDatabase(pglitePayload);

    expect(mockQuery).toHaveBeenCalledWith(
      "SELECT tablename FROM pg_tables WHERE schemaname = $1;",
      ["public"]
    );
    expect(mockQuery).toHaveBeenCalledWith(
      'TRUNCATE TABLE "public"."users", "public"."articles" RESTART IDENTITY CASCADE;'
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

  it("drops worker schema using payload.db.execute when execute method is available", async () => {
    const mockExecute = vi
      .fn<(args: { raw: string }) => Promise<void>>()
      .mockResolvedValue();
    // SAFETY: Minimal stub satisfying Payload database interface for schema teardown.
    const payloadWithExecute = {
      db: {
        name: "postgres",
        execute: mockExecute,
        schemaName: "test_worker_execute",
      },
    } as never;

    await dropPostgresWorkerSchema(payloadWithExecute);

    expect(mockExecute).toHaveBeenCalledWith({
      raw: 'DROP SCHEMA IF EXISTS "test_worker_execute" CASCADE;',
    });
  });

  it("drops worker schema using target.pool when pool is provided directly", async () => {
    const mockQuery = vi
      .fn<(query: string) => Promise<{ rows: unknown[] }>>()
      .mockResolvedValue({ rows: [] });
    const mockPool = { query: mockQuery };

    await dropPostgresWorkerSchema({
      pool: mockPool,
      schemaName: "test_worker_custom_pool",
    });

    expect(mockQuery).toHaveBeenCalledWith(
      'DROP SCHEMA IF EXISTS "test_worker_custom_pool" CASCADE;'
    );
  });

  it("falls back to process.env.TEST_DATABASE_URL when connectionString is omitted", async () => {
    const mockQuery = vi
      .fn<(query: string) => Promise<{ rows: unknown[] }>>()
      .mockResolvedValue({ rows: [] });
    const mockEnd = vi.fn<() => Promise<void>>().mockResolvedValue();
    const mockPoolInstance = { end: mockEnd, query: mockQuery };

    // Pass pool directly to verify options typing allows omitting connectionString
    await dropPostgresWorkerSchema({
      pool: mockPoolInstance,
      schemaName: "test_worker_fallback",
    });

    expect(mockQuery).toHaveBeenCalledWith(
      'DROP SCHEMA IF EXISTS "test_worker_fallback" CASCADE;'
    );
  });

  it("truncates all tables within active schema and skips payload_migrations via truncatePostgresTables", async () => {
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
              { tablename: "payload_migrations" },
              { tablename: "stores" },
              { tablename: "products" },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

    const mockPool = { query: mockQuery };
    await truncatePostgresTables(mockPool, "test_worker_4");

    expect(mockQuery).toHaveBeenCalledWith(
      "SELECT tablename FROM pg_tables WHERE schemaname = $1;",
      ["test_worker_4"]
    );
    expect(mockQuery).toHaveBeenCalledWith(
      'TRUNCATE TABLE "test_worker_4"."stores", "test_worker_4"."products" RESTART IDENTITY CASCADE;'
    );
  });
});
