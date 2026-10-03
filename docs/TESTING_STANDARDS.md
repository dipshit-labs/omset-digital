# Testing standards

The worked examples behind the testing rules in `CODING_STANDARDS.md`. Read those two core rules first: verify behavior through public interfaces, and mock at system boundaries only. Everything here shows how they look in practice.

## Two tiers

Every test file in this monorepo belongs to one of two tiers.

**Tier 1, unit and UI tests (`src/**/*.test.{ts,tsx}`):** Pure functions, access predicates, calculations, and React components colocated directly beside their implementation file. Pure TypeScript tests (`.test.ts`) run on Node in under 1 ms. Component tests (`.test.tsx`) render in JSDOM via Vitest `environmentMatchGlobs`. No database, no Payload boot.

**Tier 2, integration tests (`test/integrations/*.integration.test.ts`):** Tests verifying collection hooks, field validation, relational queries, and round-trip persistence through the real Payload Local API. Located in a flat `test/integrations/` directory at the package or app root. Packages run against in-memory SQLite (`mode=memory&cache=shared`). `apps/app` runs against worker-scoped PostgreSQL schemas.

A file that needs both splits: pure tests go to colocated `src/`, Payload-backed tests to `test/integrations/`.
## Good tests

Integration tests exercise real code paths through public APIs. They describe what the system does, not how.

```typescript
// Good: Tests observable behavior through the real Payload Local API
it("assigns tenant store identifier when creating package with tenant header", async ({ payload }) => {
  const store = await payload.create({ collection: "stores", data: { name: "Toko Baru", slug: "toko-baru" } });
  const headers = new Headers();
  headers.set("payload-tenant", String(store.id));

  const pkg = await payload.create({
    collection: "packages",
    data: { title: "Medium Box", isDefault: false, dimensions: { length: 20, width: 15, height: 10 }, tareWeight: { value: 100, unit: "g" } },
    req: { headers } as any,
  });

  expect(pkg.store).toBe(store.id);
});
```

- Test behavior that callers and merchants care about.
- Use exported functions and public APIs only.
- Survive internal refactors.
- Include one logical assertion per test.

## Bad tests

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
  const rawRow = await postgresClient.query("SELECT * FROM stores WHERE name = $1", ["Toko Kopi"]);
  expect(rawRow.rows).toHaveLength(1);
});

// Bad: Hand-rolled Payload mock, never do this
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

Red flags:

- Mocking internal collaborators or your own utility functions with `vi.mock`.
- Testing unexported private helper functions.
- Asserting on internal call counts or the sequence of internal steps.
- Tests breaking after a refactor when observable behavior did not change.
- Test names describing how the code works instead of what outcome occurs.
- Verifying state through direct database queries when the public API provides the query.
- Testing trivial one-line mappings or string concatenations where the test mirrors the source code.
- Thin delegation tests for route handlers where the test only verifies that an action called a service. Test the service logic directly instead.
- Hand-rolled Payload mock clients (`createMockPayload`, `createTestOrderPayloadClient`) or manual hook runners (`runBeforeHook`, `runCollectionBeforeChangeHooks`). Use `@repo/test-kit` instead.

## `@repo/test-kit`

All integration test infrastructure lives in `@repo/test-kit`. Never copy-paste Payload boot or reset logic into individual test files.

### Fixture API (preferred)

Import `it` and `describe` from `@repo/test-kit` to get a `payload` fixture injected per test file with automatic teardown:
```typescript
import { describe, it } from "@repo/test-kit";
import { expect } from "vitest";
import { createPackagesCollection } from "./packages";

describe("packages collection", () => {
  it("marks first package as default when store has no existing packages", async ({ payload }) => {
    const store = await payload.create({ collection: "stores", data: { name: "Toko A", slug: "toko-a" } });
    const pkg = await payload.create({
      collection: "packages",
      data: { title: "Box 1", isDefault: false },
      req: { headers: new Headers({ "payload-tenant": String(store.id) }) } as any,
    });
    expect(pkg.isDefault).toBe(true);
  });
});
```

The fixture boots one Payload instance per file with ephemeral database isolation. Packages use named in-memory SQLite (`file:test_mem_${workerId}?mode=memory&cache=shared`). `apps/app` uses worker-scoped PostgreSQL schemas (`test_worker_${workerId}`) using `DATABASE_URL`. It calls `resetDatabase` between every test automatically.

```typescript
import { createTestPayload, resetDatabase, createTestReq } from "@repo/test-kit";
```

### `createTestPayload(overrides)`

Boots a Payload instance with `@payloadcms/db-sqlite` and a fixed test secret. Pass any subset of `BuildConfig` fields:

```typescript
const payload = await createTestPayload({
  collections: [StoresCollection, PackagesCollection],
  plugins: [payloadPluginCommerce()],
});
```

Call `payload.destroy()` in `afterAll`. The adapter and worker-scoped DB path are set automatically; do not pass `db` or `secret`.

### `resetDatabase(payload)`

Deletes all rows from every Drizzle-tracked table. Call in `beforeEach` for a clean slate without re-running schema push:

```typescript
beforeEach(async () => {
  await resetDatabase(payload);
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
      if (!transientParams.payload) throw new Error("Payload instance required");
      return transientParams.payload.create({ collection: "packages", data: pkg }) as Promise<Package>;
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

Mock at system boundaries only: external network APIs, system time, randomness. Everything inside the boundary runs real.

- **Payload operations are never mocked.** Use the real Local API backed by in-memory SQLite in packages or PostgreSQL worker schemas in `apps/app`. Hand-rolled Payload simulators are banned.
- **Mock external network boundaries with MSW.** Payment gateways (Midtrans, Xendit), shipping APIs (RajaOngkir), and transactional emails (Resend) are intercepted via Mock Service Worker. Central handlers live in `@repo/test-kit/src/msw/handlers/` and tests customize behavior with `server.use(...)`.
- **Mock system time and randomness.** Use `vi.useFakeTimers()` for time-sensitive token expirations or billing schedules.
- **Never mock internal collaborators.** If a function requires mocking a sibling file to test it, extract the logic into a pure function or inject the dependency.
## Storefront themes and UI components

Never boot a full headless browser in unit and integration test suites. Headless browsers require extra setup, run slowly, and assert on styling details that intentional visual changes alter.

- **Test props schemas and settings bindings.** Validate that section schemas, template definitions, and declarative `cssVar` bindings produce valid contracts when evaluated with `evaluateThemeCssVars`. These are pure data transformations and run instantly.
- **Test component interactivity in jsdom.** Render interactive client components with `@testing-library/react` and assert on accessible roles or user interactions.
- **Verify user flows with the browser tool.** Visual appearance, responsive layouts, and live preview belong in interactive browser verification runs rather than automated pixel test assertions. See `docs/agents/browser-verification.md`.

## Vertical slice test-driven development

Write one test, make it pass, then write the next. Writing an entire test suite before writing implementation code produces tests that assert on imagined details and resist natural design improvements.

1. Write a failing test for a single observable behavior.
2. Write the minimum code required to turn the test green.
3. Refactor while keeping all tests green.

Each test builds on what the previous cycle proved. Always reach a passing test before refactoring.

## Turborepo test tasks

The monorepo organizes test execution into targeted Turborepo tasks:

- `test:unit`: runs colocated unit and UI tests (`src/**/*.test.{ts,tsx}`). High cache hit rate when business logic is untouched.
- `test:integration`: runs integration suites (`test/integrations/*.integration.test.ts`). Declared only in packages and apps that contain database integration tests.
- `test`: composite task that executes both unit and integration verification.
- `test:coverage`: runs Vitest with `@vitest/coverage-v8`, outputting reports to `coverage/**` with Turborepo caching.

## Code coverage

V8 code coverage evaluates test sufficiency without manual instrumentation:

- **Enforced thresholds:** Core domain packages (`payload-plugin-commerce` and `commerce-adapters`) enforce an 80% statement and branch coverage threshold. Builds fail when coverage drops below this line.
- **Report-only packages:** Application glue code and pages in `apps/app` collect reports without threshold failure gates.
- **Standard exclusions:** Test files, factories (`test/factories/**`), generated schemas, and build distributions are excluded from coverage calculations.
