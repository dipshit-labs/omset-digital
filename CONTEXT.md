# Omset Digital

A multi-tenant SaaS platform where Indonesian SMEs (Merchants) operate branded storefronts, accept payments via BYOK integrations, and sell physical and digital products to Buyers.

## Language

### Platform roles

**Merchant**:
A business owner who subscribes to Omset Digital and holds the owner role for their Store. Owns all configuration, products, orders, and BYOK credentials.
_Avoid_: Seller, user, admin, vendor, shop owner

**Manager**:
A staff member assigned to a Store with operational access to catalog items and packages, but restricted from modifying store settings, managing users, or viewing sensitive BYOK credentials.
_Avoid_: Staff, employee, operator, assistant

**Buyer**:
A person who visits a Merchant's storefront and places orders.
_Avoid_: Customer, user, visitor, shopper

**Platform Admin**:
An Omset Digital team member with super-admin access across all Stores.
_Avoid_: Super-user, root, operator

### Store

**Store**:
The platform entity representing one Merchant's business. Holds the store's identity, subscription status, BYOK credentials (payments, shipping, WhatsApp), and links to installed Themes.
_Avoid_: Tenant, shop, account, workspace

**Slug**:
The URL-safe identifier for a Store used as its subdomain (`{slug}.omsetdigital.com`). Unique across the platform.
_Avoid_: Handle, name, identifier

**Custom Domain**:
A Buyer-facing domain owned by the Merchant (e.g. `myshop.com`) that resolves to their storefront instead of the subdomain.
_Avoid_: External domain, CNAME domain

**Subscription**:
The Store's billing state with the platform. One of: `trial`, `active`, `past_due`, `canceled`.
_Avoid_: Plan, billing status, account status

**BYOK (Bring Your Own Key)**:
The model where Merchants register directly with third-party providers (payment gateways, shipping APIs) and supply their own API credentials to the platform. Funds and data flow directly between the Merchant's provider account and Buyers — Omset Digital is never the intermediary.
_Avoid_: API key integration, self-service integration

**Store Credentials**:
The isolated platform entity holding encrypted sensitive BYOK secrets (API keys, server keys, webhook verification tokens) for a Store. Accessible only to Store owners and Platform Admins.
_Avoid_: Store secrets, API keys, credentials bag

**Origin Address**:
The physical fulfillment location of a Store (province, city, subdistrict, and street address) used as the origin point for shipping rate calculations.
_Avoid_: Store address, warehouse, sender address

### Storefront

**Storefront**:
The Buyer-facing website for a Store, served at the Store's subdomain or Custom Domain. Composed of themed Sections.
_Avoid_: Shop page, front-end, website

**Theme**:
An installed theme instance in the `themes` collection (provided by the Theme Plugin). Holds global theme settings (colors, typography presets) and joins to its child Templates. Exactly one Theme is live per Store.
_Avoid_: Skin, style pack, layout

**Template**:
A layout document in the `templates` collection (provided by the Theme Plugin) belonging to a Theme. Defines the ordered Section blocks for a specific route type (`home`, `product`, `collection`, `page`).
_Avoid_: Layout preset, view definition

**Page**:
A document in the `pages` collection representing Merchant-created content (e.g. About, Contact), referencing a layout Template.
_Avoid_: View, screen, document

**Section**:
A configurable content block within a Template (e.g. hero, product-grid, testimonials). Composed of section-level settings and optional child Blocks.
_Avoid_: Widget, row, container

**Block**:
An inner child element within a Section (e.g. feature bullet, testimonial card, accordion item).
_Avoid_: Sub-block, component, item

**Theme Package**:
An independent TypeScript package (`@repo/theme-*`) exporting React components, section definitions, declarative settings schemas with CSS variable bindings, and template presets using the DSL from `@repo/theme-core`. Maps theme settings directly to the Theme Styling Contract without custom mapping functions. Depends exclusively on `@repo/theme-core`.
_Avoid_: Template package, theme bundle, addon

**Theme Engine**:
The standalone library (`@repo/theme-core`) providing the theme DSL contracts, template and section registries, CSS custom property generators, unstyled layout and e-commerce primitives, and section renderers, with zero Payload dependencies.
_Avoid_: Theme loader, theme plugin, UI kit

**Theme Styling Contract**:
The canonical design tokens and CSS custom properties prefixed with `--theme-*` defined and owned by `@repo/theme-core`. Organized into Merchant Controlled Tokens (backgrounds, surfaces, muted layers, text, borders, brand, shape, typography) and Fixed Tokens (status feedback and calculated radii). Theme packages map their settings to these variables rather than declaring arbitrary custom property names. Isolated from the platform branding styles in `@repo/ui`.
_Avoid_: Theme variables, custom styling schema, UI tokens

**Theme Primitive**:
An unstyled, accessible UI or domain building block exported from `@repo/theme-core/primitives`. Governs structural positioning, viewport clamping, motion, and interaction states while leaving all visual styling to theme authors.
_Avoid_: UI component, widget, element

**Theme Plugin**:
The Payload CMS plugin (`@repo/payload-plugin-themes`) that bridges the Theme Engine to Payload, registering the `themes` and `templates` collections, converting theme setting schemas into Payload fields, and wiring admin live preview.
_Avoid_: Theme loader, template engine
### Products

**Product**:
A sellable item listed on the Storefront. Has one or more Variants.
_Avoid_: Item, listing, goods

**Variant**:
A specific purchasable variation of a Product, representing the leaf node of the variant tree. Carries its own price, stock, weight, and barcode. Linked to a Product and its selected Variant Options. Every Product has at least one Variant (Shopify model).
_Avoid_: Item, sub-product

**Variant Type**:
A named dimension of Product variation (e.g. Color, Size), scoped to a Store and reusable across Products.
_Avoid_: Attribute, option group, dimension, variant axis

**Variant Option**:
A discrete choice on a Variant Type (e.g. Red, Blue, Small, Large). Linked to a Variant Type.
_Avoid_: Value, choice, attribute value

**Category**:
A taxonomy classification used to organize and group Products within a Store.
_Avoid_: Tag, collection, department, genre

**Digital Asset**:
A downloadable file associated with a non-physical Product, delivered to Buyers as a signed time-limited download URL after payment is confirmed.
_Avoid_: Download, file, attachment

### Orders and payments

**Order**:
A record of a Buyer's purchase intent, created when checkout begins. Progresses through the Payment Status state machine.
_Avoid_: Cart, transaction, purchase

**Payment Status**:
The canonical state of an Order's payment lifecycle: `pending → paid | expired | failed | cancelled`. All non-pending states are terminal.
_Avoid_: Order status (use Fulfilment Status for post-payment tracking), payment state

**Fulfilment Status**:
The post-payment operational state of an Order: `processing → shipped → delivered`. Only meaningful when Payment Status is `paid`.
_Avoid_: Order status (overloaded — always qualify with Payment or Fulfilment), shipping status

**PaymentProvider**:
An adapter that implements the platform's `PaymentProvider` interface for a specific payment gateway. Responsible for creating a payment session and parsing incoming webhook events into canonical `ParsedWebhookEvent` objects.
_Avoid_: Payment gateway, payment integration, payment plugin

**Payment Session**:
The result of `PaymentProvider.createSession()`: a provider-assigned order ID and a URL to redirect the Buyer to for payment.
_Avoid_: Invoice, payment link, checkout session (overloaded with platform checkout)

**ParsedWebhookEvent**:
The normalised output of `PaymentProvider.parseWebhook()`: platform Order ID, canonical Payment Status, provider event ID (for idempotency), and optional metadata. Signature verification is performed inside `parseWebhook` before this is returned.
_Avoid_: Webhook payload, callback event

### Shipping

**ShippingProvider**:
An adapter that implements the platform's `ShippingProvider` interface for a specific shipping cost API (RajaOngkir in v1). Returns `CourierOption` lists given an origin, destination, and weight.
_Avoid_: Shipping integration, ongkir API

**Courier Option**:
A specific shipping service offered by a courier (name, service level, cost in IDR, estimated days). Returned by `ShippingProvider.getCosts()`.
_Avoid_: Shipping rate, delivery option

**Package**:
A physical container or shipping box with defined dimensions and tare weight, scoped to a Store and used to calculate total shipment weight and volumetric costs.
_Avoid_: Box, parcel, container, carton

**Administrative Area**:
A pre-seeded geographic division in Indonesia (province, city or regency, or subdistrict) mapping to domestic logistics identifiers.
_Avoid_: Region, location, postal area
