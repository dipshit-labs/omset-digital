import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

import { createPgLiteAdapter } from "./pglite";
import type { PgLiteAdapterInstance } from "./pglite";

describe(
  "@repo/test-kit createPgLiteAdapter adapter lifecycle seam",
  { timeout: 15_000 },
  () => {
    it("returns DatabaseAdapterObj with name postgres and init function", () => {
      const adapterObj = createPgLiteAdapter();

      expect(adapterObj).toBeDefined();
      expect(adapterObj.name).toBe("postgres");
      expect(adapterObj.defaultIDType).toBe("number");
      expect(adapterObj.init).toBeTypeOf("function");
    });

    it("initializes adapter instance exposing pglite and duck-typed query pool", () => {
      const adapterObj = createPgLiteAdapter();
      // SAFETY: Minimal mock payload required for adapter.init returning PgLiteAdapterInstance.
      const instance = adapterObj.init({
        payload: {},
      } as never) as PgLiteAdapterInstance;

      expect(instance).toBeDefined();
      expect(instance.pglite).toBeInstanceOf(PGlite);
      expect(instance.pool).toBeDefined();
      expect(instance.pool.query).toBeTypeOf("function");
    });

    it("connects and exposes drizzle instance on adapter", async () => {
      const adapterObj = createPgLiteAdapter();
      const mockPayload = {
        config: {},
        logger: {
          error: () => {},
          info: () => {},
          warn: () => {},
        },
      };
      // SAFETY: Minimal mock payload required for adapter.init returning PgLiteAdapterInstance.
      const instance = adapterObj.init({
        payload: mockPayload,
      } as never) as PgLiteAdapterInstance;

      try {
        await instance.connect?.();
        expect(instance.drizzle).toBeDefined();
      } finally {
        await instance.destroy?.();
      }
    });

    it("destroys adapter and closes underlying pglite instance cleanly", async () => {
      const adapterObj = createPgLiteAdapter();
      // SAFETY: Minimal mock payload required for adapter.init returning PgLiteAdapterInstance.
      const instance = adapterObj.init({
        payload: {},
      } as never) as PgLiteAdapterInstance;

      expect(instance.destroy).toBeTypeOf("function");
      await expect(instance.destroy?.()).resolves.toBeUndefined();
      expect(instance.pglite.closed).toBeTruthy();
    });
  }
);
