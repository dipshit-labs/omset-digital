# Normalized Collections with Payload Join Fields for Product Variants

Product variants are modeled across four dedicated collections scoped to Tenant rather than an embedded array in the product document: `products`, `variantTypes`, `variantOptions`, and `variants`. The `variants`, `variantTypes`, and `variantOptions` collections are hidden from the admin sidebar navigation via `admin.group: false`. The `products` collection displays linked variants directly within the product edit form using a Payload 3.x `join` field (`on: 'product'`).

This model provides row-level inventory locking in PostgreSQL during checkout so concurrent purchases of different variants never lock the parent product row. Order and Cart line items reference both `product` and `variant` as relational foreign keys with price and weight snapshots. In the admin UI, merchants create variants via the join table drawer (with automated generation deferred to a future iteration). On the storefront, variant selection is driven by URL search parameters (`?size=<id>&color=<id>&variant=<id>`) to keep theme components stateless, shareable, and compatible with React Server Components.

## Considered Options

**Embedded SKU array inside the `products` collection**: rejected because every stock deduction locks the entire product document in Postgres, creating contention during concurrent checkouts. Furthermore, it prevents direct foreign key relationships from order line items and requires custom array query parsing for inventory checks and sales reporting.

**Third-party `@payloadcms/plugin-ecommerce` package**: rejected because it enforces a single-tenant schema with global option pools and single-tenant boot-time payment configuration, conflicting with Omset Digital's multi-tenant Bring-Your-Own-Key model.

**Manual variant creation without Cartesian builder**: rejected because manually creating every SKU combination for multi-axis products (such as 4 sizes across 3 colors) requires 12 separate modal submissions, creating unacceptable friction for merchants.

## Consequences

1. Every variant collection (`variantTypes`, `variantOptions`, `variants`) must include a `tenant` relationship and enforce tenant scoping via `enforceTenantOnCreate` and read/write access control.
2. The product gallery array includes an optional relationship to `variantOptions`, allowing storefront themes to reactively focus the carousel on the selected color or style.
3. Every Variant row must hold a `weight` field in grams alongside `price` and `stock` to support dynamic shipping cost calculation via RajaOngkir.
