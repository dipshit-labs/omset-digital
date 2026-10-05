# Coding standards

Syntax, formatting, and file casing are enforced by tooling (`oxlint`, `oxfmt`, `ultracite`, `tsc`). This document defines the architecture, typing rules, tenant boundaries, and component contracts evaluated during code review.

## Environment and configuration

### Resolve environment variables at application boot

Validate environment variables through `apps/app/src/env.ts` at application start. `apps/app/next.config.ts` imports `@/env` to halt the build or server start when configuration is missing.

Read environment variables exclusively through parsed exports from `@/env`. Direct `process.env` lookups bypass boot validation and risk late production crashes in untested code paths.

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
- **An unknown incoming value gets `unknown`.** Narrow `unknown` with type guards before property access. This forces verifying the payload shape before consumption.
- **A flexible signature gets a constrained generic.** Use `<T extends BaseSettingField>` instead of a bare `<T>`.
- **Third-party boundary types get encapsulated.** If an external dependency returns an untyped or loose structure, cast it once at the boundary into a verified local type. Keep `any` out of exported function signatures.
- **Type assertions require justification.** When using `as SomeType`, place a `// SAFETY:` comment directly above the cast explaining why the data matches that shape.

An `any` survives review only when a third-party dependency is genuinely untyped at the boundary and nothing narrower type-checks. Contain it: cast once at the edge into a named type, and keep `any` out of the signature that other modules call.

### Prefer interfaces for data models and types for unions

Use `interface` for extensible data models, Payload field parameters, and React component props. Use `type` for unions, intersections, primitives, and function signatures.

All exported functions, hooks, and utilities must declare explicit return types.

## Payload CMS architecture

### Keep collections modular and extract complex logic

Each collection in `apps/app/src/payload/collections/` lives in its own directory with an `index.ts` file exporting the `CollectionConfig` object.

- **Extract access control functions.** Place multi-tenant queries, role validations, and permission checks in `<collection>/access/<action>.ts`. Trivial one-line checks like `read: () => true` may stay inline inside the collection config.
- **Separate hook responsibilities.** Validations run in `beforeValidate` hooks or field `validate` functions and throw `APIError` or `ValidationError`. Data mutations, tenant stamping, and value formatting run in `beforeChange`. Cross-collection synchronization runs in `afterChange`.
- **Use core slug fields.** Call `slugField()` from `payload` for collection slugs. Reserve custom text fields for domain identifiers like store subdomains in the `stores` collection.
- **Scope custom admin field styles with CSS Modules.** Custom admin components must use `*.module.css` wrapped in `@layer payload-default { ... }`. Component styles stay local to their field modules.

## Themes and storefront engine

### Theme packages depend strictly on @repo/theme-core

Theme packages under `packages/themes/` are standalone TypeScript packages importing DSL contracts, primitives, and types exclusively from `@repo/theme-core`.

- **Theme engine DSL.** Theme packages import manifest builders (`defineTheme`, `defineSection`), settings field contracts, and type definitions strictly from `@repo/theme-core`.
- **Declarative CSS variable bindings.** Setting fields bind directly to canonical CSS custom properties via `cssVar` (such as `cssVar: "--theme-primary"`) and optional `unit` on number fields (such as `unit: "px"`). Storefront consumers evaluate theme variables centrally with `evaluateThemeCssVars`.
- **Theme package file organization.** Structure theme packages into a flat hierarchy of `sections/`, `templates/`, and root files (`branding.ts`, `manifest.ts`, `index.ts`).

### Storefront sections are React Server Components

Storefront layouts, pages, and theme section components run as pure React Server Components with serializable props.

- **Server component sections.** Section components receive settings and blocks as serializable props without `'use client'`.
- **Leaf component interactivity.** Interactive controls like quantity pickers or mobile drawers live in isolated leaf components marked `'use client'`.
- **Class composition with cn.** Merge class names using `cn(...)` from `@repo/theme-core/utils` or `@repo/ui/lib/utils`.
- **Standard function declarations.** Declare components as standard functions with typed, destructured props rather than `React.FC`.

## Interface design

### Deep modules

Design deep modules with compact public interfaces backed by comprehensive implementations. Expose a few focused methods with simple parameters that conceal internal complexity. Avoid shallow pass-through layers that add indirection without reducing cognitive load.

### Explicit parameters

Design internal functions with mandatory parameters or typed options objects with verified defaults. Omission bugs frequently hide behind optional positional parameters (`param?: Type`). Prefer breaking changes over silent default fallbacks when parameter contracts change.

### Design for testability

Structure modules to minimize friction during automated testing:

- **Dependency injection.** Pass external collaborators into functions or constructors rather than instantiating them internally.
- **Pure transformations.** Return values directly instead of mutating external or ambient state.
- **Minimal surface area.** Expose only the methods and parameters necessary for callers to minimize required test setup.
- **SDK-style boundary contracts.** Expose typed SDK-style interfaces at third-party boundaries instead of generic HTTP fetchers. Individual methods with typed parameters and distinct return shapes mock cleanly with zero conditional request-matching logic in tests.

## Monorepo and package boundaries

### Workspace packages export direct TypeScript source

Workspace packages export directly to TypeScript source files in their `package.json` (`src/index.ts` and `src/exports/*.ts`).

- **Source consumption.** Workspace consumers compile package source directly through Next.js and Turborepo without intermediate `dist/` build steps.
- **Explicit subpath exports.** Define public entry points under explicit subpaths in `package.json` (`./types`, `./fields`, `./utilities`, `./client`). Keep internal helpers private.
- **Workspace catalogs.** Pin shared dependency versions through `catalog:` references in `package.json`.
- **Test infrastructure isolation.** `@repo/test-kit` is devDependency only. Production packages and application runtimes must not import test infrastructure.
- **Relative import paths.** Use relative imports (`./`, `../`) within packages and modules. Reserve path aliases like `@/*` strictly for `apps/app` where tsconfig paths are already defined. Do not introduce new path aliases for greenfield package code.
- **Dead code removal.** Delete unused files, exports, and dependencies identified by `bun run knip`. Remove obsolete code cleanly instead of leaving deprecated stubs or unused re-exports.

## Product and inventory model

### Every product has at least one variant

Omset Digital uses a normalized product variant hierarchy across four collections: `products`, `variantTypes`, `variantOptions`, and `variants`.

- **Variant inventory storage.** Store inventory and stock counts on individual variant records to allow row-level locking in PostgreSQL during checkout transactions.
- **Physical properties.** Store `weight` in grams alongside `price` and `stock` on each variant record for shipping calculations.

## Testing

### Tests verify public contracts, not private plumbing

Tests verify observable behavior through public interfaces. Mock external boundaries only (network APIs, system time, randomness). Internal code and Payload run real.

- **Two-tier test classification.** Colocate unit and UI tests in `src/` (`.test.ts` for logic, `.test.tsx` for JSDOM components). Place relational and hook integration tests in `test/integrations/` (`.integration.test.ts`).
- **Real Payload execution.** Run integration tests against the real Payload Local API via `@repo/test-kit`, backed by in-memory SQLite in packages or worker-scoped PostgreSQL schemas in `apps/app`.
- **External network mocking.** Intercept third-party HTTP boundaries (payment gateways, shipping APIs, transactional email) using MSW handlers from `@repo/test-kit`.
- **Internal collaborator realism.** Exercise real internal collaborators and utilities. When a unit resists testing without mocks, simplify the interface.

For fixture APIs, document factories, worked examples, and TDD workflow, see `docs/TESTING_STANDARDS.md`.
