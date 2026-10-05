# Shared test kit and testing architecture

> **Status:** Accepted

Omset Digital organizes testing into discrete task boundaries: pure unit and UI component tests colocated inside `src/`, and database integration tests in a flat `test/integrations/` directory. Integration tests run against PostgreSQL via two engines. When `TEST_DATABASE_URL` is set, suites run against real PostgreSQL using worker-scoped schemas. When unset, suites fall back to an in-tree in-memory PGlite adapter. `DATABASE_URL` is never used during test runs. Outbound network requests to third-party services are intercepted with Mock Service Worker (MSW). Shared test infrastructure lives in `@repo/test-kit`.

## Context and problem statement

Earlier test setups suffered from five issues:

1. Hand-rolled Payload mock clients simulated collection hooks instead of executing real lifecycle validations.
2. Vitest defaulted to `jsdom` in `apps/app`, requiring manual `// @vitest-environment node` docblocks in dozens of server files.
3. File-based SQLite on disk spent excessive time spawning worker processes and running Drizzle pushes.
4. External API clients relied on disparate fetch spies and ad-hoc mocks without standardized network contracts.
5. Lack of discrete Turborepo task boundaries forced full test execution across packages even when only UI or pure functions changed, with no V8 coverage baseline.

## Decisions

### 1. Suite placement and file conventions

Test files follow strict placement rules:

- **Colocated unit and UI tests (`src/`):** Pure logic, utility functions, access predicates, and React components stay directly adjacent to their implementation file. Pure TypeScript tests use `<name>.test.ts`. React component tests use `<name>.test.tsx`.
- **Flat integration tests (`test/integrations/`):** Tests requiring Payload Local API or database operations live in a flat `test/integrations/` folder at the package or app root. Files retain the `<feature>.integration.test.ts` suffix (for example `test/integrations/packages.integration.test.ts`, `test/integrations/catalog.integration.test.ts`, `test/integrations/webhooks.integration.test.ts`).
- **Centralized document factories (`test/factories/`):** Fishery factories live in `test/factories/` at package and app roots (for example `apps/app/test/factories/orderFactory.ts`).

### 2. Turborepo task model and caching

Testing splits into discrete Turborepo tasks:

- `test:unit`: runs Vitest across colocated tests by targeting projects via `vitest run --project '*unit*' --project '*ui*'` (or `vitest run --project '*unit*'` in pure Node packages). Changes to pure code yield fast Turborepo cache hits.
- `test:integration`: runs Vitest across integration suites via `vitest run --project '*integration*'`. Declared in `package.json` only for packages and apps that contain integration tests (`apps/app`, `packages/payload-plugin-commerce`, `packages/payload-plugin-themes`, `packages/test-kit`).
- `test`: composite task depending on `test:unit` and `test:integration`.
- `test:coverage`: runs Vitest with `@vitest/coverage-v8` centrally from root `vitest.config.ts`, outputting to `coverage/**`. Turborepo caches this task via `outputs: ["coverage/**"]`.

### 3. Project-based tier and environment dispatch

All package and app Vitest configurations define discrete projects matching test tiers and execution environments:

- `unit`: pure Node tests in `src/**/*.test.ts` (`environment: "node"`).
- `ui`: React component tests in `src/**/*.test.tsx` (`environment: "jsdom"`). In `apps/app`, this project also enables CSS processing and inlines UI dependencies (`/@payloadcms\/ui/u`, `/react-image-crop/u`).
- `integration`: database and Payload Local API tests in `test/integrations/*.integration.test.ts` (`environment: "node"`, `hookTimeout: 30_000`, `testTimeout: 30_000`, `fileParallelism: false`).

Project names (`unit`, `ui`, `integration`) align with `package.json` task filters (`--project '*unit*'`, `--project '*ui*'`, `--project '*integration*'`).

```typescript
test: {
  name: "package-name",
  projects: [
    {
      test: {
        name: "unit",
        environment: "node",
        include: ["src/**/*.test.ts"],
      },
    },
    {
      test: {
        name: "ui",
        environment: "jsdom",
        include: ["src/**/*.test.tsx"],
      },
    },
    {
      test: {
        name: "integration",
        environment: "node",
        include: ["test/integrations/*.integration.test.ts"],
        hookTimeout: 30_000,
        testTimeout: 30_000,
        fileParallelism: false,
      },
    },
  ],
}
```

File-level `// @vitest-environment` docblocks remain permitted when an explicit file override is necessary, but are avoided when project configuration already resolves the environment.

### 4. Database isolation strategy and engine selection

Integration tests run against PostgreSQL dialect across all packages and apps, eliminating SQLite dialect divergence. The database driver isolates state by execution scope:

- **PGlite in-memory engine (default fallback):** When `TEST_DATABASE_URL` is unset, `@repo/test-kit` boots an in-tree PGlite adapter powered by `@electric-sql/pglite` and `@payloadcms/drizzle` with in-memory storage (`memory://test-payload-${workerId}`). Schema push runs via Drizzle `pushDevSchema` with transactions disabled to avoid single-connection deadlocks. Table truncation wipes state between tests, and `payload.destroy()` closes the PGlite instance on file completion.
- **Worker-scoped PostgreSQL schemas (`TEST_DATABASE_URL`):** When `TEST_DATABASE_URL` is set, `@repo/test-kit` connects to real PostgreSQL. The driver derives a worker-scoped schema name (`test_worker_${VITEST_POOL_ID ?? 0}`) and creates it if missing. Between tests, it truncates all tables using `TRUNCATE TABLE ... RESTART IDENTITY CASCADE`. `payload.destroy()` drops the schema and closes the pool.
- **Environment isolation:** `TEST_DATABASE_URL` is dedicated strictly to integration testing. Tests never read or mutate `DATABASE_URL`, preventing accidental modification of local development databases.

### 5. Test kit harness architecture and Vitest runner integration

`@repo/test-kit` structures integration test execution around native Vitest fixtures:

- **Suite-scoped configuration (`integrationSuite`):** Test files configure Payload through `integrationSuite({ collections, plugins, cacheKey })`. The factory returns scoped `{ describe, it, test }` test runners built on `test.extend<IntegrationTestFixtures>()`. It eliminates mutable module-level state.
- **Lifecycle and reset:** Payload boots once per test file. An auto-use fixture calls `payload.resetDatabase()` before every test, truncating all tracked tables without re-running schema push.
- **Tier 1 unit test request helper (`createTestReq`):** A lightweight helper returns typed `PayloadRequest` stubs with mock tenant headers and user objects for pure access-control and lifecycle unit tests in `src/`.
- **Global Payload cache binding:** When testing Next.js route handlers that invoke `getPayload({ config })`, suites pass `cacheKey: "default"`. `createTestPayload` registers the instance in `global._payload` under that key, allowing route handlers to resolve the active test instance without ad-hoc mocks.
- **Deep modules without dead weight:** Types colocate within their implementation files. Generic hardware-lifecycle scaffolding (`ResourceTracker`, diagnostics recorders, custom error classes) is omitted in favor of native Vitest error propagation and teardown.

### 6. Outbound network mocking with MSW

Mock Service Worker handles external network boundaries:

- Shared request handlers for third-party gateways (Midtrans, Xendit, RajaOngkir, Resend) live in `@repo/test-kit/src/msw/handlers/`.
- Global Vitest setup in `@repo/test-kit/msw` starts the interceptor before all tests, resets runtime overrides after each test, and closes the server after all tests complete.
- Tests override specific response codes or network failures using `server.use(...)`.

### 7. Centralized V8 code coverage

Vitest disallows `coverage`, `reporters`, `resolveSnapshotPath`, and `attachmentsDir` inside project configurations. Because these settings execute for the whole runner process, coverage configuration lives exclusively in the root `vitest.config.ts`.

The root coverage configuration defines:

- Provider: `v8`.
- Reporters: `text`, `json`, `html`.
- Reports directory: `./coverage`.
- Inclusion scope: `packages/*/src/**/*.{ts,tsx}` and `apps/*/src/**/*.{ts,tsx}`.
- Exclusions: `**/*.test.{ts,tsx}`, `**/*.integration.test.{ts,tsx}`, `**/test/**`, `**/generated.ts`, and `**/*.d.ts`.
- Thresholds: `packages/commerce-adapters/**` and `packages/payload-plugin-commerce/**` enforce an 80% statement and branch coverage threshold. Builds fail when coverage drops below this line. `apps/app` runs in report-only mode.

Package-level `test:coverage` scripts are omitted because project configs cannot evaluate coverage independently. Coverage runs for the full workspace via root Vitest execution.

## Considered options

- **Full external test directory for all tests:** Rejected. Moving pure unit and UI tests out of `src/` damages daily development ergonomics for component and utility work.
- **Live PostgreSQL via Testcontainers:** Rejected. Container boot times add several seconds of overhead per worker, and Docker is unavailable in some development environments.
- **SQLite / LibSQL in-memory:** Rejected. While fast, SQLite lacks PostgreSQL dialect parity for JSON operators, case sensitivity, and constraints. PGlite provides in-memory PostgreSQL execution without SQLite divergence.
- **Third-party `payload-db-pglite` package:** Rejected. The npm package is pinned to older Payload versions and lacks active maintenance. An in-tree adapter inside `@repo/test-kit` guarantees compatibility with Payload 3.90.2 with zero extra dependencies beyond `@electric-sql/pglite`.
- **Using `DATABASE_URL` in tests:** Rejected. Relying on `DATABASE_URL` risks mutating development data. `TEST_DATABASE_URL` isolates test runs from development environments.
- **ResourceTracker and custom lifecycle SDK:** Rejected. Vitest native fixtures (`test.extend`) already manage resource allocation, ordered teardown, and failure propagation without extra abstraction layers.

## Consequences

1. `@vitest/coverage-v8` and `msw` join `catalog:test` in `package.json`.
2. `@electric-sql/pglite` joins `catalog:payload` in `package.json`. `@payloadcms/db-sqlite` and `@libsql/client` are removed.
3. Tests run against in-memory PGlite by default, or against real PostgreSQL when `TEST_DATABASE_URL` is supplied. `DATABASE_URL` is ignored.
4. Packages running integration tests define both `test:unit` and `test:integration`, while pure packages define `test:unit` only.
5. Integration suites use `integrationSuite` and `integrationTest`. Legacy `defineIntegrationSuite` and `setTestPayloadConfig` are removed cleanly without shims.
6. Routine manual `// @vitest-environment` comments across existing test files are removed in favor of project-based environment dispatch (`unit`, `ui`, `integration`).
7. Fishery factories consolidate into root `test/factories/` folders.
8. Coverage configuration consolidates exclusively in the root `vitest.config.ts` due to Vitest project configuration constraints.
