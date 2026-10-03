# Coding standards

The rules a human or an agent holds in their head while writing and reviewing code here. Tooling such as `oxlint`, `oxfmt`, `ultracite`, and `tsc` enforces syntax, formatting, and file casing. This document covers the architecture, typing rules, tenant boundaries, and component contracts evaluated during `/code-review`.

## Environment and configuration

### Resolve environment variables at the edge, not inside deep functions

Read and validate every environment variable at application boot through `apps/app/src/env.ts`. `apps/app/next.config.ts` imports `@/env` so a missing or malformed variable crashes the build or server start immediately.

Never call `process.env.VARIABLE_NAME` directly inside a route handler, Payload hook, or utility function. Reading an unvalidated environment variable inside a nested branch turns a missing deployment secret into a runtime crash when that specific branch first executes in production. Use the parsed exports from `@/env`.

## Multi-tenancy and store ownership

### Every write to tenant data goes through store scoping

A Product, Variant, Category, Package, Media asset, Theme, and Template belong to a Store. Cross-tenant reads or writes corrupt merchant isolation and expose sensitive data.

- **Stamp the tenant on create.** Tenant collections must include the `store` relationship and attach `enforceStoreOnCreate` to their `beforeChange` hooks.
- **Scope mutations by role.** Write access must resolve through `canWrite`, which checks super-admin privileges or matches the record store against the user's owner and manager store lists.
- **Lock single-tenant operations to owners.** Operations that create or delete store users must restrict access to users with the `owner` role, excluding `manager`.
- **A new tenant-owned collection inherits this contract immediately.** If a new document relates to a Store or to another record that points to a Store, it must include the `store` field, the creation hook, and tenant-scoped access rules.

## Types

### Every `any` is a leak

An `any` switches off type checking for every value that flows through it, and those values keep flowing long after the line that produced them. Write the type you mean.

- **A known shape gets a named type.** Define an `interface` at the top of the module or import the generated model from `@repo/types`.
- **An unknown incoming value gets `unknown`.** Narrow `unknown` with type guards before property access. This forces the reader to verify the payload shape before consumption.
- **A flexible signature gets a constrained generic.** Use `<T extends BaseSettingField>` instead of a bare `<T>`.
- **Third-party boundary types get encapsulated.** If an external dependency returns an untyped or loose structure, cast it once at the boundary into a verified local type. Keep `any` out of exported function signatures.
- **Type assertions require justification.** When using `as SomeType`, place a `// SAFETY:` comment directly above the cast explaining why the data matches that shape.

An `any` survives review only when a third-party dependency is genuinely un-typed at the boundary and nothing narrower type-checks. Contain it: cast once at the edge into a named type, and keep `any` out of the signature that other modules call.

### Prefer interfaces for data models and types for unions

Use `interface` for extensible data models, Payload field parameters, and React component props. Use `type` for unions, intersections, primitives, and function signatures.

All exported functions, hooks, and utilities must declare explicit return types.

## Payload CMS architecture

### Keep collections modular and extract complex logic

Each collection in `apps/app/src/payload/collections/` lives in its own directory with an `index.ts` file exporting the `CollectionConfig` object.

- **Extract access control functions.** Place multi-tenant queries, role validations, and permission checks in `<collection>/access/<action>.ts`. Trivial one-line checks like `read: () => true` may stay inline inside the collection config.
- **Separate hook responsibilities.** Validations run in `beforeValidate` hooks or field `validate` functions and throw `APIError` or `ValidationError`. Data mutations, tenant stamping, and value formatting run in `beforeChange`. Cross-collection synchronization runs in `afterChange`.
- **Use core slug fields.** Collections that need a slug must call `slugField()` from `payload`. Do not create ad-hoc text fields or custom slug generators unless the slug serves as a domain identifier, like the store subdomain in the `stores` collection.
- **Scope custom admin field styles with CSS Modules.** Custom admin components must use `*.module.css` wrapped in `@layer payload-default { ... }`. Never import raw global CSS files into Payload field components.

## Themes and storefront engine

### Theme packages never touch Payload runtime

Theme packages under `packages/themes/` are standalone TypeScript packages. They must never import `payload`, `@payloadcms/*`, or `@repo/types`.

- **Depend only on the theme engine DSL.** Theme packages import manifest builders `defineTheme` and `defineSection`, settings field contracts, and type definitions strictly from `@repo/theme-core`.
- **Declarative CSS variable bindings.** Setting fields bind directly to canonical CSS custom properties via `cssVar` (such as `cssVar: "--theme-primary"`) and optional `unit` on number fields (such as `unit: "px"`). Themes do not export custom `cssVars` mapping functions.
- **Centralized CSS variable evaluation.** Storefront consumers evaluate theme variables using `evaluateThemeCssVars({ baseTokens, manifest, settings })` from `@repo/theme-core`, merging declarative theme bindings over canonical `--theme-*` defaults.
- **Theme package file organization.** Theme packages organize code flatly into `sections/`, `templates/`, and root `branding.ts`, `manifest.ts`, and `index.ts`. Do not use intermediate `config/` or `presets/` directories.

### Storefront sections are React Server Components

All storefront layouts, pages, and theme section components run as React Server Components without client JavaScript.

- **Omit `'use client'` from theme sections.** Theme sections receive their settings and blocks as serializable props. Do not add `'use client'` to a section component.
- **Push client interactivity to leaf components.** Interactive elements like quantity pickers or mobile drawers live in isolated leaf components marked `'use client'`.
- **Merge classes using `cn`.** Always use `cn(...)` from `@repo/theme-core/utils` (in storefront themes) or `@repo/ui/lib/utils` (in marketing/admin pages) for conditional styles and class composition. Do not concatenate class names with template strings.
- **Avoid `React.FC`.** Declare components as standard functions with typed props destructured in the signature.

## Monorepo and package boundaries

### Workspace packages export direct TypeScript source

Workspace packages inside `packages/*` export directly to TypeScript source files in their `package.json`, such as `src/index.ts` and `src/exports/*.ts`.

- **No intermediate build step.** Internal packages do not compile to a `dist/` folder before consumption. Next.js and Turborepo compile package sources directly.
- **Strict subpath exports.** Packages must define explicit exports in `package.json`. Group consumer-safe entry points under explicit subpaths, such as `./types`, `./fields`, `./utilities`, and `./client`. Do not use uncurated barrel files that re-export internal files.
- **Pin versions through workspace catalogs.** Workspace packages specify dependencies using `catalog:` references in `package.json`. Do not specify independent hardcoded version strings for packages present in catalogs.

## Product and inventory model

### Every product has at least one variant

Omset Digital uses a normalized product variant hierarchy across four collections: `products`, `variantTypes`, `variantOptions`, and `variants`.

- **Never embed stock arrays directly inside products.** Inventory must live on individual variant records. This allows row-level locking in PostgreSQL during checkout transactions without locking the entire parent product.
- **Variants carry physical properties.** Every variant record must store `weight` in grams alongside `price` and `stock` to support live shipping cost calculations.

## Testing

### Tests verify public contracts, not private plumbing

Tests verify behavior through public interfaces, not implementation details. Code can change entirely; tests must not break unless behavior changed.

Mock at system boundaries only: external APIs, system time, randomness, and storage when a live instance is impractical. Everything inside the boundary goes in real. Never mock your own classes, utilities, or internal collaborators. When a unit is hard to test without mocking an internal file, redesign the interface.

- **Two-tier test classification.** Pure calculations, standalone hook functions, access control predicates, and React components live in `src/` (`.test.ts` on Node, `.test.tsx` on JSDOM via `environmentMatchGlobs`). Tests verifying collection hooks, field validation, relational queries, or round-trip persistence live in a flat `test/integrations/` directory (`.integration.test.ts`).
- **Test placement rules.** Place `<name>.test.ts` and `<name>.test.tsx` directly adjacent to the file being tested in `src/`. Place integration tests in flat `test/integrations/`. Fishery document factories live in `test/factories/` at package and app roots.
- **Match the environment automatically.** Vitest defaults to `node`. UI components rendering JSX run in `jsdom` through `environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]]`. Manual `// @vitest-environment` docblocks remain allowed when a file requires a specific override, but are avoided when configuration handles it.
- **Shared test infrastructure via `@repo/test-kit`.** Integration test setup, database teardown, MSW handlers, and request stubs import from `@repo/test-kit`. Never duplicate Payload boot or database reset logic across packages.
- **Payload operations are never mocked.** Never build hand-rolled Payload clients (`createMockPayload`, `createTestOrderPayloadClient`) or manual hook runners. Run against the real Payload Local API backed by in-memory SQLite in packages or worker-scoped PostgreSQL schemas in `apps/app` via `@repo/test-kit`.
- **Mock external network boundaries with MSW.** External third-party HTTP calls (payment gateways, shipping APIs, transactional email) are intercepted using Mock Service Worker handlers in `@repo/test-kit/src/msw/`.
For worked good and bad examples, red flags, and vertical slice TDD, read `docs/TESTING_STANDARDS.md`.
