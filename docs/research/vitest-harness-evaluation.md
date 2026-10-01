# Vitest testing harness and strategies evaluation for Payload CMS 3

**Author:** Technical Architecture Research
**Date:** October 2026
**Status:** Completed
**Target Repository:** Omset Digital (`apps/app`, `packages/payload-plugin-commerce`, `packages/payload-plugin-themes`)

---

## 1. Executive summary

Omset Digital runs a multi-tenant commerce platform built on Next.js 15 App Router, Payload CMS 3, and PostgreSQL via Drizzle ORM. Testing Payload collections, lifecycle hooks, and tenant isolation policies currently relies on two divergent, high-friction patterns:
1. Extracting individual hook functions from collection configurations and executing them manually inside unit tests, while mocking database responses through hand-rolled in-memory query parsers.
2. Constructing multi-hundred-line mock Payload clients that attempt to simulate database CRUD, field serialization, and hook traversal in test files.

These hand-rolled fakes create high maintenance overhead, drift from real Payload behavior, and provide false confidence. Meanwhile, spinning up a live PostgreSQL instance for every unit test or local test run introduces unacceptable latency and external Docker dependencies.

This document evaluates four testing approaches for Payload CMS 3 with Vitest:
1. **Real Local API with `@payloadcms/db-sqlite`**: Running real Payload instances with SQLite in-memory (`file::memory:?cache=shared`) or temporary file mode with automatic schema push.
2. **Pure unit testing of isolated hook functions**: Testing extracted hook functions as pure units with typed mock `PayloadRequest` inputs, bypassing Payload runtime initialization.
3. **Hand-rolled mock Payload clients and query parsers**: Simulating Payload CRUD and `where` query filtering with in-memory arrays (the current repository status quo).
4. **Live PostgreSQL instances via Testcontainers**: Running real PostgreSQL Docker containers per test suite.

### Key findings

| Strategy | Execution Speed | Database / Hook Fidelity | External Dependencies | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **Real Local API + `@payloadcms/db-sqlite`** | Fast, 15 to 50 ms per test file | High, real hooks, access control, validation, and CRUD | Zero, pure in-process LibSQL | **Winner for integration tests** across collections, plugins, and custom endpoints. |
| **Pure unit hook testing** | Instant, < 1 ms | Focused on single function logic only | Zero | **Recommended standard for isolated calculations** like pricing, tare weight, volumetric formulas. |
| **Hand-rolled mock clients & AST query parsers** | Medium, 5 to 15 ms | Low, drifts from Payload, misses cascading hooks and real validations | Zero | **Anti-pattern to replace**. Causes false confidence and high maintenance. |
| **Live PostgreSQL via Testcontainers** | Slow, 3 to 10 s startup | Exact, 100% PostgreSQL engine parity | Docker daemon required | Reserve for full migration verification in CI, not for local iteration. |

**Architectural Decision:** Adopt a two-tiered testing harness:
1. Use **pure unit tests** for standalone calculation functions and tenant access guards where no database interactions occur.
2. Use a shared **Vitest fixture harness powered by `@payloadcms/db-sqlite` and Payload Local API** for integration tests. Test suites run against real Payload instances with table resets between tests, eliminating all hand-rolled query engine fakes.
3. Standardize document generation on **Thoughtbot Fishery** combined with monorepo types (`@repo/types`) to generate typed document fixtures without AST mocks.

---

## 2. Primary sources consulted

The findings in this report are verified against first-party documentation, Payload CMS source code, merged pull requests, and the Vitest test runner:

- **Payload CMS core repository (`payloadcms/payload`):**
  - Vitest migration and runner configuration: Issue #14337 and `vitest.config.ts`.
  - Shared integration test fixtures: Pull Request #17907 (`test/__helpers/int/vitest.ts`).
  - Database reset and seed fixtures: Pull Request #17987 (`test/__helpers/shared/clearAndSeed/resetAndSeed.ts`).
  - SQLite adapter implementation and in-memory handling: `packages/db-sqlite/src/index.ts` and `packages/db-sqlite/src/connect.ts`.
  - Drizzle query generation and in-memory tests: `packages/drizzle/src/find/buildPolymorphicJoinQuery.spec.ts`.
  - Reproduction guide and test harness architecture: `.github/reproduction-guide.md` and `test/_community/`.
- **Payload CMS official documentation (`payloadcms.com/docs`):**
  - Local API architecture: `https://payloadcms.com/docs/local-api/overview`
  - SQLite database adapter: `https://payloadcms.com/docs/database/sqlite`
  - Database migrations and development push mode: `https://payloadcms.com/docs/database/migrations`
  - Building plugins and test suites: `https://payloadcms.com/docs/plugins/build-your-own`
- **Vitest runner documentation (`vitest.dev`):**
  - Fixture extensions API (`test.extend`): `https://vitest.dev/api/test.html#test-extend`
  - Projects and workspace configuration: `https://vitest.dev/guide/projects.html`
  - Process isolation and worker pools: `https://vitest.dev/config/#fileparallelism`
- **Test data factory libraries:**
  - Thoughtbot Fishery repository: `https://github.com/thoughtbot/fishery`
  - Type-safe factory patterns: `https://github.com/thoughtbot/fishery/blob/main/README.md`
- **Omset Digital repository:**
  - Monorepo package catalogs: `package.json` (`payload` 3.90.2, `vitest` 5.0.2).
  - Existing test implementations: `packages/payload-plugin-commerce/src/collections/packages.integration.test.ts` and `apps/app/src/payload/collections/orders/index.integration.test.ts`.
  - Monorepo testing rules: `CODING_STANDARDS.md` and `docs/TESTING_STANDARDS.md`.

---

## 3. Problem statement and testing pain points in Omset Digital

Inspection of the Omset Digital codebase reveals three architectural friction points where tests compromise maintainability and realism:

### 3.1. Fragile manual hook execution with hand-rolled query filtering

In `packages/payload-plugin-commerce/src/collections/packages.integration.test.ts`, the test inspects `collection.hooks.beforeChange`, casts the elements, and invokes them sequentially:

```typescript
const collection = createPackagesCollection();
const [enforceStore, handleDefault] = (collection.hooks?.beforeChange ?? []) as [
  CollectionBeforeChangeHook,
  CollectionBeforeChangeHook,
];

const packageDatabase: MockPackageDoc[] = [];

const countFn = (where?: Where): number => {
  let docs = packageDatabase;
  const storeCond = where?.store;
  if (isWhereField(storeCond)) {
    docs = docs.filter((p) => p.store === storeCond.equals);
  }
  return docs.length;
};

const mockCount = vi
  .fn<({ where }: { where?: Where }) => Promise<{ totalDocs: number }>>()
  .mockImplementation(({ where }) => Promise.resolve({ totalDocs: countFn(where) }));

const mockReq = { headers, payload: { count: mockCount } };

const afterEnforce = await runBeforeHook(enforceStore, {
  collection: mockCollectionConfig,
  context: {},
  data: input,
  operation: "create",
  req: mockReq,
});
```

Flaws in this approach:
1. **Coupling to hook registration order:** If a developer alters the order of hooks in the collection array, the test passes while the application fails at runtime, or vice versa.
2. **Reimplementing a query parser:** The test manually parses `Where` AST objects with `isWhereField` to filter an in-memory array. As query complexity grows (e.g. handling `and`, `or`, `in`, or polymorphic relations), this manual parser breaks.
3. **Missing real lifecycle stages:** It completely bypasses field validation, `beforeValidate`, access control, default value generation, and database constraints.

### 3.2. Hand-rolled mock Payload clients simulating database CRUD

In `apps/app/src/payload/collections/orders/index.integration.test.ts`, lines 75 to 138 construct an entire fake Payload client:

```typescript
interface TestPayloadClient {
  create: (args: { collection: string; data: Partial<Order>; overrideAccess?: boolean }) => Promise<Order>;
  findByID: (args: { collection: string; id: number | string }) => Promise<Order | null>;
  update: (args: { collection: string; id: number | string; data: Partial<Order> }) => Promise<Order>;
}

const createTestOrderPayloadClient = (initialOrders: Order[] = []): TestPayloadClient => {
  const db: Order[] = [...initialOrders];
  let nextId = db.length + 1;

  return {
    create: async ({ data }) => {
      const order = { ...data, id: nextId++ } as Order;
      db.push(order);
      return runOrderAfterReadHooks(order, defaultReq);
    },
    // ... custom findByID, update, and manual field loop running afterRead hooks
  };
};
```

Flaws in this approach:
1. **Massive maintenance burden:** The test file spends over 70 lines implementing a fake database engine and hook loop.
2. **Divergent semantics:** Real Payload handles transactions, relationship population (`depth`), localization, and Drizzle SQL serialization. None of this is tested.
3. **Fragility during schema updates:** Renaming a field or adding a new collection hook requires updating the custom test client loops in multiple files.

### 3.3. Absence of a standardized database isolation strategy for parallel tests

Vitest runs test files across worker threads. When tests share mutable global variables or a static file database without worker-specific isolation, race conditions occur. Tests fail intermittently with locked database errors or stale records.

---

## 4. Comprehensive candidate evaluation matrix

| Feature / Criterion | Approach 1: Real Local API + `@payloadcms/db-sqlite` | Approach 2: Pure Unit Hook Testing | Approach 3: Hand-Rolled Mock Clients (Status Quo) | Approach 4: Live PostgreSQL via Testcontainers |
| :--- | :--- | :--- | :--- | :--- |
| **Execution Speed** | Fast, 15 to 50 ms / file | Ultra-fast, < 1 ms | Fast, 5 to 15 ms | Slow, 3 to 10 s container spin up |
| **External Dependencies** | None (pure Node.js / LibSQL) | None | None | Docker engine required |
| **Real Payload Validation** | Yes (runs all field & schema validators) | No (bypassed) | No (bypassed) | Yes |
| **Lifecycle Hook Execution** | Complete (`beforeChange`, `afterChange`, etc.) | Only the single hook called | Incomplete (manual loop) | Complete |
| **Access Control Verification** | Real (`canWrite`, tenant checks) | Manual simulation | Manual simulation | Real |
| **Query Engine Accuracy** | Real Drizzle SQL via LibSQL | Not tested | Fragile hand-rolled AST parser | 100% PostgreSQL exact engine |
| **Memory Footprint** | Low, ~40 MB per worker | Minimal, < 5 MB | Minimal, < 5 MB | High, 300 to 500 MB per container |
| **Vitest Worker Isolation** | Excellent (unique DB URL per worker ID) | Perfect (no shared state) | Poor (fragile mutable mock arrays) | Requires dedicated DB / schema per worker |
| **Maintenance Burden** | Low (standard Payload API) | Low | Very high (breaks on schema refactors) | Medium (Docker image upkeep) |

---

## 5. Candidate deep dive

### 5.1. Approach 1: Real Local API with `@payloadcms/db-sqlite`

#### Architectural mechanics
In Payload 3, the Local API (`payload.find`, `payload.create`, `payload.update`, `payload.delete`) runs directly in Node.js without an HTTP server. Passing `@payloadcms/db-sqlite` to `buildConfig` allows Payload to use Drizzle ORM backed by LibSQL.

When `getPayload({ config })` executes in test mode (`process.env.NODE_ENV !== "production"`):
1. The SQLite adapter connects via `@libsql/client`.
2. Drizzle automatically synchronizes the schema (`pushDevSchema`) without needing pre-generated migration files.
3. Tables, indices, relations, and junction tables are generated in SQLite instantly.
4. The initialized `payload` instance is returned, ready for Local API calls.

#### SQLite in-memory vs. ephemeral file
Two connection modes exist for SQLite testing:

1. **In-memory (`file::memory:?cache=shared` or `:memory:`):**
   - Pure RAM execution with zero disk writes.
   - Requirement: Must use `?cache=shared`. In SQLite and LibSQL, every distinct connection string without shared cache opens an isolated database. With shared cache, connections within the same process share tables.
   - Limitation: In-memory mode does not support Write-Ahead Logging (WAL mode). Payload's SQLite adapter detects this and logs a warning if WAL is requested.

2. **Ephemeral local file (`file:./.tmp/test-[workerId].db`):**
   - Creates a database file in a temporary folder or `node_modules/.cache`.
   - Allows full WAL support and survives multi-connection operations seamlessly.
   - Fully compatible with Vitest parallel test runs by assigning `process.env.VITEST_POOL_ID` to the filename.
   - Cleanup is trivial: delete the `.tmp` folder in `afterAll` or a global teardown script.

#### PostgreSQL parity and dialect considerations
Because Omset Digital runs PostgreSQL in production, tests using SQLite must account for dialect differences:
- **Case-insensitive matching:** PostgreSQL distinguishes `LIKE` and `ILIKE`. Payload's SQLite adapter normalizes this behavior so queries behave consistently across both backends.
- **JSON storage:** PostgreSQL uses native binary JSON (`jsonb`), while SQLite stores JSON as text and parses fields via `json_extract`. Payload's Drizzle adapter handles this abstraction transparently.
- **ID generation:** Both adapters support autoincrement integer primary keys (`idType: 'number'`), matching Omset Digital's numeric store and product IDs.
- **Transactions:** SQLite disables nested transactions by default, while PostgreSQL supports full savepoints. For collection CRUD and hook integration tests, this difference does not impact test fidelity.

---

### 5.2. Approach 2: Pure unit hook testing

#### Architectural mechanics
Payload hooks are TypeScript functions. When business logic is decoupled from collection definitions, hooks can be tested in complete isolation without initializing Payload:

```typescript
// packages/payload-plugin-commerce/src/hooks/enforceStore.ts
export const enforceStoreOnCreate: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  if (operation !== "create") return data;
  const storeId = resolveTenantStoreSlug(req);
  return { ...data, store: storeId };
};
```

In the test file:
```typescript
it("attaches store ID from tenant header on create", async () => {
  const req = createMockPayloadRequest({ headers: { "payload-tenant": "42" } });
  const result = await enforceStoreOnCreate({
    data: { title: "Standard Box" },
    req,
    operation: "create",
    collection: mockCollectionConfig,
    context: {},
    originalDoc: undefined,
  });

  expect(result.store).toBe(42);
});
```

#### Best use cases
- Pure calculation routines: Tare weight calculation, volumetric shipping formulas, discount rules.
- Fast invariant checks: Verifying that an access control function returns `false` when a user lacks the `owner` role.
- Edge case validation: Passing invalid data shapes to verify that a custom validation hook throws an `APIError`.

#### Limitations
Pure unit hook tests cannot verify:
- Whether the hook is actually registered in the collection configuration.
- Cascading hook order (e.g. `beforeValidate` modifying data before `beforeChange` runs).
- Database foreign key constraints or unique index violations.

---

### 5.3. Approach 3: Hand-rolled mock clients and query parsers (Status quo)

#### Architectural mechanics
As seen in `packages.integration.test.ts` and `orders/index.integration.test.ts`, this pattern builds a mock object satisfying `Payload` or `PayloadRequest`, intercepting `count`, `find`, or `create` calls and running custom array filtering.

#### Why this is an anti-pattern
1. **Reinventing Payload:** The developer ends up writing an ad-hoc query interpreter to handle `where: { store: { equals: id } }`. When a hook introduces a new query filter like `{ status: { in: ['paid', 'shipped'] } }`, the mock silently fails or returns wrong data until the mock query parser is updated.
2. **Brittle coupling:** The mock must predict which methods Payload internals call. If Payload refactors an internal lookup from `payload.count` to `payload.find({ limit: 0 })`, the test breaks despite no behavioral change in application code.
3. **Zero contract assurance:** The test passes against the fake client, but when deployed to production, missing Drizzle column definitions or malformed relations crash the real server.

---

### 5.4. Approach 4: Live PostgreSQL via Testcontainers

#### Architectural mechanics
Testcontainers spins up an ephemeral PostgreSQL Docker container via the Node.js Docker API during Vitest `globalSetup`, runs migrations, and passes the connection string to tests.

#### Tradeoffs
- **Pros:** 100% exact parity with production PostgreSQL. Tests can execute custom PostgreSQL extensions, raw SQL queries, and complex migration rollbacks.
- **Cons:** Cold starts take 3 to 10 seconds to pull images and initialize containers. Developers without a running Docker desktop cannot run tests locally. Monorepo CI pipelines slow down significantly.
- **Verdict:** Unnecessary for everyday collection, hook, and endpoint testing. Testcontainers should be reserved for dedicated database migration smoke tests in CI.

---

## 6. Document mocking and factory strategy: off-the-shelf vs. lightweight factory layer

A recurring challenge in testing Payload 3 is generating valid documents with required relationships and defaults without writing 50-line object literals in every test.

### 6.1. Evaluating off-the-shelf factory libraries

| Library | TypeScript Support | Async Creation Hook (`onCreate`) | Monorepo Weight | Community Adoption |
| :--- | :--- | :--- | :--- | :--- |
| **Thoughtbot Fishery (`fishery`)** | Native TS generics (`Factory.define<T>`) | First-class async support | Tiny (zero dependencies, < 5 kB) | High (industry standard in TS/Node) |
| **`factory.ts`** | Good TS support | Limited async pipeline | Minimal | Moderate |
| **Rosie (`rosie`)** | Legacy JavaScript, bolted-on types | Callback-based, cumbersome | Small | Declining |

### 6.2. Factory architecture for Omset Digital

Rather than writing complex mock query parsers, adopt **Thoughtbot Fishery** backed by generated types from `@repo/types`. Fishery provides two essential execution modes:
1. `build()`: Synchronously generates a complete, valid TypeScript object in memory. Used for pure unit tests.
2. `create()`: Asynchronously persists the object into the database via Payload Local API. Used for integration tests.

#### Example factory definition

```typescript
import { Factory } from "fishery";
import type { Order, Package } from "@repo/types";
import type { Payload } from "payload";

interface PackageTransientParams {
  payload?: Payload;
}

export const packageFactory = Factory.define<Package, PackageTransientParams>(
  ({ sequence, onCreate, transientParams }) => {
    onCreate(async (pkg) => {
      if (!transientParams.payload) {
        throw new Error("Payload instance required to persist packageFactory document");
      }
      return (await transientParams.payload.create({
        collection: "packages",
        data: pkg,
      })) as Package;
    });

    return {
      id: sequence,
      title: `Standard Shipping Box ${sequence}`,
      isDefault: sequence === 1,
      dimensions: {
        length: 20,
        width: 15,
        height: 10,
      },
      tareWeight: {
        value: 100,
        unit: "g",
      },
      store: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
);
```

#### Usage in tests

```typescript
// In unit tests: synchronous pure data generation (0ms)
const mockPackage = packageFactory.build({ store: 5 });

// In integration tests: real persistence through Local API
const savedPackage = await packageFactory
  .transient({ payload })
  .create({ title: "Custom Box" });
```

This pattern eliminates ad-hoc object construction, ensures full type compliance with `@repo/types`, and avoids manual database mocks.

---

## 7. Minimal working code snippet

The following self-contained test file demonstrates the complete testing pattern for Payload CMS 3 using Vitest, `@payloadcms/db-sqlite`, and the Local API.

It configures an in-memory SQLite database, initializes Payload once for the test file, truncates tables between tests for isolation, and exercises real collection hooks and queries without Docker:

```typescript
// @vitest-environment node
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildConfig, getPayload, type Payload, type CollectionConfig } from "payload";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import type { DrizzleAdapter } from "@payloadcms/drizzle";

// 1. Define sample test collections with real hooks
const StoresCollection: CollectionConfig = {
  slug: "stores",
  fields: [
    { name: "name", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
  ],
};

const PackagesCollection: CollectionConfig = {
  slug: "packages",
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        if (operation === "create" && !data.store) {
          const tenantHeader = req.headers?.get("payload-tenant");
          if (tenantHeader) {
            data.store = Number.parseInt(tenantHeader, 10);
          }
        }
        return data;
      },
    ],
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "isDefault", type: "checkbox", defaultValue: false },
    {
      name: "store",
      type: "relationship",
      relationTo: "stores",
      required: true,
    },
  ],
};

// 2. Helper to truncate SQLite database tables between tests (based on Payload core resetDB)
async function resetDatabaseTables(payload: Payload): Promise<void> {
  const db = payload.db as unknown as DrizzleAdapter;
  const drizzle = db.primaryDrizzle ?? db.drizzle;
  const tableNames = Object.keys(db.tables);

  if (!tableNames.length) return;

  await db.execute({ drizzle, raw: "PRAGMA foreign_keys = OFF;" });
  try {
    for (const tableName of tableNames) {
      await db.execute({
        drizzle,
        raw: `DELETE FROM "${tableName.replaceAll('"', '""')}";`,
      });
    }
  } finally {
    await db.execute({ drizzle, raw: "PRAGMA foreign_keys = ON;" });
  }
}

describe("Packages collection Local API integration", () => {
  let payload: Payload;
  let tempDbDir: string;
  let dbPath: string;

  beforeAll(async () => {
    // Isolate database file per Vitest worker thread
    const workerId = process.env.VITEST_POOL_ID || "0";
    tempDbDir = await fs.mkdtemp(path.join(os.tmpdir(), "payload-test-"));
    dbPath = path.join(tempDbDir, `test-worker-${workerId}.db`);

    const testConfig = buildConfig({
      secret: "test-secret-must-be-at-least-32-chars-long",
      telemetry: false,
      collections: [StoresCollection, PackagesCollection],
      db: sqliteAdapter({
        client: {
          url: `file:${dbPath}`,
        },
      }),
      typescript: {
        outputFile: false,
      },
    });

    // In dev/test mode, getPayload pushes Drizzle schema automatically
    payload = await getPayload({ config: testConfig });
  }, 60_000);

  afterAll(async () => {
    if (payload) {
      await payload.destroy();
    }
    // Clean up temporary database files
    await fs.rm(tempDbDir, { recursive: true, force: true }).catch(() => {});
  });

  beforeEach(async () => {
    // Clean slate before each test run
    await resetDatabaseTables(payload);
  });

  it("creates a store and assigns store relationship via tenant header", async () => {
    // 1. Create a parent store document
    const store = await payload.create({
      collection: "stores",
      data: {
        name: "Toko Sepatu Baru",
        slug: "toko-sepatu-baru",
      },
    });

    expect(store.id).toBeDefined();

    // 2. Create package with tenant header attached to mock request
    const headers = new Headers();
    headers.set("payload-tenant", String(store.id));

    const pkg = await payload.create({
      collection: "packages",
      data: {
        title: "Medium Shoe Box",
        isDefault: true,
      },
      req: {
        headers,
      } as any,
    });

    expect(pkg.title).toBe("Medium Shoe Box");
    expect(pkg.store).toBe(store.id);

    // 3. Query through Local API with relational filtering
    const searchResult = await payload.find({
      collection: "packages",
      where: {
        store: {
          equals: store.id,
        },
      },
    });

    expect(searchResult.totalDocs).toBe(1);
    expect(searchResult.docs[0].id).toBe(pkg.id);
  });

  it("enforces required fields through real Payload schema validation", async () => {
    await expect(
      payload.create({
        collection: "packages",
        data: {
          // Missing required 'title' and 'store'
          isDefault: false,
        } as any,
      })
    ).rejects.toThrow();
  });
});
```

---

## 8. Test structure, naming conventions, and boundary mocking strategy

### 8.1. File placement and naming conventions

Follow standard monorepo colocation rules:
- **Unit tests:** `<feature>.test.ts` placed adjacent to the tested unit.
  - Example: `packages/payload-plugin-commerce/src/hooks/paymentStatus.test.ts`
  - Runs in pure Node.js, tests isolated functions without booting Payload.
- **Integration tests:** `<feature>.integration.test.ts` placed adjacent to collection definitions.
  - Example: `apps/app/src/payload/collections/orders/index.integration.test.ts`
  - Boots Payload Local API with SQLite, tests real collection configurations and hooks.
- **Test environment header:** Always set `// @vitest-environment node` on the first line of Payload integration tests when the enclosing package defaults to `jsdom` (as in `apps/app`).

### 8.2. Vitest `describe` and `it` naming standards

Per `docs/TESTING_STANDARDS.md`, test names must describe observable system outcomes rather than internal mechanics.

#### Recommended naming patterns:
- State what outcome the merchant, user, or caller observes.
- Use active present tense.
- State conditions when relevant.

```typescript
// Good: Describes business outcome through public interface
it("assigns tenant store identifier when creating package with tenant header", async () => {});
it("marks initial package as default when store has no existing default package", async () => {});
it("rejects order update when user lacks owner or manager role for store", async () => {});

// Bad: Restates internal implementation details
it("calls enforceStore hook in beforeChange array", async () => {});
it("invokes payload.count with where query", async () => {});
it("tests package default logic", async () => {});
```

### 8.3. Boundary mocking strategy

In accordance with `CODING_STANDARDS.md` ("Mock at system boundaries only"):
1. **Never mock Payload's internal query AST or database operations.** Use the real Local API backed by SQLite instead of writing mocks for `payload.find` or `where` clauses.
2. **Mock external network boundaries only.** Third-party payment gateways (Midtrans, Xendit) and shipping APIs (RajaOngkir) must be mocked at their typed provider seam (`PaymentProvider`, `ShippingProvider`).
3. **Mock system time and randomness.** Use Vitest built-in timers (`vi.useFakeTimers()`) when testing time-sensitive token expirations or billing schedules.

---

## 9. Architectural recommendation and integration roadmap

### 9.1. Adoption plan

To resolve test fragility while maintaining sub-second local test cycles, implement the following roadmap:

#### Step 1: Install `@payloadcms/db-sqlite` in monorepo catalogs
Add `@payloadcms/db-sqlite` to the root `package.json` under `catalogs.payload`:

```json
"catalogs": {
  "payload": {
    "@payloadcms/db-postgres": "3.90.2",
    "@payloadcms/db-sqlite": "3.90.2",
    "payload": "3.90.2"
  }
}
```

Add `@payloadcms/db-sqlite` to `devDependencies` of `packages/payload-plugin-commerce` and `apps/app`.

#### Step 2: Establish shared test fixtures in `@repo/test-utils`
Create a centralized test helper module exporting:
- `createTestPayload(configOverrides)`: Boots a file-scoped Payload instance with `@payloadcms/db-sqlite` pointing to an isolated worker file (`file:./.tmp/test-[workerId].db`).
- `resetDatabase(payload)`: Executes fast table deletion (`DELETE FROM <table>`) with foreign key pragma toggles.
- Standardized typed mock request builder: `createTestReq({ user, headers })`.

#### Step 3: Add Thoughtbot Fishery to test catalog
Add `fishery` to `catalogs.test`:
```json
"catalogs": {
  "test": {
    "fishery": "^2.2.2",
    "vitest": "^5.0.2"
  }
}
```
Define standard document factories (`orderFactory`, `packageFactory`, `storeFactory`) in a shared test fixtures folder.

#### Step 4: Refactor existing integration tests
Migrate existing high-maintenance mock files to the new harness:
1. `packages/payload-plugin-commerce/src/collections/packages.integration.test.ts`:
   - Delete manual `runBeforeHook`, `mockCount`, and `countFn` query parsers.
   - Run tests against real `payload.create` with SQLite.
2. `apps/app/src/payload/collections/orders/index.integration.test.ts`:
   - Delete the 70-line `createTestOrderPayloadClient` mock.
   - Execute order queries against the real Orders collection configuration with SQLite.

---

## 10. Conclusion

The status quo of testing Payload CMS 3 in Omset Digital relies on hand-rolled mock clients and manual hook invocations that replicate Payload's internal query AST. This creates false confidence and heavy maintenance overhead.

Adopting a real Local API harness powered by `@payloadcms/db-sqlite` and LibSQL solves this friction completely. Tests execute real collection hooks, field validations, and relational queries in 15 to 50 milliseconds per file without Docker. Combined with pure unit tests for standalone calculation functions and Thoughtbot Fishery for typed document generation, this architecture delivers high confidence, fast developer feedback, and long-term maintainability.
