# Shared test kit and testing architecture

> **Status:** Accepted

Omset Digital organizes testing into discrete task boundaries: pure unit and UI component tests colocated inside `src/`, and database integration tests in a flat `test/integrations/` directory. Packages run ephemeral tests against named in-memory SQLite instances, while `apps/app` runs against worker-scoped PostgreSQL schemas using `DATABASE_URL`. Outbound network requests to third-party services are intercepted with Mock Service Worker (MSW). Shared test infrastructure lives in `@repo/test-kit`.

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

### 4. Database isolation strategy

Local databases isolate by execution scope:

- **Packages (Named in-memory SQLite):** Packages such as `payload-plugin-commerce` boot `@payloadcms/db-sqlite` with `file:test_mem_${workerId}?mode=memory&cache=shared`. Named shared-memory preserves tables across connection pools without writing temporary files to disk.
- **Core application (Worker-scoped PostgreSQL schemas):** `apps/app` connects to PostgreSQL via `DATABASE_URL`. `@repo/test-kit` derives a worker schema (`test_worker_${VITEST_POOL_ID ?? 0}`). It runs `CREATE SCHEMA IF NOT EXISTS` at boot, table truncation during `resetDatabase`, and `DROP SCHEMA IF EXISTS ... CASCADE` during teardown. If `DATABASE_URL` is missing, tests fail fast.

### 5. Outbound network mocking with MSW

Mock Service Worker handles external network boundaries:

- Shared request handlers for third-party gateways (Midtrans, Xendit, RajaOngkir, Resend) live in `@repo/test-kit/src/msw/handlers/`.
- Global Vitest setup in `@repo/test-kit/msw` starts the interceptor before all tests, resets runtime overrides after each test, and closes the server after all tests complete.
- Tests override specific response codes or network failures using `server.use(...)`.

### 6. Centralized V8 code coverage

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
- **Live PostgreSQL via Testcontainers:** Rejected. Container boot times add several seconds of overhead per worker, and Docker is unavailable in some development environments. Schemas in a shared test Postgres database provide full dialect fidelity without container overhead.
- **Bare SQLite `:memory:` mode:** Rejected. A bare `:memory:` connection string drops schemas when separate pool connections open. Named shared-memory mode preserves the database across pool connections during test execution.

## Consequences

1. `@vitest/coverage-v8` and `msw` join `catalog:test` in `package.json`.
2. `apps/app` requires a valid PostgreSQL instance reachable through `DATABASE_URL` for integration tests.
3. Packages running integration tests define both `test:unit` and `test:integration`, while pure packages define `test:unit` only.
4. Routine manual `// @vitest-environment` comments across existing test files are removed in favor of project-based environment dispatch (`unit`, `ui`, `integration`).
5. Fishery factories consolidate into root `test/factories/` folders.
6. Coverage configuration consolidates exclusively in the root `vitest.config.ts` due to Vitest project configuration constraints.
