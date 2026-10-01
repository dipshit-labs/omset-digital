# Shared test kit and two-tier testing strategy

> **Status:** Accepted

Omset Digital replaces hand-rolled Payload mock clients and manual hook-invocation test patterns with a two-tier harness: pure unit tests for isolated functions, and real Payload Local API integration tests backed by `@payloadcms/db-sqlite` with per-worker ephemeral SQLite databases. A new `@repo/test-kit` package owns the shared fixture helpers and Fishery factories.

## Context and problem statement

Three test files in the repository implement their own Payload simulators:

- `packages/payload-plugin-commerce/src/collections/packages.integration.test.ts` — extracts hooks by array index, builds a hand-rolled `Where` AST parser, and manually sequences `beforeChange`/`afterChange` calls.
- `packages/payload-plugin-commerce/src/collections/storeCredentials.integration.test.ts` — implements a recursive field-level `beforeChange` pipeline runner to test that credential values are encrypted.
- `apps/app/src/payload/collections/orders/index.integration.test.ts` — builds a 70-line fake Payload client (`createTestOrderPayloadClient`) with its own `create`, `findByID`, and `update` loop.

All three share the same failure mode: they simulate Payload rather than run it, so they miss real field validation, cascading hook order, Drizzle constraint enforcement, and relation population. Renaming a hook or adding a collection field requires updating the mock in addition to the production code. The mocks also provide false confidence: a test can pass against the fake while the real Payload instance crashes.

A fourth file, `packages/payload-plugin-commerce/src/actions/administrativeAreas.integration.test.ts`, is a different case. The `getProvinces`/`getCities`/`getSubdistricts` functions accept a duck-typed Drizzle executor and bypass Payload entirely. The existing test supplies a hand-written SQL string matcher against the 7,200-row seed dataset; this tests the query output logic, not Payload lifecycle. It should run against a real LibSQL executor rather than a string-matching mock, but it does not need a Payload boot.

## Decisions

### 1. Two-tier test classification

Every test file falls into exactly one of two tiers.

**Tier 1 — unit test (`.test.ts`):** Pure functions with no database interaction. Tests hook logic in isolation, access control predicates, pure calculations (shipping formulas, discount rules), and field-level `access.read`/`access.update` guards. These never boot Payload.

**Tier 2 — integration test (`.integration.test.ts`):** Tests that exercise real Payload collection hooks, field validation, relational queries, or full create/update/read round-trips. These always use a real Payload Local API instance backed by `@payloadcms/db-sqlite`.

A test that only calls `payload.find` or `payload.create` with a real adapter belongs in tier 2. A test that only calls an exported TypeScript function with mock arguments belongs in tier 1. Files that mix both tiers are split.

### 2. `@repo/test-kit` package

A new `packages/test-kit/` workspace package (`@repo/test-kit`) owns all shared test infrastructure. It is a `devDependency` only and carries zero production imports.

Public exports:

```typescript
// Vitest fixture extension — inject a scoped Payload instance per test file
export { it, describe } from "./src/fixture";

// Raw lifecycle helpers — for files that mix unit + integration tests
export { createTestPayload } from "./src/createTestPayload";
export { resetDatabase } from "./src/resetDatabase";

// Mock request builder
export { createTestReq } from "./src/createTestReq";
```

`createTestPayload(overrides)` accepts a partial `SanitizedConfig` (collections, plugins) and boots a Payload instance with `@payloadcms/db-sqlite` pointed at `file:./.tmp/test-${VITEST_POOL_ID ?? 0}.db`. The caller supplies collections; `@repo/test-kit` supplies the adapter and a fixed test secret. It never imports from `apps/app`.

`resetDatabase(payload)` disables foreign key enforcement, deletes all rows from every Drizzle-tracked table, and re-enables foreign key enforcement. Used in `beforeEach` to give each test a clean slate without reinitializing the schema.

`createTestReq(opts)` returns a typed `PayloadRequest` stub with `user`, `headers`, and `payload` fields populated. It satisfies the interface needed by hook and access functions without booting a server.

The `it`/`describe` fixture extension wraps `createTestPayload` and `resetDatabase` in Vitest's `test.extend()` API so that a `payload` fixture is available in the test body with zero setup boilerplate for the common case.

### 3. Fishery factories colocated per package

Document factories using Thoughtbot Fishery live in a `test/` folder at each package root (e.g. `packages/payload-plugin-commerce/test/factories/`). They are not shared via `@repo/test-kit` because factories for plugin-specific documents (packages, store credentials) are only relevant to their own package, and factories for app-layer documents (orders, stores) are only relevant to `apps/app`. Cross-package factory sharing would couple packages through their data shapes.

Each factory's `onCreate` hook receives a `Payload` instance via `transientParams.payload` and persists the document through the Local API. The factory is typed against generated types from `@repo/types`.

### 4. SQLite isolation strategy

Each Vitest worker receives a unique database file path derived from `VITEST_POOL_ID`. This supports WAL mode, survives parallel test runs without shared-cache bleed, and is cleaned up by deleting the `.tmp/` directory in `afterAll`. In-memory mode (`file::memory:?cache=shared`) is not used as the default because it disables WAL and can bleed between workers within the same process.

### 5. Migration plan for existing files

| File | Action |
|---|---|
| `packages/payload-plugin-commerce/src/collections/packages.integration.test.ts` | Rewrite against real Payload + SQLite. Delete `runBeforeHook`, `mockCount`, `countFn`, and `isWhereField`. |
| `apps/app/src/payload/collections/orders/index.integration.test.ts` | Split. Tests 1–4 (persist/retrieve/update `paymentMetadata`) rewrite against real Payload + SQLite. Tests 5–6 (legacy `afterRead` backfill) and tests 7–8 (field-level access control) move to `orders/paymentMetadata.test.ts` as tier-1 unit tests. Delete `createTestOrderPayloadClient` and `runOrderAfterReadHooks`. |
| `packages/payload-plugin-commerce/src/collections/storeCredentials.integration.test.ts` | Deferred. Rewrite after the harness is proven on the simpler collections. |
| `packages/payload-plugin-commerce/src/actions/administrativeAreas.integration.test.ts` | Rewrite against a real LibSQL in-process client. Delete `extractQuery`, `createDatasetSqlDb`, and the SQL string-matching mock engine. No Payload boot required. Rename to `administrativeAreas.test.ts` because it tests pure query output, not Payload lifecycle. |

## Considered options

- **`@payloadcms/db-sqlite` in-memory mode:** Rejected as the default. Disables WAL and has per-process connection semantics that can bleed between Vitest workers. Ephemeral file databases with `VITEST_POOL_ID` are safer.
- **Live PostgreSQL via Testcontainers:** Rejected for everyday collection and hook tests. Cold start is 3–10 seconds; Docker is not available in all developer environments. Reserved for dedicated database migration smoke tests in CI.
- **Shared Fishery factories in `@repo/test-kit`:** Rejected. Factories are tightly coupled to collection shapes, which vary per package. Colocating them avoids cross-package data model coupling.
- **Single `@repo/test-kit` that exports a `test.extend()` fixture only (no raw helpers):** Rejected. Files that test a mix of pure functions and integration scenarios need the raw helpers without importing a custom `it` binding.

## Consequences

1. `@payloadcms/db-sqlite` must be added to `catalog:payload` at version `3.90.2` and to `devDependencies` in `packages/payload-plugin-commerce` and `apps/app`.
2. `fishery` must be added to `catalog:test`.
3. A new `packages/test-kit/` workspace entry appears in the monorepo with its own `package.json`, `tsconfig.json`, and `vitest.config.ts`.
4. The three mock client patterns in the affected files are deleted on migration; no shims are left behind.
5. `storeCredentials.integration.test.ts` remains as-is until the sprint that migrates it; its technical debt is tracked here rather than left undocumented.
