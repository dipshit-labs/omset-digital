# ShopNex Architecture Reference & Comparative Evaluation

**Author:** Technical Architecture Research  
**Date:** September 2026  
**Status:** Completed  
**Source Repository:** [`shopnex-ai/shopnex`](https://github.com/shopnex-ai/shopnex) (Commit: `4f79176`, Release: `v0.6.0` / `@shopnex/simple-shop: 1.0.0`)  
**Target Project:** Omset Digital (Multi-tenant SaaS with BYOK integrations on Next.js 16 + Payload 3.88 + React 19 + PostgreSQL/Drizzle)

---

## 1. Repo Overview

### Findings
ShopNex positions itself as an open-source Shopify alternative built on Payload CMS. The repository is organized as a pnpm workspace monorepo managed with Turborepo (`turbo: 2.5.4`) and changesets (`@changesets/cli: 2.27.10`).

The core technology stack consists of:
- **Payload CMS**: Version `3.77.0` (with `@payloadcms/db-sqlite`, `@payloadcms/plugin-seo`, `@payloadcms/next`, `@payloadcms/ui`).
- **Framework**: Next.js `15.5.12` (React `19.1.0`).
- **Database**: SQLite via `@payloadcms/db-sqlite` in the reference template (`apps/simple-shop`).
- **Package Manager**: pnpm `10.7.1`.

The monorepo contains two top-level project folders:

#### Applications (`apps/`)
1. `apps/simple-shop`: The flagship full-stack template running Next.js App Router and Payload 3.x in the same app (`src/app/(payload)` and `src/app/(storefront)`). Integrates Puck visual page builder, Stripe, Carts, Orders, and Products.
2. `apps/shop`: A decoupled headless storefront consuming Payload via `@shopnex/payload-sdk` and Medusa UI (`@medusajs/ui`).
3. `apps/builder-shop`: A headless storefront driven by Builder.io visual CMS and `@shopnex/payload-sdk`.
4. `apps/shopnex-docs`: Documentation site built with Nextra/Next.js MDX.
5. `apps/shopnex-email`: Standalone email template designer application using easy-email.

#### Workspace Packages (`packages/`)
- `packages/types`: Shared domain interfaces (`Cart`, `Order`, `Product`, `Payment`, `Shipping`).
- `packages/utils`: Helper functions (`getTenantFromCookie`, `EncryptedField`, `likeGlobal`).
- `packages/payload-sdk`: REST client wrapping standard Payload CRUD operations (`find`, `findByID`, `create`, `update`, `delete`, `count`).
- `packages/stripe-plugin`: Custom Payload plugin extending collections with a Stripe block, webhook endpoint (`/stripe/webhooks`), and session creation.
- `packages/builder-io-plugin`: Plugin connecting Payload CMS to Builder.io models and page synchronisation.
- `packages/puck-editor-plugin`: Plugin mounting the `@puckeditor/core` visual editor into Payload admin.
- `packages/import-export-plugin`: CSV/Excel import/export plugin for products and orders.
- `packages/cj-plugin`: Dropshipping integration with CJ Dropshipping.
- `packages/auth-plugin`: OAuth2/OIDC, WebAuthn, and passwordless authentication plugin.
- `packages/analytics-plugin`, `packages/quick-actions-plugin`, `packages/sidebar-plugin`: Admin UI customization plugins.

### File Citations
- Root manifest and tooling: `package.json:1-85`
- Primary application configuration: `apps/simple-shop/package.json:1-125`
- Payload build configuration: `apps/simple-shop/src/payload.config.ts:1-65`
- Plugin assembly: `apps/simple-shop/src/plugins.ts:1-65`

### Verdict
ShopNex is a functional monolithic single-merchant e-commerce template with extracted reusable Payload plugins, but it is not an end-to-end multi-tenant SaaS.

---

## 2. Multi-Tenancy Approach

### Findings
Despite multi-tenant claims in high-level documentation and marketing copy, ShopNex has **no real multi-tenant scoping** in its core data layer or collection definitions:

1. **Missing Multi-Tenant Plugin**: `apps/simple-shop/src/payload.config.ts` does not install `@payloadcms/plugin-multi-tenant` or any custom multi-tenant plugin.
2. **Missing Scoping Fields**: Collections such as `Products`, `Orders`, `Carts`, `Collections`, `Locations`, and `Shipping` contain no `tenant` relationship field or foreign key.
3. **Cookie Stub Only**: In `packages/utils/src/helpers/get-tenant-from-cookie.ts`, a 15-line helper parses a `payload-tenant` cookie from request headers (`cookies.get("payload-tenant")`). However, within the entire repository, this helper is referenced exclusively in `packages/stripe-plugin/src/routes/webhooks.ts` to look up Stripe credentials from a `payments` document query (`where: { shop: { equals: shopId } }`). Even there, the field on `payments` is named `shop`, not `tenant`, and `payments` itself does not have a `shop` field defined in `apps/simple-shop/src/collections/Payments.ts`.
4. **Comparison with Omset Digital**:
   - Omset Digital uses `@payloadcms/plugin-multi-tenant` with PostgreSQL/Drizzle, strictly enforcing tenant isolation at the schema level (`tenant` relationship field on every merchant collection).
   - Omset Digital isolates Buyer traffic via subdomains (`{slug}.omsetdigital.com`) and Custom Domains resolved at Next.js edge/middleware, associating sessions to a concrete `Tenant` record.
   - ShopNex operates as a single-store installation with a placeholder cookie function.

### File Citations
- Cookie helper: `packages/utils/src/helpers/get-tenant-from-cookie.ts:1-15`
- Lone consumer of cookie helper: `packages/stripe-plugin/src/routes/webhooks.ts:17-30`
- Target collection lacking shop/tenant field: `apps/simple-shop/src/collections/Payments.ts:70-98`
- Unscoped product schema: `apps/simple-shop/src/collections/Products/Products.ts:1-50`

### Verdict
ShopNex does not have a functional multi-tenant architecture; do not adopt any part of their tenant-scoping approach.

---

## 3. Collections

### Findings
ShopNex defines twelve collections in `apps/simple-shop/src/collections`:
- `Products`: Complete product catalog with a Cartesian variant builder and custom fields.
- `Orders`: Order lifecycle tracking, items via cart relationship, payment and shipping relationships, and timeline logging.
- `Carts`: Ephemeral cart session documents with variant IDs and quantities.
- `Collections`: Hierarchical product categories and tags with `join` field back to `Products`.
- `Payments`: Configuration collection holding payment provider blocks (e.g. manual payment, Stripe block).
- `Shipping`: Configuration collection storing shipping methods (flat rate, free shipping threshold).
- `Locations`: Physical stores/warehouses with latitude, longitude, and pickup flags.
- `GiftCards`: Gift card codes with balance, rate-limited balance verification endpoint, and customer relationship.
- `Pages`: CMS pages storing serialized Puck visual builder JSON layouts.
- `Policies`: Store terms, return policies, and privacy policies using Lexical rich text and slug handles.
- `Users`: Platform and store users with role arrays (`admin`, `customer`).
- `Media`: Upload collection handling product and category imagery.

#### Notable Field Patterns
1. **Cartesian Variant Generator (`BuildVariantsButton.tsx`)**:
   In `apps/simple-shop/src/collections/Products/Products.ts`, products define options via a `variantOptions` array (e.g. Option: `Color`, Values: `['Red', 'Blue']`). A custom UI component `BuildVariantsButton` calculates the Cartesian product on the client and calls Payload form dispatchers (`ADD_ROW`, `UPDATE`) to populate the `variants` array with combinations, generating auto-prefixed SKUs (`SN-${uuid.slice(0, 8)}`).
2. **Join Fields**:
   `Collections.ts` uses Payload 3.x `join` fields (`type: 'join'`, `collection: 'products'`, `on: 'collections'`) to maintain bidirectional relationships without manual hook synchronization.
3. **Encrypted Field Wrapper (`EncryptedField`)**:
   `packages/utils/src/fields/encrypted-field.ts` wraps standard text fields with `beforeChange: [encryptKey]` and `afterRead: [decryptKey]` hooks using Payload's built-in AES encryption (`req.payload.encrypt()` / `req.payload.decrypt()`), paired with a custom React RSC component (`ApiToken.tsx`) that masks sensitive API keys in the admin UI.
4. **Rate-Limited Custom Endpoints**:
   `GiftCards.ts` mounts a custom verification GET endpoint (`/api/gift-cards/verify`) protected by `rate-limiter-flexible` against client IP abuse.

#### Comparison with Omset Digital Model
- **Missing Collections in Omset Digital**: `GiftCards`, `Locations` (physical pickup addresses), and `Policies` are not yet modeled in Omset Digital. `Locations` is relevant for Indonesian shipping origins (determining the origin sub-district for RajaOngkir).
- **Modeling Differences**:
  - Omset Digital models SKUs as first-class records derived from Variant Axes. ShopNex stores variants as nested array rows inside the Product document, which limits individual inventory indexing at scale.
  - Omset Digital separates Order Payment Status (`pending`, `paid`, `expired`, `failed`, `cancelled`) from Fulfilment Status (`processing`, `shipped`, `delivered`). ShopNex mixes these into `orderStatus` and `paymentStatus` with informal select values.

### File Citations
- Variant builder field: `apps/simple-shop/src/collections/Products/Products.ts:167-217`
- Variant generator algorithm: `apps/simple-shop/src/collections/Products/fields/BuildVariantsButton.tsx:36-84`
- Join field configuration: `apps/simple-shop/src/collections/Collections.ts:54-62`
- Field-level encryption: `packages/utils/src/fields/encrypted-field.ts:1-24`
- Gift card rate limiting: `apps/simple-shop/src/collections/GiftCards.ts:30-68`

### Verdict
Adopt ShopNex's Cartesian option generator UI pattern and the `EncryptedField` wrapper; skip their nested-array variant storage in favor of Omset Digital's normalized SKU model.

---

## 4. Payment Integration

### Findings
Payment processing in ShopNex is handled through a hybrid architecture consisting of the `Payments` collection, `packages/stripe-plugin`, and an `/api/orders/checkout` endpoint:

1. **Provider Configuration via Blocks**:
   The `Payments` collection defines providers using a `blocks` field. Out of the box, it includes `ManualProvider` (supporting Cash on Delivery, Bank Transfer with account details, and In-Store payment). When `@shopnex/stripe-plugin` is registered in `plugins.ts`, the plugin mutates the `Payments` collection by pushing `StripeBlock` into `providerField.blocks`.
2. **Credential Storage**:
   The `StripeBlock` stores `stripeSecretKey`, `stripeWebhooksEndpointSecret`, and `publishableKey` encrypted via `EncryptedField`. It allows test mode toggling and payment method configuration (`card`, `ach`, `auto`).
3. **Session Creation**:
   Checkout is initiated via the `/api/orders/checkout` endpoint defined on the `Orders` collection (`apps/simple-shop/src/collections/Orders/endpoints/checkout.ts`). It validates cart stock against live product records using `decimal.js`, retrieves the active provider handler from a static registry (`providers: Record<string, Function> = { stripe: stripeCheckout, manual: manualCheckout }`), creates a pending Order document, maps items to Stripe line items, and generates a Stripe Checkout Session.
4. **Webhook Handling**:
   The plugin registers `/api/stripe/webhooks`. When a webhook arrives:
   - It reads the `payload-tenant` cookie (which fails in standard multi-tenant setups because webhooks originate from Stripe's servers without client cookies).
   - It verifies signatures with `stripe.webhooks.constructEvent()`.
   - It invokes the configured handler `handleCheckoutSessionCompleted` in `apps/simple-shop/src/collections/Orders/webhooks/checkout-session-completed.ts`.
   - The handler updates the Order document to `paymentStatus: 'paid'` and `orderStatus: 'processing'`, pulling `payment_intent` and `receiptUrl`.

#### Comparison with Omset Digital ADR 0001
- **Critical Flaw in ShopNex Webhooks**: ShopNex's `stripeWebhooks` route attempts to read `getTenantFromCookie(req.headers)` to determine which merchant's secret to use. Stripe webhooks never contain browser cookies; this breaks multi-tenant webhook verification.
- **Omset Digital Alignment**: Omset Digital's ADR 0001 uses path-isolated webhook URLs (`/api/webhooks/[provider]/[tenantSlug]`), cleanly looking up the Tenant document by slug without cookies, and passes the payload to a stateless `PaymentProvider` adapter (`parseWebhook`).

### File Citations
- Checkout endpoint and validation: `apps/simple-shop/src/collections/Orders/endpoints/checkout.ts:162-315`
- Stripe plugin entry and collection mutation: `packages/stripe-plugin/src/index.ts:17-64`
- Stripe block definition with encryption: `packages/stripe-plugin/src/blocks/StripeBlock.ts:17-76`
- Flawed webhook signature verification: `packages/stripe-plugin/src/routes/webhooks.ts:17-45`
- Webhook completion handler: `apps/simple-shop/src/collections/Orders/webhooks/checkout-session-completed.ts:1-55`

### Verdict
The `Payments` collection with polymorphic provider `blocks` is clean and aligns with Omset Digital; reject their cookie-dependent webhook handler in favor of Omset Digital's path-based webhook routing.

---

## 5. Shipping Integration

### Findings
ShopNex shipping is basic and purely single-tenant:

1. **Collection Schema**:
   The `Shipping` collection (`apps/simple-shop/src/collections/Shipping.ts`) holds flat shipping rates. It defines a `shippingProvider` field of type `blocks`, containing only a single block: `CustomShipping`.
2. **CustomShipping Block**:
   Fields:
   - `baseRate`: Flat numeric fee.
   - `freeShippingMinOrder`: Minimum subtotal to trigger free shipping.
   - `estimatedDeliveryDays`: Free-text string (e.g. "3-5 business days").
   - `notes`: Instructions shown at checkout.
3. **Calculation Logic**:
   Shipping is evaluated inline in `calculateShippingCost` inside `apps/simple-shop/src/collections/Orders/endpoints/checkout.ts`. It loads the chosen `Shipping` document by ID, inspects `freeShippingMinOrder`, and returns either `0` or `baseRate`.
4. **Third-Party Integrations**:
   ShopNex has a dropshipping plugin (`packages/cj-plugin`), but it has zero carrier or courier calculation APIs (no EasyPost, Shippo, DHL, or FedEx).

#### Comparison with Omset Digital
- Omset Digital requires sub-district precision via Indonesian courier aggregators (RajaOngkir, Biteship) with weight in grams and origin/destination postal codes.
- ShopNex's flat-rate block cannot support dynamic courier calculations.
- However, ShopNex's pattern of linking a `Shipping` rate option to a `Locations` record (`relationTo: 'locations'`) is useful for multi-warehouse pickup.

### File Citations
- Shipping collection definition: `apps/simple-shop/src/collections/Shipping.ts:54-94`
- Custom shipping block: `apps/simple-shop/src/collections/Shipping.ts:9-48`
- Shipping cost calculation in checkout: `apps/simple-shop/src/collections/Orders/endpoints/checkout.ts:88-112`

### Verdict
ShopNex's shipping implementation is an elementary flat-rate calculator with no relevance to Indonesian logistics; keep Omset Digital's `ShippingProvider` adapter interface.

---

## 6. Storefront / Theming

### Findings
ShopNex uses two conflicting approaches to storefront theming across its sub-projects:

#### 1. Puck Visual Editor (`apps/simple-shop`)
- Uses `@puckeditor/core` integrated into Payload via a custom JSON field component (`apps/simple-shop/src/collections/Pages/components/PuckEditor.tsx`).
- The storefront page (`apps/simple-shop/src/app/(storefront)/[pages]/page.tsx` and `page.tsx`) queries the `Pages` collection by handle, extracts `page.page` (JSON AST), and passes it to `<Render config={config} data={page.page} />`.
- Configured blocks (`apps/simple-shop/src/collections/Pages/editor/blocks`) include `HeroSection`, `FeaturedProductsSection`, `ProductGrid`, `FeatureCard`, `HeadingBlock`, and `NewsletterSection`.
- Content and layout are coupled inside a single JSON blob. Switching themes is impossible without re-authoring the layout.

#### 2. Builder.io Integration (`packages/builder-io-plugin` and `apps/builder-shop`)
- ShopNex built a custom plugin that synchronizes pages and theme symbols to the proprietary SaaS Builder.io via `@builder.io/admin-sdk`.
- Functions in `packages/builder-io-plugin/src/utils/theme-management.ts` create remote models on Builder.io and push JSON schemas via REST APIs.

#### Comparison with Omset Digital Architecture
- **Incompatible with Rule**: In Omset Digital, *switching Themes never changes content*.
- Puck stores component layouts and styles directly within the document tree. If a Merchant switches from `@repo/theme-default` to `@repo/theme-minimal`, Puck's layout tree breaks or forces manual reconfiguration.
- Omset Digital's `StorefrontContent` document stores typed, semantic Section configurations (`hero`, `product-grid`, `about`, `testimonials`). The active Theme package supplies the React Server Components that render those standard sections.

### File Citations
- Puck renderer on storefront home: `apps/simple-shop/src/app/(storefront)/page.tsx:29-50`
- Dynamic pages route: `apps/simple-shop/src/app/(storefront)/[pages]/page.tsx:32-47`
- Puck editor integration in Payload admin: `apps/simple-shop/src/collections/Pages/components/PuckEditor.tsx:1-120`
- Section blocks configuration: `apps/simple-shop/src/collections/Pages/editor/blocks/HeroSection.tsx:1-60`
- Builder.io theme upload utility: `packages/builder-io-plugin/src/utils/theme-management.ts:130-220`

### Verdict
Reject ShopNex's visual page-builder approach (Puck / Builder.io) for merchant storefronts; adhere to Omset Digital's semantic `StorefrontContent` + swappable RSC Theme packages.

---

## 7. Access Control Patterns

### Findings
ShopNex organizes access control into a combination of shared helpers and collection-local predicates:

1. **Shared Role Predicates (`apps/simple-shop/src/access/roles.ts`)**:
   - `checkRole`: Helper checking role existence on `user.roles`:
     ```ts
     export const checkRole = (roles: User['roles'] = [], user?: null | User) =>
       !!user?.roles?.some((role) => roles?.includes(role))
     ```
   - `admins`: Standard boolean access predicate checking `checkRole(['admin'], user)`.
   - `anyone`: Permissive predicate returning `true`.
   - `adminsOrSelf`: Returns `true` for admins or a query constraint `{ id: { equals: user.id } }`.
   - `adminPluginAccess`: Custom SDK access extractor decrypting an `x-payload-sdk-token` header.
2. **Collection-Local Access Predicates**:
   - `readOrderAccess` (`apps/simple-shop/src/collections/Orders/access/order-access.ts`): Allows admins full access, but restricts public reads to queries matching the customer's active `sessionId`:
     ```ts
     export const readOrderAccess: Access<Order> = ({ req }) => {
       if (checkRole(['admin'], req.user)) return true
       const session = (req.query?.where as Where)?.sessionId || null
       if (!session) return false
       return { sessionId: session }
     }
     ```
   - `canAccessOwnCart` (`apps/simple-shop/src/collections/Carts/access/access-own-cart.ts`): Inspects cookies for `cart-session` and returns `{ id: { equals: cartId } }`.
3. **Field-Level Access**:
   Used inside `StripeBlock.ts` via `secretAccess`:
   ```ts
   EncryptedField({
     name: "stripeSecretKey",
     type: "text",
     access: { read: admins, update: admins },
     required: true,
   })
   ```

### File Citations
- Shared access control roles: `apps/simple-shop/src/access/roles.ts:1-35`
- Order read restriction: `apps/simple-shop/src/collections/Orders/access/order-access.ts:6-18`
- Cart session access: `apps/simple-shop/src/collections/Carts/access/access-own-cart.ts:4-21`

### Verdict
The `readOrderAccess` pattern using query constraints for guest checkout sessions and `secretAccess` on encrypted fields are clean patterns worth adopting; the rest is standard Payload RBAC.

---

## 8. Hooks Patterns

### Findings
ShopNex uses several targeted before/after change and delete hooks:

1. **Audit Timeline Generation (`addOrderTimelineEntry`)**:
   In `apps/simple-shop/src/collections/Orders/hooks/add-order-timeline-entry.ts`, a `beforeChange` hook compares `data.orderStatus` and `data.paymentStatus` against `originalDoc`. When changes occur, it appends a structured entry to `data.timeline` containing `eventType`, `createdBy` (user ID or system), `date`, `title`, and human-readable `details`.
2. **Orphan Media Cleanup (`deleteMedia`)**:
   In `apps/simple-shop/src/collections/Products/hooks/delete-media.ts`, an `afterDelete` hook iterates through deleted product variant galleries, deduplicates filenames using a `Map`, and calls `payload.delete({ collection: 'media', id })` to eliminate unreferenced image assets from storage.
3. **Field Encryption Hooks**:
   In `packages/utils/src/fields/encrypted-field.ts`, reusable field hooks `encryptKey` (`beforeChange`) and `decryptKey` (`afterRead`) leverage Payload's built-in AES primitives (`req.payload.encrypt` / `req.payload.decrypt`) transparently at runtime.

### File Citations
- Order status audit timeline hook: `apps/simple-shop/src/collections/Orders/hooks/add-order-timeline-entry.ts:1-75`
- Order timeline schema field: `apps/simple-shop/src/collections/Orders/fields/OrderTimeline.ts:1-68`
- Orphan media cleanup hook: `apps/simple-shop/src/collections/Products/hooks/delete-media.ts:1-52`
- Field encryption hooks: `packages/utils/src/fields/encrypted-field.ts:3-7`

### Verdict
The `OrderTimeline` audit logging hook and `deleteMedia` orphan cleanup hook are high quality and directly applicable to Omset Digital.

---

## 9. What's Worth Adopting

Specific, opinionated recommendations tied to Omset Digital's domain model:

1. **Order Audit Timeline Logging (`OrderTimeline.ts` & `add-order-timeline-entry.ts`)**:
   - *Why*: Omset Digital tracks separate Payment Status and Fulfilment Status state machines. Having an embedded `timeline` array field on the `Orders` collection automatically populated by a `beforeChange` hook gives Merchants and Platform Admins an immutable event log of all state transitions without needing an external auditing system.
   - *Adoption*: Adapt `addOrderTimelineEntry` to evaluate Omset's domain states (`pending → paid | expired | failed | cancelled` and `processing → shipped → delivered`).
   - *Citations*: `apps/simple-shop/src/collections/Orders/fields/OrderTimeline.ts:1-68`, `apps/simple-shop/src/collections/Orders/hooks/add-order-timeline-entry.ts:1-75`.

2. **Payload-Native AES Field Encryption (`EncryptedField`)**:
   - *Why*: In Omset Digital's BYOK model, Merchants store sensitive gateway credentials (Xendit Secret API Key, Midtrans Server Key) directly inside the `Tenant` document. ShopNex's `EncryptedField` pattern utilizes Payload's built-in AES encryption (`req.payload.encrypt()` / `decrypt()`) hooked into `beforeChange` and `afterRead`, avoiding third-party crypto dependencies.
   - *Adoption*: Wrap credential fields in the `Tenant.paymentProviders` block array with this pattern.
   - *Citations*: `packages/utils/src/fields/encrypted-field.ts:1-24`, `packages/utils/src/rsc/ApiToken.tsx:1-45`.

3. **Cartesian Product Variant Generator (`BuildVariantsButton.tsx`)**:
   - *Why*: Omset Digital defines Products with Variant Axes (e.g. Size, Color) that resolve to a Cartesian product of SKUs. ShopNex has a clean, zero-dependency client component that calculates the Cartesian product and dispatches row creation into the Payload admin form state.
   - *Adoption*: Adapt the generator to produce Omset Digital's normalized SKU documents or table rows.
   - *Citations*: `apps/simple-shop/src/collections/Products/fields/BuildVariantsButton.tsx:36-120`.

4. **Orphan Media Cleanup on Product Deletion (`deleteMedia.ts`)**:
   - *Why*: When products with digital assets or variant images are deleted, Payload does not automatically remove referenced upload files from S3/R2 storage. ShopNex's `afterDelete` hook deduplicates and purges associated media cleanly.
   - *Adoption*: Attach to Omset Digital's `Products` and `DigitalAssets` collections.
   - *Citations*: `apps/simple-shop/src/collections/Products/hooks/delete-media.ts:1-52`.

5. **`Locations` Collection for Merchant Shipping Origins**:
   - *Why*: For RajaOngkir rate calculations, each Merchant must define their physical warehouse/shop location with an Indonesian postal code and sub-district (*Kecamatan*) ID. ShopNex's `Locations` collection provides a clean blueprint for modeling merchant dispatch addresses and in-store pickup options.
   - *Adoption*: Add a tenant-scoped `Locations` collection or embed warehouse origin details on the `Tenant` schema.
   - *Citations*: `apps/simple-shop/src/collections/Locations.ts:1-62`.

---

## 10. What to Skip

Patterns in ShopNex that do not fit Omset Digital's architecture or are lower quality:

1. **Cookie-Based Multi-Tenancy (`getTenantFromCookie`)**:
   - *Why*: Reading tenant identity from browser cookies fails completely for external server-to-server calls like payment gateway webhooks. Omset Digital uses subdomain routing and path-isolated webhook endpoints (`/api/webhooks/[provider]/[tenantSlug]`).
   - *Citations*: `packages/utils/src/helpers/get-tenant-from-cookie.ts:1-15`, `packages/stripe-plugin/src/routes/webhooks.ts:17-25`.

2. **Visual Page Builders for Storefront Theming (Puck & Builder.io)**:
   - *Why*: Puck and Builder.io embed free-form layout JSON directly into page documents. This breaks Omset Digital's core architectural rule: *Switching Themes never changes content*. Omset Digital relies on structured semantic sections in `StorefrontContent` rendered by theme-specific React Server Components.
   - *Citations*: `apps/simple-shop/src/collections/Pages/editor/puck-config.tsx:1-150`, `packages/builder-io-plugin/src/utils/theme-management.ts:1-220`.

3. **Flat-Rate Shipping Calculator (`Shipping.ts`)**:
   - *Why*: ShopNex uses a simplistic flat rate plus free shipping threshold. Indonesian e-commerce requires dynamic, real-time courier calculations based on sub-district coordinates and weight in grams via RajaOngkir or Biteship.
   - *Citations*: `apps/simple-shop/src/collections/Shipping.ts:9-48`.

4. **Nested Array Variant Storage**:
   - *Why*: ShopNex stores variants as nested array rows inside the Product document. In high-SKU catalogs, nested arrays complicate inventory concurrency, database indexing, and individual SKU barcode lookups. Omset Digital's normalized SKU model is superior.
   - *Citations*: `apps/simple-shop/src/collections/Products/Products.ts:219-290`.

5. **Payload REST SDK (`@shopnex/payload-sdk`)**:
   - *Why*: ShopNex created a custom HTTP client package to query Payload via REST. In Next.js 16 App Router with React Server Components, server components should use the Local API (`getPayload({ config })`) directly for zero-HTTP-overhead database access.
   - *Citations*: `packages/payload-sdk/src/collections/find.ts:1-35`.
