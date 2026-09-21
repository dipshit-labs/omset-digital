# Template token + component registry architecture

**Date:** 2026-09-21
**Status:** Settled — see `docs/adr/0003-template-token-component-registry.md`
**Supersedes:** original theme stub approach described in issue #17 and `packages/themes/{default,minimal}`

---

## 1. Why the original spec fell short

The original design had each theme package export a single `ThemeRenderer(props: ThemeProps)` component owning layout, section dispatch, and visual design simultaneously. Three structural problems:

1. Adding a new `SectionType` required updating every theme package.
2. `themeConfig: Record<string, unknown>` had no schema — the Payload admin could not generate a configuration UI.
3. The `ThemeRenderer` monolith made template switches destructive — content and presentation were coupled inside one render tree.

The new architecture separates those concerns across three explicit boundaries: a closed base token vocabulary, a per-template section component registry, and a machine-readable TemplateManifest.

---

## 2. Settled decisions (all questions resolved)

### Term: Template, not Theme

`Theme` is retired. `Template` is the canonical term throughout the codebase and domain model. `CONTEXT.md` updated accordingly.

`SectionType` uses the `T | (string & {})` TypeScript idiom — known base values are autocomplete-visible; templates declare custom section types locally without touching `@repo/template-contract`.

### Storefront: fully decoupled `apps/storefront`

`apps/storefront` is a separate Next.js application with no Payload Local API access. It reads all data via `@payloadcms/sdk` (official Payload REST SDK). It has its own Dokploy service, deployed independently from `apps/admin`.

Turborepo dependency ordering ensures `apps/admin` runs `payload generate:types` before `apps/storefront` builds. Generated types land in `packages/types/src/payload-types.ts`; handwritten contracts stay in `packages/types/src/index.ts`.

### Token contract: closed base + optional per-template settings group

All templates share a closed `TemplateTokenSchema` (colors, typography, spacing) defined in `@repo/template-contract`. Token overrides are stored on the Tenant document under `templateTokens`. Overrides persist across template switches — they represent merchant branding, not template behavior.

Each template may additionally declare one `settingsSchema: ZodObject` for layout and behavior switches (e.g. `heroLayout: 'centered' | 'split'`, `showTicker: boolean`, `columns: '2' | '3' | '4'`). Settings live in a namespaced `templateConfig` map on the Tenant document, keyed by template slug:

```json
{
  "templateConfig": {
    "default": { "heroLayout": "split", "showTicker": false },
    "minimal": { "showBorderLine": true }
  }
}
```

At render time the storefront reads `templateConfig[activeTemplate]` and merges it with `manifest.defaultSettings`. The Payload admin uses `admin.condition` to show only the active template's settings group — dormant namespaces are invisible to the merchant but preserved in the document.

Settings reset to the incoming template's defaults on a switch. The old namespace is kept but ignored.

### Plugin: `payload-plugin-template-registry`

Takes `{ templates: Record<string, TemplateManifest> }` at init. At boot it:

1. Validates slug uniqueness.
2. Injects `activeTemplate` (select, options from manifest slugs) onto the Tenants collection.
3. Injects `templateTokens` (Payload group generated from `TemplateTokenSchema` via `zodToPayloadFields()`).
4. Injects `templateConfig` (group-of-groups; one sub-group per template slug, generated from each template's `settingsSchema`; conditioned on `activeTemplate`).
5. Registers Universal block types (RichText, Table, Media) in Payload.
6. Registers template-specific `pageBlocks` on the Products collection from each manifest.

`zodToPayloadFields()` maps Zod primitives to Payload field definitions:
- `z.string()` → `{ type: 'text' }`
- `z.enum([...])` → `{ type: 'select', options: [...] }`
- `z.object({...})` → `{ type: 'group', fields: [...] }`
- `z.boolean()` → `{ type: 'checkbox' }`
- `z.number()` → `{ type: 'number' }`
- `.optional()` → `required: false`

### Universal blocks vs. template-specific blocks

**Universal blocks** (RichText, Table, Media) are platform-defined. Their Payload field definitions live in `@repo/template-contract`; their React components live in `@repo/ui`. Every template can render them without declaring them.

**Template-specific blocks** are declared in `manifest.pageBlocks` and implemented in `packages/templates/{name}/src/pageBlocks/`. The plugin registers them alongside Universal blocks on the Products `pageBlocks` field. A template-specific block encountered by a different active template falls back to the platform's no-op renderer.

Both categories populate the `pageBlocks` Payload `blocks` field on individual Product documents. Content appears below the media gallery and product details on the product page. Use cases: product spec tables, embedded video, additional rich text sections.

### Storefront middleware and hostname resolution

`apps/storefront` Next.js middleware is intentionally dumb and fast:

- **Subdomains** (`{slug}.omsetdigital.com`): slug is parsed directly from the `Host` header — no lookup, no I/O.
- **Custom domains**: Redis lookup (self-hosted on same VPS, loopback). Key: `customDomain:{hostname}` → tenant slug. TTL: configurable, suggested 5 minutes.
- **Status gating** (subscription expired, trial lapsed): handled in the RSC layout component, not in middleware. Middleware rewrites the URL; the layout component fetches the Tenant and renders the "store unavailable" page when status is `past_due`, `canceled`, or trial expired. This keeps middleware latency near zero.

`unstable_cache` and `next: { revalidate }` are unavailable in the Next.js middleware runtime — hence Redis for the custom domain lookup.

### Cache invalidation pipeline

`apps/storefront` tags all Tenant-related fetch calls with `tenant-{slug}`. A Payload `afterChange` hook on the Tenants collection in `apps/admin` fires `POST https://storefront-internal/api/revalidate` with a shared secret. The storefront route handler calls `revalidateTag(\`tenant-${slug}\`)`, purging all cached pages for that Tenant.

Custom domain changes also delete the old Redis key: `DEL customDomain:{old_hostname}`.

In v1 the hook fires on any Tenant field change without per-field discrimination. The revalidation endpoint is secured with a `REVALIDATION_SECRET` environment variable checked via constant-time comparison.

### Deployment

Two separate Dokploy services on Hostinger KVM2 VPS:

| Service | App | Traefik routing |
|---|---|---|
| `admin` | `apps/admin` (Payload CMS) | `admin.omsetdigital.com` |
| `storefront` | `apps/storefront` (Next.js) | `*.omsetdigital.com`, custom domains |
| `postgres` | PostgreSQL | internal only |
| `redis` | Redis | internal only |

Independent deployments mean a Payload admin redeploy does not interrupt storefront traffic.

### Static template registry in `apps/storefront`

```ts
// apps/storefront/src/lib/template-registry.ts

import dynamic from "next/dynamic";
import type { TemplatePackage } from "@repo/template-contract";

export const TEMPLATE_REGISTRY: Record<
  string,
  () => Promise<{ template: TemplatePackage }>
> = {
  default: () => import("@repo/template-default"),
  minimal: () => import("@repo/template-minimal"),
};
```

Manual — adding a template requires updating this file and redeploying. No codegen. Build-time static analysis; Next.js `next/dynamic` handles code splitting per template bundle.

---

## 3. Package structure

```
packages/
  template-contract/
    package.json          "@repo/template-contract"
    src/
      tokens.ts           TemplateTokenSchema, TemplateTokens
      registry.ts         SectionRegistry, SectionProps, SectionType
      manifest.ts         TemplateManifest, TemplatePackage
      blocks.ts           Universal block Payload field definitions
      index.ts            re-exports all

  templates/
    default/
      package.json        "@repo/template-default"
      src/
        manifest.ts       TemplateManifest + settingsSchema
        tokens.ts         tokensToCssVars() for this template
        sections/         RSC components per SectionType
        pageBlocks/       template-specific block components
        index.ts          export const template: TemplatePackage
    minimal/
      (same shape)

  payload-plugin-template-registry/
    package.json          "@repo/payload-plugin-template-registry"
    src/
      index.ts            templateRegistryPlugin() factory
      zod-to-payload.ts   zodToPayloadFields() utility
      fields/
        token-fields.ts   templateTokens group builder
        config-fields.ts  templateConfig group-of-groups builder
      blocks/
        universal.ts      Universal block Payload field definitions

  ui/
    src/
      components/
        blocks/           Universal block React components
          rich-text.tsx
          table.tsx
          media.tsx

  types/
    src/
      index.ts            handwritten contracts (PaymentProvider, ShippingProvider, …)
      payload-types.ts    generated by payload generate:types (apps/admin output)

apps/
  admin/                  Payload CMS + payload generate:types
  storefront/             Next.js, @payloadcms/sdk REST, static TEMPLATE_REGISTRY
```

---

## 4. Request-time data flow

```
apps/storefront — incoming request to {slug}.omsetdigital.com

1. Middleware
   ├── Parse slug from Host subdomain (no I/O)
   └── Set x-tenant-slug header; rewrite to /[slug][path]

2. RSC Layout (app/[slug]/layout.tsx)
   ├── sdk.find('tenants', { where: { slug: { equals: slug } } })
   │   (fetch tagged tenant-{slug}, revalidated on admin hook)
   ├── Check status → render StoreUnavailable if gated
   └── Inject CSS vars from resolvedTokens onto <html>

3. RSC Page (app/[slug]/page.tsx — home)
   ├── sdk.findGlobal('storefront-content', { where: { tenant: … } })
   ├── TEMPLATE_REGISTRY[tenant.activeTemplate]()  ← dynamic import
   ├── resolvedTokens = deepMerge(manifest.defaultTokens, tenant.templateTokens)
   ├── activeSettings = deepMerge(manifest.defaultSettings,
   │                              tenant.templateConfig[activeTemplate])
   └── sections.filter(enabled).sort(order).map(section =>
         template.registry[section.type] ?? DefaultSection)

4. Product page (app/[slug]/products/[productSlug]/page.tsx)
   ├── sdk.find('products', { … })
   ├── Render product details + media gallery
   └── product.pageBlocks.map(block =>
         universalBlocks[block.blockType]
         ?? template.pageBlocks[block.blockType]
         ?? NoopBlock)
```

---

## 5. Trade-offs accepted

**Two Node.js processes on KVM2 (1 vCPU, 4GB RAM).** Real constraint. Accepted because operational independence (storefront stays up during admin deploys) outweighs the RAM cost. Both processes are Next.js — they can share system libraries. Redis adds ~30MB. Monitor memory usage; vertical scale to KVM4 if needed.

**REST over Local API.** The storefront pays a serialization cost and a loopback network hop on every Tenant/StorefrontContent fetch. Mitigated by Next.js fetch caching with `revalidateTag` — most requests are served from the RSC cache, not from live Payload queries.

**Token schema is a closed vocabulary.** Templates cannot add arbitrary token fields. Adding a new base token (e.g. `accentColor`) requires updating `TemplateTokenSchema` in `@repo/template-contract` and redeploying. Accepted: the closed vocabulary is what guarantees the admin form is stable and branding persists across template switches.

**Static `TEMPLATE_REGISTRY` requires a deploy to add a template.** Accepted: template component code must be bundled; there is no alternative. The manifest contract is already the right interface for a future dynamic marketplace if scope ever changes.
