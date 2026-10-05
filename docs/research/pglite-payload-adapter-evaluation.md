# PGlite database adapter evaluation for Payload CMS in testing environments

**Author:** Technical Architecture Research **Date:** October 2026 **Status:** Completed **Target Repository:** Omset Digital (`packages/test-kit`)

---

## 1. Executive summary

Testing Payload CMS collections, lifecycle hooks, and database operations without a live PostgreSQL instance requires an in-memory SQL engine. The initial implementation of issue #100 introduced an in-tree PGlite adapter in `packages/test-kit/src/payload/database/pglite.ts`. While functional, that implementation spans two files and 184 lines of code because it emulates a `node-postgres` (`pg`) connection pool and client on top of PGlite.

The open-source repository `marcchapeau/payload-db-pglite` takes a different route. Instead of faking a `pg.Pool`, it connects Payload directly to `drizzle-orm/pglite`, which Drizzle ORM maintains as a first-class driver for PGlite.

This document evaluates the architecture of `marcchapeau/payload-db-pglite`, explains why the initial issue #100 implementation grew complex, and provides a stripped-down design tailored specifically for in-memory test environments.

### Key findings

| Implementation | Code Size | Core Strategy | Dependencies | Suitability for Test Kit |
| :-- | :-- | :-- | :-- | :-- |
| **In-tree issue #100** | 184 lines across 2 files | Emulate `pg.Pool` and `pg.PoolClient` to trick `@payloadcms/db-postgres` and `drizzle-orm/node-postgres` | `@payloadcms/db-postgres`, `@electric-sql/pglite`, `node:events` | High maintenance. Brittle query normalization, statement sniffing, and event emitter emulation. |
| **`payload-db-pglite`** | 250 lines across 4 files | Standalone adapter via `createDatabaseAdapter` and `drizzle-orm/pglite` | `@payloadcms/drizzle`, `drizzle-orm`, `@electric-sql/pglite`, `payload` | Production-ready general adapter. Contains migration generators, file storage, and legacy v2-to-v3 migrators unnecessary for tests. |
| **Stripped-down wrapper** | ~35 lines in 1 file | Re-use `@payloadcms/db-postgres` schema wiring, replace `connect` with `drizzle-orm/pglite` | `@payloadcms/db-postgres`, `@payloadcms/drizzle`, `drizzle-orm`, `@electric-sql/pglite` | **Recommended.** Eliminates all pool emulation while letting `@payloadcms/db-postgres` handle internal CRUD method bindings. |

---

## 2. Primary sources consulted

The analysis in this report is verified directly against source code and runtime behavior:

- **`marcchapeau/payload-db-pglite` repository (commit `01f68b8`):**
  - Adapter setup: `src/index.ts`
  - Connection lifecycle: `src/connect.ts`
  - Teardown: `src/destroy.ts`
  - Type declarations: `src/types.ts`
  - Manifest and peer dependencies: `package.json`
- **`drizzle-orm` package (`0.45.2`):**
  - Driver implementation: `drizzle-orm/pglite/driver.js`
  - Prepared query execution and rowMode handling: `drizzle-orm/pglite/session.js`
- **Payload CMS packages (`3.90.2`):**
  - `@payloadcms/db-postgres`: `dist/index.js` and `dist/connect.js`
  - `@payloadcms/drizzle`: `dist/utilities/pushDevSchema.js` and `dist/postgres/requireDrizzleKit.js`
  - `payload`: `createDatabaseAdapter` contract
- **ElectricSQL PGlite (`@electric-sql/pglite` `0.5.8`):**
  - `PGlite.query` vs `PGlite.exec` API contracts
  - Single-connection in-memory lifecycle (`memory://`)
- **Omset Digital test-kit (`packages/test-kit`):**
  - Adapter implementation: `src/payload/database/pglite.ts` and `src/payload/database/pgliteClient.ts`
  - Reset runner: `src/payload/resetDatabase.ts`
  - Factory: `src/payload/createTestPayload.ts`

---

## 3. How `marcchapeau/payload-db-pglite` works

The `payload-db-pglite` package is a standalone database adapter for Payload CMS. It does not depend on `@payloadcms/db-postgres` or the `pg` package.

### Architecture

```
+-------------------------------------------------------------+
|                        Payload CMS                          |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                 payload-db-pglite Adapter                   |
|  - Wires @payloadcms/drizzle operations (find, create, etc) |
|  - Sets transactionOptions: false                           |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                     drizzle-orm/pglite                      |
|  - First-party Drizzle dialect for PGlite                   |
|  - Native handling of rowMode ('array' | 'object')          |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                    @electric-sql/pglite                     |
|  - Single-instance PostgreSQL compiled to WASM              |
+-------------------------------------------------------------+
```

### Key mechanics in `payload-db-pglite`

1. **Native Drizzle PGlite driver**: In `src/connect.ts`, the adapter instantiates Drizzle using `drizzle-orm/pglite`:

   ```ts
   import { drizzle } from "drizzle-orm/pglite";
   import { PGlite } from "@electric-sql/pglite";

   this.pglite = new PGlite(dataDir);
   await this.pglite.waitReady;

   this.drizzle = drizzle({
     client: this.pglite,
     logger: this.logger || false,
     schema: this.schema,
   });
   ```

   Because Drizzle already provides a dedicated driver for PGlite, it handles type parsers, row modes, and query building without intermediate abstraction layers.

2. **Core Payload Drizzle operations**: In `src/index.ts`, it calls Payload's `createDatabaseAdapter` directly. It passes the standard PostgreSQL query handlers from `@payloadcms/drizzle` (`find`, `create`, `updateOne`, `deleteMany`, `count`, etc.) and `@payloadcms/drizzle/postgres` (`createJSONQuery`, `createExtensions`, `execute`).

3. **Disabled transactions by default**: In `src/types.ts` and `src/index.ts`, `transactionOptions` defaults to `false`. PGlite is single-connection and in-process. Concurrent transactions on a single connection block or deadlock. Setting `transactionOptions: false` tells Payload to use `defaultBeginTransaction()`, which returns no-op transaction boundaries.

4. **Dynamic schema pushing**: In `src/connect.ts`, the adapter runs `await pushDevSchema(this)`. Drizzle Kit's `pushSchema` inspects the PGlite database and applies required DDL statements directly to the WASM database instance.

### Features in `payload-db-pglite` unnecessary for test environments

Because `payload-db-pglite` is designed as a general-purpose package, it includes features that an in-memory test environment does not need:

- **Persistent filesystem storage**: Resolves paths for `./pglite-data` directories. Tests only use `memory://`.
- **Production migration commands**: Implements `migrate`, `migrateDown`, `migrateFresh`, `migrateReset`, and `migrateStatus`. Tests never run migration files; they push schema dynamically.
- **Migration file generators**: Sets up `createMigration`, `buildCreateMigration`, and `findMigrationDir`. Tests do not generate migration artifacts.
- **Legacy v2-to-v3 migrator**: Includes `blocksToJsonMigrator`. Fresh test databases have no legacy v2 documents to migrate.
- **Hot-reloading handlers**: Connect options include `hotReload` flags for dev server recompilation. Vitest runs do not hot-reload database connections.
- **Configurable table suffixes**: Options for `localesSuffix`, `relationshipsSuffix`, and `versionsSuffix` replicate defaults already provided by Payload core.

---

## 4. Why the issue #100 implementation became complicated

The issue #100 implementation in `packages/test-kit` attempted to re-use `@payloadcms/db-postgres` directly.

`@payloadcms/db-postgres` has a hard dependency on `drizzle-orm/node-postgres`. Its internal `connect.js` executes:

```js
this.pool = new this.pg.Pool(this.poolOptions);
this.drizzle = drizzle({ client: this.pool, logger, schema: this.schema });
```

Because `drizzle-orm/node-postgres` expects a `node-postgres` `Pool` instance, passing PGlite directly failed. To satisfy `drizzle-orm/node-postgres`, the agent wrote:

1. **`PGlitePoolClient` (`pgliteClient.ts`)**:
   - Subclassed `EventEmitter` from `node:events`.
   - Implemented `query` and dummy `release()`.

2. **`PGlitePool` (`pglite.ts`)**:
   - Subclassed `EventEmitter`.
   - Handled `connect()` returning `PGlitePoolClient`.
   - Implemented `normalizeQuery` to parse `QueryConfigLike` objects versus SQL strings, mapping `rowMode: "array"` for Drizzle projection queries.
   - Implemented `executeMultiStatement` to detect multi-statement DDL queries via semicolon string inspection and route them to `pglite.exec()` instead of `pglite.query()`.
   - Emulated `node-postgres` query result metadata (`command`, `fields`, `rowCount`, `rows`).

3. **Duck-typed module override**:
   - Injected a fake `pg` object with `{ Pool: function Pool() { return pool; } }`.

This created a mock `node-postgres` driver layer purely to feed `drizzle-orm/node-postgres`, despite Drizzle already possessing a native PGlite driver.

---

## 5. Recommended stripped-down implementation

Instead of emulating `node-postgres` (184 lines) or writing a standalone adapter with 40 manual method bindings (250 lines), we can combine the strengths of both:

Use `@payloadcms/db-postgres` to supply the standard Drizzle method bindings, but override `connect` and `destroy` to use `drizzle-orm/pglite` and `memory://`.

### Verified architecture

```ts
import { PGlite } from "@electric-sql/pglite";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { pushDevSchema } from "@payloadcms/drizzle";
import { drizzle } from "drizzle-orm/pglite";
import type { DatabaseAdapterObj } from "payload";

export const createPgLiteAdapter = (): DatabaseAdapterObj => {
  const pglite = new PGlite("memory://");

  const baseDb = postgresAdapter({
    disableCreateDatabase: true,
    pool: {} as never,
    transactionOptions: false,
  });

  return {
    ...baseDb,
    init: (args) => {
      const adapter = baseDb.init(args);

      // Expose pglite directly on adapter and duck-typed pool for resetDatabase
      adapter.pglite = pglite;
      adapter.pool = pglite as never;

      adapter.connect = async function connect() {
        await pglite.waitReady;

        this.drizzle = drizzle({
          client: pglite,
          logger: this.logger || false,
          schema: this.schema,
        });

        await this.createExtensions();
        await pushDevSchema(this);

        this.resolveInitializing?.();
      };

      adapter.destroy = async function destroy() {
        if (!pglite.closed) {
          await pglite.close();
        }
      };

      return adapter;
    },
  };
};
```

### Why this design is simpler

1. **Deletes `pgliteClient.ts` completely**: No `PGlitePoolClient`, no `QueryConfigLike`, no `QueryResultLike`.
2. **Deletes pool and query emulation**: No `EventEmitter`, no `normalizeQuery`, no `rowMode` re-mapping, no semicolon sniffing for multi-statement execution. `drizzle-orm/pglite` handles all query translation natively.
3. **Zero boilerplate method imports**: `@payloadcms/db-postgres` provides all 40+ CRUD handlers (`find`, `create`, `update`, `delete`, schema generators, operators) already wired to Payload. We only replace the connection setup.
4. **Native compatibility with `resetDatabase`**: `resetPostgresDatabase` queries `db.pool.query("SELECT tablename FROM pg_tables...")` and runs `TRUNCATE TABLE ... RESTART IDENTITY CASCADE`. PGlite's native `.query(sql, params)` accepts parameterized queries and returns `{ rows: [...] }`, matching the interface without wrappers.
5. **Fast execution**: In-memory startup, schema push, document creation, query retrieval, and teardown completed in 10.8 seconds in test verification.

---

## 6. Comparison of implementation options

| Feature | Current In-Tree (Issue #100) | Standalone (`payload-db-pglite` pattern) | Stripped-Down Wrapper (Recommended) |
| :-- | :-- | :-- | :-- |
| **Files** | 2 (`pglite.ts`, `pgliteClient.ts`) | 3 or 4 (`index.ts`, `connect.ts`, `types.ts`) | 1 (`pglite.ts`) |
| **Lines of code** | 184 lines | ~130 lines (stripped) to 250 lines (full) | ~40 lines |
| **Driver layer** | `drizzle-orm/node-postgres` | `drizzle-orm/pglite` | `drizzle-orm/pglite` |
| **Driver emulation** | Hand-rolled `pg.Pool` and `EventEmitter` | None (native) | None (native) |
| **Payload CRUD wiring** | Inherited from `@payloadcms/db-postgres` | Manually imported (40+ functions) | Inherited from `@payloadcms/db-postgres` |
| **Storage mode** | `memory://` | Configurable (`./pglite-data` or `memory://`) | `memory://` |
| **Migrations** | None (dynamic push) | Full production migration runners | None (dynamic push) |
| **Test reset compatibility** | Duck-typed pool | Requires custom reset or attaching `pglite` | Direct `adapter.pool = pglite` |

---

## 7. Next steps for the repository

1. Replace `packages/test-kit/src/payload/database/pglite.ts` with the stripped-down adapter using `drizzle-orm/pglite`.
2. Remove `packages/test-kit/src/payload/database/pgliteClient.ts`.
3. Simplify `packages/test-kit/src/payload/database/pglite.test.ts` to focus on adapter initialization, schema generation, and document lifecycle rather than unit-testing a fake connection pool.
4. Run `bun run test:unit` and `bun run test:integration` in `packages/test-kit` to verify zero regressions.
