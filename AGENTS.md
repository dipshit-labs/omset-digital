## Agent skills

### Issue tracker

Issues and specifications live in GitHub Issues on `dipshit-labs/omset-digital`. Use the `gh` CLI for all operations. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout with `CONTEXT.md` at root and architecture decision records under `docs/adr/`. Consult these before planning domain changes. See `docs/agents/domain.md`.

### Coding standards

`CODING_STANDARDS.md` defines the contracts evaluated during `/code-review`. Read it while writing code, not only during review. Core rules:
- **Tenant isolation.** Every write to tenant data must pass store scoping through `enforceStoreOnCreate` and `canWrite`.
- **No any leaks.** Unknown incoming values get `unknown` and type guards. Type assertions require `// SAFETY:` justifications.
- **Normalized product variants.** Products split across four collections: `products`, `variantTypes`, `variantOptions`, and `variants`. Every variant stores weight in grams for shipping calculations.
- **Storefront sections.** Section components render as pure React Server Components without client JavaScript.
- **Declarative theme tokens.** Theme settings bind directly to CSS variables on field definitions. Evaluated centrally with `evaluateThemeCssVars` rather than per-theme functions.
- **No Payload mocks.** Integration tests run against the real Payload Local API backed by in-memory SQLite in packages or PostgreSQL worker schemas in `apps/app` via `@repo/test-kit`. Hand-rolled mock clients and hook runners are banned.

### Repository layout and boundaries

Turborepo monorepo managed with Bun. Packages export TypeScript source directly through explicit subpaths in `package.json`.
- `apps/app`. Next.js 15 App Router with embedded Payload CMS 3. Routes isolate public buyer pages in `(storefront)` and admin API endpoints in `(payload)`. Runtime server environment variables must resolve through `@/env` at boot.
- `packages/payload-plugin-themes`. Payload plugin managing themes and templates. Public entry points export through `./types`, `./fields`, `./utilities`, and `./client`.
- `packages/themes/*`. Leaf storefront themes such as `@repo/theme-default`. Theme packages are pure TypeScript with zero Payload runtime dependencies. They import contracts and primitives only from `@repo/theme-core`. Theme layouts structure code into `sections/`, `templates/`, and root `branding.ts`.
- `packages/ui`. Shared design tokens, CSS variables, and primitives dedicated exclusively to Omset Digital marketing pages and admin interfaces.
- `packages/types`. Monorepo types and generated Payload schema.
- `packages/test-kit`. Shared integration test infrastructure: in-memory SQLite and PostgreSQL schema management, MSW network handlers, Payload Local API fixture, and typed request stubs. Zero production imports; `devDependency` only.

### Testing

Vitest runs unit and integration tests across two tiers. Unit and UI tests live colocated in `src/` (`.test.ts` on Node, `.test.tsx` on JSDOM via project-based environment configs). Integration tests (`.integration.test.ts`) live in a flat `test/integrations/` directory, running against the real Payload Local API backed by in-memory SQLite in packages or PostgreSQL worker schemas in `apps/app` via `@repo/test-kit`. External network requests are intercepted with MSW.

Run specific suites during iteration:
- `bun --filter <package> test:unit`
- `bun --filter <package> test:integration`
- Single file: `bun --filter <package> test src/path/to/file.test.ts` or `bun --filter <package> test test/integrations/feature.integration.test.ts`

Never mock Payload operations. Use `@repo/test-kit` fixtures for integration tests and Fishery factories in `test/factories/` for typed document generation. For test design, boundary mocking, and worked examples, see `docs/TESTING_STANDARDS.md`.
### Runtime server logs

`bun run dev` pipes server output through `scripts/run-with-log.ts` into `.data/logs/`. Read `.data/logs/dev-latest.log` when pages throw at runtime, Payload hooks crash, or SSR fails. See `docs/agents/runtime-logs.md`.

### Browser verification

Drive user-facing storefront pages and Payload Admin in browser tabs using the `browser` tool before completing UI changes or resolving layout bugs. See `docs/agents/browser-verification.md` and feature maps under `docs/agents/features/`.

### Quality checks

- While making changes, run `bun run fix` to auto-format and resolve autofixable lint issues.
- Before finishing, run `bun run check -- --format=agent` and `bun run typecheck` to ensure no lint warnings or TypeScript errors remain.
