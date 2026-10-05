# Testing standards

Worked examples and implementation contracts for the testing rules defined in `CODING_STANDARDS.md`. Test observable behavior through public interfaces, and mock at external system boundaries only.

## Two tiers

Every test file in this monorepo belongs to one of two tiers.

**Tier 1, unit and UI tests (`src/**/*.test.{ts,tsx}`).** Pure functions, access predicates, calculations, and React components colocated directly beside their implementation file. Pure TypeScript tests (`.test.ts`) run on Node in under 1 ms via the `unit` project. Component tests (`.test.tsx`) render in JSDOM via the `ui` project. No database, no Payload boot.

**Tier 2, integration tests (`test/integrations/*.integration.test.ts`).** Tests verifying collection hooks, field validation, relational queries, and round-trip persistence through the real Payload Local API. Located in a flat `test/integrations/` directory at the package or app root, dispatched via the `integration` project (`environment: "node"`, `fileParallelism: false`). Packages run against in-memory PGlite. `apps/app` runs against worker-scoped PostgreSQL schemas.

When a feature needs both unit and relational verification, split test files: pure logic to colocated `src/`, Payload-backed tests to `test/integrations/`.

## Good tests

Integration tests exercise real code paths through public APIs. They describe what the system does, not how.

```typescript
// Good: Tests observable behavior through the real Payload Local API
it("assigns tenant store identifier when creating package with tenant header", async ({
  payload,
}) => {
  const store = await payload.create({
    collection: "stores",
    data: { name: "Toko Baru", slug: "toko-baru" },
  });
  const headers = new Headers();
  headers.set("payload-tenant", String(store.id));

  const pkg = await payload.create({
    collection: "packages",
    data: {
      title: "Medium Box",
      isDefault: false,
      dimensions: { length: 20, width: 15, height: 10 },
      tareWeight: { value: 100, unit: "g" },
    },
    req: { headers } as any,
  });

  expect(pkg.store).toBe(store.id);
});
```

- Test behavior that callers and merchants care about.
- Use exported functions and public APIs only.
- Survive internal refactors.
- Include one logical assertion per test.

## Anti-patterns and red flags

```typescript
// Bad: Mocks an internal collaborator, testing implementation rather than behavior
it("calls internal sync utility during theme registration", async () => {
  const spy = vi.spyOn(syncModule, "syncThemeForStore");
  await syncThemes(payload, manifest);
  expect(spy).toHaveBeenCalledOnce();
});

// Bad: Bypasses the public interface to query the database directly
it("registers store successfully", async () => {
  await createStore({ name: "Toko Kopi" });
  const rawRow = await postgresClient.query(
    "SELECT * FROM stores WHERE name = $1",
    ["Toko Kopi"]
  );
  expect(rawRow.rows).toHaveLength(1);
});

// Anti-pattern: Hand-rolled Payload mock bypasses collection hooks and validation
const createMockPayload = () => ({ find: vi.fn(), create: vi.fn() });
it("syncThemes creates default templates for store without existing theme", async () => {
  const fakePayload = createMockPayload();
  await syncThemes(fakePayload, manifest);
  expect(fakePayload.find).toHaveBeenCalled();
});

// Bad: Test restates the implementation without adding confidence
it("returns slug with prefix", () => {
  expect(formatSlug("toko-baru")).toBe("store-toko-baru");
});
```

Signs of brittle or low-confidence tests:

- Mocking internal collaborators or utility functions with `vi.mock`. Exercise the real implementation instead.
- Testing unexported private helper functions. Verify output through the public interface.
- Asserting on internal call counts or the sequence of internal steps instead of final state.
- Tests breaking after internal refactoring when observable behavior did not change.
- Test names describing how the code works instead of what outcome occurs.
- Verifying database rows directly when public collection APIs provide the read query.
- Testing trivial one-line mappings or string concatenations where the test mirrors the source code.
- Thin delegation tests for route handlers where the test only verifies that an action called a service. Test the service logic directly instead.
- Hand-rolled Payload mock clients (`createMockPayload`, `createTestOrderPayloadClient`) or manual hook runners. Use `@repo/test-kit` instead.

## `@repo/test-kit`

All integration test infrastructure lives in `@repo/test-kit`. Never copy-paste Payload boot or reset logic into individual test files.

### Fixture API (preferred)

Call `integrationSuite(config)` at the top of a test file. It returns scoped `describe`, `it`, and `test` runners that inject `payload`, `req`, and `createReq` fixtures:

```typescript
import { integrationSuite } from "@repo/test-kit";
import { expect } from "vitest";
import { createPackagesCollection } from "./packages";

const { describe, it } = integrationSuite({
  collections: [storesCollection, createPackagesCollection()],
});

describe("packages collection", () => {
  it("marks first package as default when store has no existing packages", async ({
    payload,
  }) => {
    const store = await payload.create({
      collection: "stores",
      data: { name: "Toko A", slug: "toko-a" },
    });
    const pkg = await payload.create({
      collection: "packages",
      data: { title: "Box 1", isDefault: false },
      req: {
        headers: new Headers({ "payload-tenant": String(store.id) }),
      } as any,
    });
    expect(pkg.isDefault).toBe(true);
  });
});
```

The fixture boots one Payload instance per file and destroys it, and its database, when the file finishes. Packages use in-memory PGlite (`memory://`). `apps/app` uses worker-scoped PostgreSQL schemas (`test_worker_${workerId}`) when `TEST_DATABASE_URL` is set. An auto-use fixture calls `payload.resetDatabase()` before every test, so tests never share rows.

`integrationSuite` accepts any Payload config field except `db` and `secret`, plus `cacheKey`. Set `cacheKey: "default"` when a route handler under test calls `getPayload({ config })`, so it resolves the test instance from `global._payload`.

`integrationTest` is the same runner with an empty config. Use `createIntegrationTest({ payload, cacheKey })` when you need the runner without the `describe` wrapper.

```typescript
import {
  createTestDatabase,
  createTestPayload,
  createTestReq,
} from "@repo/test-kit";
```

### `createTestPayload(options)`

Lower-level boot for tests that manage their own lifecycle. `database` is required and comes from `createTestDatabase()`. Pass any other Payload config field, except `db`:

```typescript
const database = await createTestDatabase();
const payload = await createTestPayload({
  collections: [StoresCollection, PackagesCollection],
  database,
  plugins: [payloadPluginCommerce()],
});
```

Call `payload.destroy()` when done. It closes Payload and the database, and a second call is a no-op.

### `payload.resetDatabase()`

Deletes all rows from every table except `payload_migrations`, without re-running schema push. The fixture calls it for you. In a manual setup, call it in `beforeEach`:

```typescript
beforeEach(async () => {
  await payload.resetDatabase();
});
```

### `createTestReq(opts)`

Returns a typed `PayloadRequest` stub for unit tests that call hook or access functions directly:

```typescript
const req = createTestReq({ user: { id: 1, email: "merchant@example.com" } });
const canRead = paymentMetadataField.access?.read?.({ req } as any);
expect(canRead).toBe(true);
```

## Document factories

Use Thoughtbot Fishery for typed document fixtures. Factories live in a `test/factories/` folder at each package and app root (for example `apps/app/test/factories/` and `packages/payload-plugin-commerce/test/factories/`).

```typescript
// packages/payload-plugin-commerce/test/factories/packageFactory.ts
import { Factory } from "fishery";
import type { Package } from "@repo/types";
import type { Payload } from "payload";

export const packageFactory = Factory.define<Package, { payload?: Payload }>(
  ({ sequence, onCreate, transientParams }) => {
    onCreate(async (pkg) => {
      if (!transientParams.payload)
        throw new Error("Payload instance required");
      return transientParams.payload.create({
        collection: "packages",
        data: pkg,
      }) as Promise<Package>;
    });

    return {
      id: sequence,
      title: `Box ${sequence}`,
      isDefault: sequence === 1,
      dimensions: { length: 20, width: 15, height: 10 },
      tareWeight: { value: 100, unit: "g" },
      store: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
);
```

In unit tests use `factory.build()` (synchronous, no DB). In integration tests use `factory.transient({ payload }).create()`.

## Mocking at a boundary

Mock at system boundaries only: external network APIs, system time, and randomness. Internal code runs real.

- **Real Payload execution.** Run integration tests against the real Local API via `@repo/test-kit`, backed by in-memory PGlite in packages or PostgreSQL worker schemas in `apps/app`. Hand-rolled Payload simulators are banned.
- **MSW for third-party network boundaries.** Intercept external HTTP calls (payment gateways, shipping APIs, transactional emails) using Mock Service Worker handlers in `@repo/test-kit/src/msw/handlers/`. Customize behavior per test with `server.use(...)`.
- **SDK-style interface mocking.** Mock typed SDK or provider methods rather than raw HTTP fetchers. Each method provides a single return shape without conditional URL or header branching in test setup.
- **System time and randomness.** Control time-sensitive expirations and billing schedules with `vi.useFakeTimers()`.
- **Real internal collaborators.** Exercise real internal collaborators directly. If a unit resists direct testing, extract pure functions or inject dependencies.

## Storefront themes and UI components

Keep automated test suites headless-browser free.

- **Schema and token contracts.** Validate section schemas, template definitions, and declarative `cssVar` bindings as pure data transformations using `evaluateThemeCssVars`.
- **Component interactivity in JSDOM.** Render interactive client components with `@testing-library/react` and assert on accessible roles or user interactions.
- **Interactive visual verification.** Verify visual appearance, responsive layouts, and live preview using the `browser` tool. See `docs/agents/browser-verification.md`.

## Vertical slice test-driven development

Follow a tight red-green-refactor loop for vertical slices:

1. **Red.** Write a failing test for a single observable behavior.
2. **Green.** Write the minimum code required to turn the test green.
3. **Refactor.** Improve design while all tests remain green.

Each test builds on what the previous cycle proved. Always reach a passing test before refactoring.

## Code coverage

Coverage thresholds enforce testing discipline where regression risk is highest:

- **Enforced thresholds.** Core domain packages (`payload-plugin-commerce` and `commerce-adapters`) enforce an 80% statement and branch coverage threshold. Builds fail when coverage drops below this line.
- **Report-only packages.** Application routes and glue code in `apps/app` collect reports without threshold failure gates.
