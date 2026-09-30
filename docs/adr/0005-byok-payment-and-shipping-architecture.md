# BYOK payment and shipping architecture with dedicated credentials and pure adapters

> **Status:** Accepted (supersedes [ADR-0001](0001-generic-payment-provider-interface.md))

Omset Digital implements Bring Your Own Key (BYOK) integrations for Indonesian payment gateways (Midtrans, Xendit) and shipping aggregators (RajaOngkir). Merchants enter their own provider API keys and webhook tokens, keeping transactions and funds directly between Merchants and Buyers.

This ADR supersedes ADR-0001 by extracting payment and shipping into a two-tier package architecture, isolating sensitive credentials into a dedicated collection, replacing native Payload stream encryption with authenticated AES-256-GCM, and establishing a pre-seeded geographic reference table for low-latency address selection.

## Context and problem statement

ADR-0001 introduced polymorphic blocks (`Store.paymentProviders`) and conditional groups (`Store.shippingConfig`) on the `Stores` collection, relying on `req.payload.encrypt` for secrets. Technical evaluation against primary sources revealed four critical defects in that design:

1. **Credential erasure during Store profile updates.** When fields use `read: () => false` for access control, the Payload Admin UI omits them during form submissions. Because block fields replace array rows during updates, saving basic store metadata (such as store name or branding) overwrites the existing encrypted credentials with null unless complex hook workarounds inspect `originalDoc`.
2. **Cryptographic vulnerability in Payload native encryption.** Payload 3.90.2 implements `payload.encrypt` via `aes-256-ctr` without an authentication tag (MAC). CTR is malleable; bit flips in the database alter decrypted secrets without raising errors. Additionally, Payload slices a hexadecimal SHA-256 string, reducing key entropy to 128 bits instead of 256 bits.
3. **Heavy SDK dependencies and serverless latency.** Official vendor SDKs (`midtrans-client`, `xendit-node`) introduce multi-megabyte bundle bloat (OpenAPI code generators, `axios`, `lodash`), lack clean TypeScript definitions, fail in edge runtimes, and force per-request class instantiations in multi-tenant contexts. RajaOngkir has no official TypeScript SDK.
4. **Checkout address latency and ID requirements.** RajaOngkir queries average 1.2 to 3.5 seconds because it proxies upstream courier portals. Furthermore, RajaOngkir Pro requires internal numeric IDs (`city_id`, `subdistrict_id`) and strictly rejects postal codes for shipping calculations. Querying RajaOngkir while a buyer types an address creates unacceptable checkout friction.

## Decisions

### 1. Two-tier package architecture

Payment and shipping logic split across two packages:

- `@repo/commerce-adapters`: A pure TypeScript library containing typed `fetch` clients for Midtrans, Xendit, and RajaOngkir, volumetric weight calculation (`calculateBillableWeight`), webhook signature verification, and AES-256-GCM encryption utilities. Zero Payload CMS dependencies. Compatible with Node.js, Bun, and Edge runtimes.
- `@repo/payload-plugin-commerce`: A Payload CMS plugin exporting the `storeCredentials`, `packages`, and `administrativeAreas` collections, the custom `CredentialsManager` admin UI component, and order payment status transition hooks. Imported into `apps/app/src/payload.config.ts`.

### 2. Dedicated `storeCredentials` collection with namespaced groups

Sensitive credentials move out of the `Stores` collection into a dedicated `storeCredentials` collection:

- Linked 1:1 to `Stores` via a unique relation field.
- Hidden from the Payload admin sidebar (`admin: { hidden: true }`).
- Stores credentials in namespaced groups (`midtrans`, `xendit`, `rajaongkir`) alongside active selection flags (`paymentProvider`, `shippingProvider`).
- Switching the active provider retains existing configured keys instead of deleting them.
- Public provider flags (`activePaymentProvider`, `activeShippingProvider`) live on the `Stores` collection so storefront React Server Components can determine available payment and shipping methods without loading sensitive credentials.
- The `Stores` admin view renders an "Integrations" tab with a custom radio card UI (`CredentialsManager`). The UI features masked inputs, active provider selection, and an on-demand "Test Connection" button calling provider APIs (`GET /balance`, `GET /v2/{order}/status`, `GET /province`).

### 3. Authenticated AES-256-GCM encryption

All sensitive keys (`serverKey`, `secretKey`, `webhookToken`, `apiKey`) use custom AES-256-GCM encryption:

- Algorithm: `aes-256-gcm` with 96-bit (12-byte) random initialization vectors and 128-bit (16-byte) authentication tags.
- Key derivation: HKDF-SHA256 extracting a full 256-bit binary key from `PAYLOAD_SECRET`.
- Serialization format: `v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>`.
- Hook guards: `beforeChange` checks for the `v1:` prefix to prevent double-encryption loops and preserves `originalDoc` values when incoming values are empty or omitted. Decryption occurs only at point-of-use in server actions or webhook verifiers.

### 4. Path-based multi-tenant webhook routing

Inbound webhooks terminate at `/api/webhooks/[provider]/[storeSlug]`:

- Next.js 15 route handlers consume the raw request body once using `await req.text()`.
- The handler queries `storeCredentials` for the specified `storeSlug` using Payload Local API with `overrideAccess: true`.
- Signature verification runs before order lookup:
  - Midtrans: SHA-512 over `order_id + status_code + gross_amount + serverKey`. Raw `gross_amount` string formatting is preserved without number coercion.
  - Xendit: Constant-time comparison of `x-callback-token` or HMAC-SHA256 over raw body.
  - Checked using `crypto.timingSafeEqual` with buffer length validation.
- Validated webhooks dispatch to `Orders`, updating `paymentStatus` through the canonical state machine (`pending -> paid | expired | failed | cancelled`).

### 5. Pre-seeded flattened `administrative_areas` reference data

Indonesian administrative divisions are pre-seeded into a single flattened table:

- Table schema: `subdistrict_id`, `subdistrict_name`, `city_id`, `city_name`, `city_type` (Kota / Kabupaten), `province_id`, `province_name`, `postal_code`.
- Total rows: approximately 7,200.
- Hybrid query architecture: Defined as a hidden collection in `@repo/payload-plugin-commerce` for migrations and typing. Storefront autocomplete queries execute raw SQL via Drizzle (`SELECT DISTINCT city_id... WHERE province_id = $1`) for sub-millisecond response times.
- Merchant store fulfillment location is configured on `Stores.originAddress` as standard business profile data, storing resolved numeric IDs alongside human-readable text.

### 6. Volumetric weight and packaging

Volumetric weight calculation is centralized in `@repo/commerce-adapters`:

$$\text{Billable Weight} = \max\left(\sum \text{Item Weights} + \text{Tare Weight},\; \frac{L \times W \times H}{6000}\right)$$

Clamped to a minimum of 1 gram. The `packages` collection resides in `@repo/payload-plugin-commerce` and links to Store.

## Considered options

- **Polymorphic blocks on `Stores` (ADR-0001)**: Rejected due to partial-update credential erasure bugs and coupling store profile edits with cryptographic secrets.
- **`@payloadcms/plugin-nested-docs` for administrative areas**: Rejected because Indonesian administrative divisions have a fixed 3-tier hierarchy with tier-specific metadata (`city_type`). Generating breadcrumbs for 7,200 records creates substantial hook overhead during data seeding, while a flattened table runs join-free SQL queries.
- **Global webhook route with order ID prefixes**: Rejected because provider test notifications (such as clicking "Test Webhook" in Midtrans MAP) send dummy order IDs that cannot resolve the tenant store.
- **Official npm SDKs (`midtrans-client`, `xendit-node`)**: Rejected due to multi-megabyte bundle sizes, lack of TypeScript precision, CommonJS runtime constraints, and clumsy multi-tenant instance lifecycles. Direct typed `fetch` wrappers have zero external dependencies and exact type boundaries.

## Consequences

1. Monorepo packages expand to include `@repo/commerce-adapters` and `@repo/payload-plugin-commerce`.
2. Existing `Stores` schema fields for `paymentProviders` and `shippingConfig` are migrated to `storeCredentials` and `originAddress`.
3. Database migrations seed `administrative_areas` from RajaOngkir data dumps.
4. Storefront checkout address forms query the local database through Next.js server actions, making address selection instant and resilient to RajaOngkir downtime.
