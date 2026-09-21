# Template token + component registry architecture

The storefront rendering system is redesigned around three separated concerns: a closed base token vocabulary, a per-template section component registry, and a machine-readable TemplateManifest. A Payload plugin (`payload-plugin-template-registry`) reads manifests at boot time and generates the admin UI automatically. The storefront (`apps/storefront`) is a fully decoupled Next.js application that fetches Tenant data via `@payloadcms/sdk` REST and maintains a static component registry resolved at render time.

This supersedes the original `ThemeRenderer` monolith described in issue #17 and the stub approach in `packages/themes/{default,minimal}`.

## What changed and why

**The original design** had each theme package export a single `ThemeRenderer(props: ThemeProps)` component. The renderer owned layout, section dispatch, and visual design simultaneously. Three problems followed: adding a new `SectionType` required updating every theme; `themeConfig: Record<string, unknown>` on the Tenant had no schema, so the Payload admin could not generate a configuration UI; and switching themes was destructive because content and presentation were coupled inside one render tree.

**The new design** separates those three concerns cleanly:

1. **TemplateTokens** — a closed Zod vocabulary (colors, typography, spacing) shared across all templates. Merchants override individual tokens; overrides persist across template switches. Every template declares its own default values within the shared schema.

2. **TemplateManifest** — a machine-readable descriptor the plugin reads at boot time. Declares slug, label, `supportedSections: SectionType[]`, `defaultSections: SectionType[]` (ordered seed), `defaultTokens`, `tokenSchema`, and an optional `settingsSchema: ZodObject` for per-template layout and behavior switches.

3. **SectionRegistry** — a map of section type string → RSC component. Templates are not required to implement every section. Missing sections fall back to a platform default renderer. `SectionType` is defined as `"hero" | "product-grid" | "about" | "testimonials" | "contact" | "blog-preview" | (string & {})` — an open union that lets templates declare custom section types without touching the shared contract package.

## Package boundaries

```
@repo/template-contract     types and Zod schemas only; no runtime code
                            TemplateTokenSchema, SectionRegistry, TemplateManifest,
                            Universal block Payload field definitions

@repo/ui                    React components for Universal Blocks (RichText, Table, Media)
                            Template section components import from here

packages/templates/{name}/  exports { manifest, registry } satisfying TemplatePackage
                            owns tokensToCssVars(), sections/, pageBlocks/

@repo/payload-plugin-template-registry
                            reads manifests at plugin init time
                            mutates Tenants collection: activeTemplate select,
                            templateTokens group (from base schema),
                            templateConfig group-of-groups (per-template settings,
                            admin.condition = activeTemplate)
                            registers Universal block types in Payload
                            registers per-template pageBlocks on Products collection

apps/admin                  Payload CMS; runs payload generate:types →
                            packages/types/src/payload-types.ts

apps/storefront             fully decoupled Next.js; uses @payloadcms/sdk REST only
                            static TEMPLATE_REGISTRY with next/dynamic per template
                            middleware: slug parsed from Host subdomain (no lookup)
                            custom domain → Redis lookup (self-hosted, loopback)
                            status gating in RSC layout component, not middleware
```

## Tenant document fields (injected by plugin)

- `activeTemplate` — select; options derived from registered manifest slugs.
- `templateTokens` — Payload group generated from `TemplateTokenSchema` via `zodToPayloadFields()`. Stores only merchant overrides; platform merges `deepMerge(manifest.defaultTokens, templateTokens)` at render time.
- `templateConfig` — group-of-groups; one sub-group per registered template slug, each generated from that template's `settingsSchema`. `admin.condition` hides all but the active template's group in the UI. Merchant overrides merged with `manifest.defaultSettings` at render time.

## `SectionType` extensibility

`SectionType` uses the TypeScript `T | (string & {})` idiom in `@repo/template-contract`:

```ts
export type BaseSectionType =
  | "hero"
  | "product-grid"
  | "about"
  | "testimonials"
  | "contact"
  | "blog-preview";

export type SectionType = BaseSectionType | (string & {});
```

Known values remain autocomplete-visible and documented. Templates declare custom section types (e.g. `"lookbook"`) locally without any change to `@repo/template-contract`. The platform's section render loop handles any string key; the fallback renderer handles unknown types gracefully.

## Product page blocks

Each product document has an optional `pageBlocks` Payload `blocks` field. Two categories of blocks:

- **Universal blocks** — RichText, Table, Media. Platform-level; `@repo/template-contract` holds their Payload field definitions; `@repo/ui` holds their React renderers. Every template can render them.
- **Template-specific blocks** — declared in the template's `pageBlocks/` directory and manifest. The plugin registers them alongside Universal blocks. A template-specific block rendered by a different template falls back to a no-op or a platform default.

## Cross-process cache invalidation

`apps/storefront` caches Tenant data via Next.js fetch cache tagged `tenant-{slug}`. `apps/admin` fires a Payload `afterChange` hook on the Tenant collection that calls `POST https://storefront-internal/api/revalidate` with a shared secret. The storefront route handler calls `revalidateTag(\`tenant-${slug}\`)`, invalidating all cached pages for that Tenant.

Custom domain → tenant slug mappings are cached in Redis (self-hosted on the same VPS, loopback latency). The `afterChange` hook deletes the old Redis key when `customDomain` changes.

Revalidation scope per field change:

| Field | Cache invalidated |
|---|---|
| `customDomain` | Redis key for old domain |
| `activeTemplate` | `tenant-{slug}` (all storefront pages) |
| `templateTokens` | `tenant-{slug}` |
| `templateConfig.*` | `tenant-{slug}` |
| `name` / `logo` | `tenant-{slug}` |
| `status` / `trialEndsAt` | `tenant-{slug}` |

In v1, the hook fires `revalidateTag` on any Tenant field change without per-field discrimination. Per-field granularity is an optimization for later.

## Considered options

**Single `ThemeRenderer` monolith per theme package** (original spec, issue #17): rejected because it couples layout, section dispatch, and visual design; adding a section type requires touching every theme; `themeConfig: Record<string, unknown>` is unvalidated; the admin UI cannot reflect a theme's capabilities.

**Puck visual editor** (ShopNex pattern): rejected per `docs/research/shopnex-reference.md` §6 — Puck couples layout JSON to the document tree, making template switches destructive and breaking the "switching never loses content" principle for section data.

**Per-template token schema** (no shared base): rejected because it means the Payload admin form changes shape when a merchant switches templates, which is confusing UX. A closed shared vocabulary for tokens ensures branding fields (color, typography, spacing) are always visible and always portable.

**Per-template arbitrary Payload fields for settings**: rejected because it lets templates inject arbitrary Payload field hierarchies into the plugin, making the plugin brittle and untestable. A bounded `settings: ZodObject` group keeps the extension surface controlled.

**`unstable_cache` or `next: { revalidate }` in storefront middleware**: rejected because neither API is available in the Next.js middleware runtime. Redis is used for custom domain lookups in middleware; Next.js fetch cache with `revalidateTag` is used for page data in RSC.

## Consequences

- `ThemeProps` in `@repo/types` is dead code once `apps/storefront` migrates to the section render loop. Remove it after migration.
- `payload generate:types` must output to `packages/types/src/payload-types.ts`. Handwritten contracts in `packages/types/src/index.ts` stay separate; the package re-exports both.
- Adding a new template requires: creating the package under `packages/templates/`, adding it to the static `TEMPLATE_REGISTRY` in `apps/storefront`, and registering its manifest in `payload.config.ts`. A deploy is required. This is correct — template component code must be bundled.
- The two-app deployment (Dokploy services for `apps/admin` and `apps/storefront`) means Payload admin deploys do not take down the storefront and vice versa. Both services share PostgreSQL and Redis on the same VPS.
