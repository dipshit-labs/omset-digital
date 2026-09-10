# PayloadCMS Plugins Evaluation: Third-Party Ecosystem vs. Internal Architecture

**Author:** Technical Architecture Research  
**Date:** September 2026  
**Status:** Completed  
**Target Project:** Omset Digital (Multi-tenant SaaS with BYOK integrations on Next.js 16 + Payload 3.88 + React 19 + Postgres)

---

## 1. Executive Summary & Core Verdict

PayloadCMS 3.x is an enterprise-grade headless CMS and application framework running natively on the Next.js App Router with React Server Components (RSC). Its plugin architecture centers around the functional contract `type Plugin = (config: Config) => Config`, allowing packages to mutate schema definitions, register collections, add custom REST/GraphQL endpoints, inject lifecycle hooks, and mount admin UI components.

However, an in-depth survey of official plugins (`@payloadcms/*`), community directories ([payloaddirectory.dev](https://payloaddirectory.dev), [payload.market](https://payload.market)), and npm packages reveals a fundamental architectural mismatch between off-the-shelf plugins and Omset Digital's product requirements:

1. **Third-Party Payment Gateways Are Single-Tenant Global Configurations:**
   Official plugins (`@payloadcms/plugin-stripe`, `@payloadcms/plugin-ecommerce`) and third-party solutions configure credentials (e.g. `stripeSecretKey`) once at application boot time via server environment variables (`process.env.STRIPE_SECRET_KEY`). None support multi-tenant Bring-Your-Own-Key (BYOK), where API keys, webhooks, and secrets reside dynamically inside tenant documents in Postgres. Furthermore, there are zero Payload plugins for Indonesian gateways (Xendit, Midtrans).
2. **Indonesian Couriers Require Pure Stateless Domain Adapters:**
   There are no plugins for Indonesian courier aggregates (RajaOngkir, Biteship). Shipping rate lookups are dynamic, stateless runtime calls based on origin, destination, and package weight. Wrapping RajaOngkir in a Payload CMS plugin provides zero leverage; doing so merely adds unnecessary build and bundling overhead without any CMS benefit.
3. **Storefront Theming Belongs in the Next.js App Router Domain Layer:**
   Payload plugins manipulate the CMS admin schema and backend APIs. Storefront theming in Omset Digital operates across `@repo/theme-default`, `@repo/theme-minimal`, and `StorefrontContent`. The CMS simply holds JSON block configurations; the Next.js storefront renders themes independently via React Server Components.
4. **Internal Plugin vs. Domain Adapter Verdict:**
   - **Do NOT adopt third-party payment/shipping/theme plugins.**
   - **Do NOT build internal Payload plugins (`@repo/payload-plugin-*`) for runtime business logic.**
   - **STRICTLY USE internal domain adapters and standard Payload collections:**
     - Implement payments using the ADR 0001 `PaymentProvider` interface in `packages/payment` with static registry resolution and tenant-level `blocks` for credential storage.
     - Implement shipping via the `ShippingProvider` adapter interface (`RajaOngkirProvider`) in `packages/shipping`.
     - Implement storefront theming using Next.js App Router dynamic imports and RSC page renderers consuming `StorefrontContent`.
   - **The ONLY valid use case for a Payload Plugin in this codebase:** Cross-cutting schema decorators, such as automating tenant filtering or enforcing audit trails across multiple collections.

---

## 2. Primary Sources Consulted

All findings in this evaluation are backed by primary documentation and repository analysis:

1. **Official PayloadCMS Documentation & Specs:**
   - Payload Plugins Overview: <https://payloadcms.com/docs/plugins/overview>
   - Advanced Plugin API (`definePlugin`, `order`, plugin maps): <https://payloadcms.com/docs/plugins/plugin-api>
   - Building Your Own Plugin: <https://payloadcms.com/docs/plugins/build-your-own>
   - Stripe Plugin (`@payloadcms/plugin-stripe`): <https://payloadcms.com/docs/plugins/stripe>
   - Ecommerce Plugin & Payment Adapters (`@payloadcms/plugin-ecommerce`): <https://payloadcms.com/docs/ecommerce/payments>
   - Multi-Tenant Plugin (`@payloadcms/plugin-multi-tenant`): <https://payloadcms.com/docs/plugins/multi-tenant>
   - Payload 3.0 Next.js App Router Architecture: <https://payloadcms.com/docs/migration-guide/v3>
2. **Plugin Registries & Marketplaces:**
   - Payload CMS Plugin Directory: <https://payloaddirectory.dev>
   - Payload Market (Plugins & Themes): <https://payload.market/plugins>
   - Official Monorepo Plugin Directory: <https://github.com/payloadcms/payload/tree/main/packages>
   - NPM Registry searches for `payload-plugin-stripe`, `payload-plugin-ecommerce`, `payload-billing`, `midtrans-client`, `xendit-node`.
3. **Internal Repository Context:**
   - `CONTEXT.md`: System boundary, Merchant/Buyer roles, Tenant BYOK model, `StorefrontContent`, Section models.
   - `docs/adr/0001-generic-payment-provider-interface.md`: ADR establishing the `PaymentProvider` interface, Tenant-level `blocks` credentials, isolated webhook routes (`/api/webhooks/[provider]/[tenantSlug]`).
   - `packages/types/src/index.ts`: Contracts for `PaymentProvider`, `ShippingProvider`, `ThemeProps`, `SectionConfig`.

---

## 3. Survey of Existing Plugins (Official & Community)

### 3.1 Official Plugins Overview (`@payloadcms/*`)

| Plugin Name | Category | Fit for Omset Digital | Key Reason |
| :--- | :--- | :--- | :--- |
| `@payloadcms/plugin-stripe` | Payments | ❌ Incompatible | Single-tenant, env-var driven (`process.env.STRIPE_SECRET_KEY`). No multi-tenant BYOK. |
| `@payloadcms/plugin-ecommerce` | E-commerce Core | ❌ Incompatible | Imposes monolithic schema (products, carts, orders, transactions) with fixed single-tenant Stripe adapter. Conflicts with Omset's SKU variant tree and BYOK payment model. |
| `@payloadcms/plugin-multi-tenant` | Data Scoping | ⚠️ Partial / Reference Only | Adds `tenant` relationship field to collections and injects admin tenant switcher. Omset Digital has specialized custom domain/slug routing and access rules. |
| `@payloadcms/plugin-seo` | Content SEO | ✅ Usable | Injects standard SEO meta fields (title, description, image) to collections/globals. |
| `@payloadcms/plugin-search` | Content Search | ⚠️ Low Priority | Syncs collections into a dedicated search collection. Not needed for initial storefront search. |
| `@payloadcms/plugin-redirects` | Routing | ⚠️ Low Priority | Useful for custom vanity URLs or legacy migrations, but custom domain routing is handled at Next.js edge/middleware. |
| `@payloadcms/plugin-form-builder`| Forms | ❌ Not Needed | Stores dynamic form definitions. Omset Digital uses typed checkout/contact forms. |

### 3.2 Marketplace & Directory Survey (payloaddirectory.dev & payload.market)

Across 257 plugins on `payloaddirectory.dev` and 206 plugins on `payload.market`:
- **Payments:** Almost exclusively Stripe integrations (e.g. `@xtr-dev/payload-billing`, `@wtree/payload-ecommerce-coupon`, official Stripe). Zero plugins exist for Indonesian gateways (Xendit, Midtrans, DOKU, Faspay, Duitku). Zero plugins support multi-tenant runtime credential injection.
- **Shipping:** Exactly zero plugins for shipping logistics or couriers (neither international DHL/FedEx nor Indonesian RajaOngkir/Biteship/Shipper).
- **Themes & Templates:** The marketplace concept of "Themes" refers to UI color themes for the Payload Admin Panel or starter templates (boilerplates). No plugins exist for multi-theme storefront rendering engines.
- **Multi-Tenancy:** Community plugins focus on admin masquerade (`payload-plugin-masquerade`) or basic RBAC (`payload-workflow`). None solve multi-tenant storefront edge routing.

---

## 4. Deep Dive 1: Payment Gateways (BYOK vs. Global Env Plugins)

### 4.1 The Single-Tenant Fallacy in Existing Plugins

The official `@payloadcms/plugin-stripe` and `@payloadcms/plugin-ecommerce` payment adapters are configured in `payload.config.ts`:

```ts
// Typical Payload Stripe Plugin setup
export default buildConfig({
  plugins: [
    stripePlugin({
      stripeSecretKey: process.env.STRIPE_SECRET_KEY,
      stripeWebhooksEndpointSecret: process.env.STRIPE_WEBHOOKS_ENDPOINT_SECRET,
      rest: true,
      webhooks: { /* handlers */ },
    }),
  ],
})
```

**Why this fails Omset Digital:**
1. **Static Initialization:** `payload.config.ts` executes once when the Next.js server starts. `stripeSecretKey` is bound at boot.
2. **Platform vs. Tenant Funds:** Omset Digital is a multi-tenant SaaS platform where Indonesian SMEs bring their own keys (BYOK). Funds must flow directly from Buyer to Merchant accounts. A single global key in `process.env` routes all platform transactions into one merchant account.
3. **No Dynamic Key Resolution:** The internal methods of `@payloadcms/plugin-stripe` instantiate a single `new Stripe(stripeSecretKey)` instance. There is no hook or parameter to pass a `tenantId` into the Stripe client instantiation per request.

### 4.2 Comparison with Omset Digital ADR 0001 Architecture

| Architectural Dimension | Third-Party Payload Plugins | Omset Digital ADR 0001 Architecture |
| :--- | :--- | :--- |
| **Credential Storage** | Static `process.env` variables | Database: Tenant document `paymentProviders` block array with field-level access control. |
| **Supported Gateways** | Stripe (and Mollie in community plugins) | Extensible static map (`xendit`, `midtrans`, `stripe`). Indonesian gateways first-class. |
| **Tenant Isolation** | None (Single account per deployment) | Complete isolation. Each merchant configures their own public/secret keys. |
| **Webhook Endpoint** | Hardcoded `/api/stripe/webhooks` | Dynamic route: `/api/webhooks/[provider]/[tenantSlug]` isolating signature verification per tenant. |
| **Status Canonicalization** | Tightly coupled to Stripe status (`succeeded`, `requires_capture`) | Decoupled adapter mapping to canonical `pending`, `paid`, `expired`, `failed`, `cancelled`. |
| **Interface Surface** | Heavy (synchronizes customers, products, invoices into CMS) | Lean: `createSession(order)` and `parseWebhook(request)`. Only minimal order drafts passed. |

**Verdict:** Adopting `@payloadcms/plugin-stripe` or `@payloadcms/plugin-ecommerce` would require rewriting their internal core to support runtime credential injection. Following ADR 0001 with pure TypeScript domain adapters is cleaner, strictly typed, and completely aligned with the multi-tenant BYOK requirement.

---

## 5. Deep Dive 2: Shipping Integrations (Indonesian Context & RajaOngkir)

### 5.1 The Nature of Indonesian Logistics

In the Indonesian e-commerce ecosystem, shipping calculation is fundamentally different from Western flat-rate or simple zone-based calculators:
- **Sub-district Precision:** Couriers (JNE, POS Indonesia, J&T, SiCepat, Anteraja) calculate rates based on sub-district (*Kecamatan*) or postal code origin and destination, not just city or province.
- **Aggregators:** Services like RajaOngkir (v1/v2/pro) or Biteship provide unified REST endpoints returning real-time `CourierOption` quotes based on weight in grams and location IDs.
- **Merchant Origin Setting:** Each Merchant ships from their specific warehouse or home address, stored in their Tenant document.

### 5.2 Plugin vs. Domain Adapter Analysis

Why wrapping RajaOngkir into a Payload CMS Plugin (`@repo/payload-plugin-rajaongkir`) is an anti-pattern:
1. **Zero Schema Value:** Shipping calculation does not require custom collections or admin tables. You do not store shipping rates in the database; rates fluctuate and are queried ephemerally during checkout.
2. **Payload Plugin Lifecycle Mismatch:** A Payload plugin runs at `buildConfig()` time to register collections, globals, and hooks. Shipping rate lookup is a runtime query executed inside a Next.js Server Action or route handler during checkout.
3. **Coupling Overhead:** Making it a Payload plugin ties the shipping client to Payload's internal request context, making it impossible or cumbersome to use in standalone background jobs, CLI scripts, or edge middleware.

**Architectural Choice:**
Implement `RajaOngkirProvider` as an implementation of `ShippingProvider` inside `packages/shipping`:
```ts
export interface ShippingProvider {
  getCosts(params: ShippingCostParams): Promise<CourierOption[] | ShippingError>;
}
```
During checkout, the route handler loads the Tenant document to retrieve the Merchant's origin postal code and RajaOngkir API key (if BYOK) or uses the platform's API tier, calls `shippingProvider.getCosts(...)`, and returns options directly to the Buyer.

---

## 6. Deep Dive 3: Template Engine & Storefront Theming

### 6.1 Payload's Native Page Building Approach

Payload CMS does not have a traditional server-rendered template engine (like WordPress PHP templates or Shopify Liquid). Instead, Payload's philosophy is **Headless Content Blocks**:
1. **Blocks Field:** A collection field of type `blocks` holds an array of structured JSON objects.
2. **Typed Data:** Each block type defines its own fields (e.g. `hero`, `product-grid`, `testimonials`).
3. **Frontend Component Mapping:** The consumer (Next.js) fetches the blocks array and renders corresponding React components:
   ```tsx
   const blockComponents = {
     hero: HeroComponent,
     'product-grid': ProductGridComponent,
     // ...
   };
   ```

### 6.2 Alignment with Omset Digital's Theme Packages

Omset Digital's domain model defines:
- `StorefrontContent`: A single Payload document per Tenant containing Section configurations.
- `Theme`: A package of React components (e.g., `@repo/theme-default`, `@repo/theme-minimal`).
- `Section`: Configurable content blocks (`hero`, `product-grid`, `about`, `testimonials`, `contact`, `blog-preview`).
- Rule from `CONTEXT.md`: **Switching Themes never changes content.**

**Evaluation of "Theme Plugins":**
- Third-party plugins that attempt to provide storefront layouts create severe lock-in and violate the separation between CMS data and presentation.
- In Next.js 16 + React 19, the storefront is rendered on the server via React Server Components.
- The theme switcher is cleanly implemented at the Next.js page level:
  ```tsx
  import { ThemeRenderer as DefaultTheme } from '@repo/theme-default';
  import { ThemeRenderer as MinimalTheme } from '@repo/theme-minimal';

  const themeRegistry = {
    default: DefaultTheme,
    minimal: MinimalTheme,
  };

  export default async function StorefrontPage({ params }) {
    const tenant = await getTenant(params.subdomain);
    const content = await getStorefrontContent(tenant.id);
    const Theme = themeRegistry[tenant.activeTheme] || DefaultTheme;

    return <Theme sections={content.sections} tenant={tenant} />;
  }
  ```
This model keeps the themes completely decoupled from Payload's internals. Payload only needs a standard collection (`StorefrontContent`) with a `blocks` field matching `SectionConfig`.

---

## 7. Payload 3.x Plugin Mechanics: When to Write a Plugin vs. Domain Adapter

Payload 3.x introduces `definePlugin`, executing as:
```ts
type Plugin = (config: Config) => Config;
```

A plugin is executed during configuration compilation. It has the ability to:
1. Append or mutate `config.collections` and `config.globals`.
2. Register custom REST endpoints via `config.endpoints`.
3. Add top-level hooks (`config.hooks.afterInit`).
4. Register admin UI custom components via `config.admin.components`.

### 7.1 Decision Matrix: Plugin vs. Domain Adapter

| Capability / Requirement | Payload Plugin (`@repo/payload-plugin-*`) | Monorepo Domain Package (`packages/*`) | Recommended Choice |
| :--- | :--- | :--- | :--- |
| **Multi-collection Schema Augmentation** | Excellent. Can iterate over `config.collections` to inject audit fields, tenant IDs, or soft-delete hooks. | Weak. Requires manual import and spreading on every collection file. | **Payload Plugin** |
| **Admin Panel UI Injections** | Excellent. Can inject custom dashboard widgets, navigational headers, or sidebars via `config.admin.components`. | Not applicable. Admin UI is configured in Payload config. | **Payload Plugin** |
| **Payment Gateway Integration (BYOK)** | Poor. Static config does not know per-request tenant credentials. Injects unnecessary endpoints. | Excellent. Pure TypeScript class/functions; zero CMS runtime dependency; fully unit-testable. | **Domain Adapter** |
| **Shipping Rate Calculation** | Poor. No persistent data or CMS integration needed. | Excellent. Stateless HTTP client calling courier APIs. Fast, light, isolated. | **Domain Adapter** |
| **Storefront Theming & Components** | Incompatible. React 19 RSC storefront is outside Payload's admin runtime. | Native. Dedicated packages (`packages/themes/default`, `minimal`) consumed by Next.js App Router. | **Theme Packages** |
| **Bundle Size & RSC Safety** | Risk of leaking server dependencies into admin client bundles if imports are not cleanly split (`exports/client` vs `exports/rsc`). | Completely isolated. Next.js App Router bundler tree-shakes unused adapter code. | **Domain Adapter** |

---

## 8. Actionable Recommendations for Roadmap & Tickets

### Recommendation 1: Do Not Install Monolithic E-Commerce or Payment Plugins
- Reject `@payloadcms/plugin-ecommerce` and `@payloadcms/plugin-stripe`.
- Reject community billing plugins from `payloaddirectory.dev` or `payload.market`.
- **Action:** Proceed directly with implementation of ADR 0001 in `packages/payment` (or `apps/app/src/lib/payment`), maintaining the `PaymentProvider` interface and creating `XenditPaymentProvider` and `MidtransPaymentProvider` adapters.

### Recommendation 2: Keep Shipping Calculations in a Dedicated Domain Library
- Do not create a Payload plugin for RajaOngkir.
- **Action:** Implement `packages/shipping` (or `apps/app/src/lib/shipping`) with `ShippingProvider` and `RajaOngkirShippingProvider`. Call it directly from the checkout Server Action / API route.

### Recommendation 3: Storefront Content via Native Payload Collections, Themes via Packages
- Model `StorefrontContent` as a standard collection in `apps/app/src/collections/StorefrontContent.ts`.
- Use a `blocks` field containing block definitions for `Hero`, `ProductGrid`, `About`, `Testimonials`, `Contact`, `BlogPreview`.
- Keep storefront layout and rendering logic inside `packages/themes/*` and render them in the Next.js `[slug]` storefront page.

### Recommendation 4: Potential Internal Payload Plugins (Future Roadmap Only)
Create an internal Payload plugin only if cross-cutting CMS administration needs arise:
1. `@repo/payload-plugin-tenant-scoping`: An internal plugin that automatically applies access control filters (`tenant = currentTenant`) to all tenant-scoped collections (`products`, `orders`, `digital-assets`) to prevent manual duplication in collection configs.
2. `@repo/payload-plugin-audit-log`: An internal plugin that attaches `afterChange` and `afterDelete` hooks to record merchant admin actions into an `audit_logs` collection.

---

## 9. Conclusion

The PayloadCMS 3.x plugin ecosystem provides good scaffolding for standard single-tenant marketing websites and traditional Stripe-based stores. For a multi-tenant SaaS with Bring-Your-Own-Key Indonesian gateways, dynamic shipping logistics, and multi-theme storefronts, third-party plugins are a liability rather than an asset.

Omset Digital's architecture of **clean domain adapters for third-party services** combined with **standard native Payload collections for data storage** and **React Server Components for storefront theming** is the most maintainable, secure, and performant design.