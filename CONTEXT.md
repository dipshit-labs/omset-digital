# Omset Digital

A multi-tenant SaaS platform where Indonesian SMEs (Merchants) operate branded storefronts, accept payments via BYOK integrations, and sell physical and digital products to Buyers.

## Language

### Platform roles

**Merchant**:
A business owner who subscribes to Omset Digital to operate a storefront. Owns all configuration, products, and orders within their Tenant.
_Avoid_: Seller, user, admin, vendor

**Buyer**:
A person who visits a Merchant's storefront and places orders.
_Avoid_: Customer, user, visitor, shopper

**Platform Admin**:
An Omset Digital team member with super-admin access across all Tenants.
_Avoid_: Super-user, root, operator

### Tenant

**Tenant**:
The platform record representing one Merchant's store. Holds the store's identity, subscription status, BYOK credentials, and configuration. One Tenant per Merchant.
_Avoid_: Store, shop, account, workspace

**Slug**:
The URL-safe identifier for a Tenant used as its subdomain (`{slug}.omsetdigital.com`). Unique across the platform.
_Avoid_: Handle, name, identifier

**Custom Domain**:
A Buyer-facing domain owned by the Merchant (e.g. `myshop.com`) that resolves to their storefront instead of the subdomain.
_Avoid_: External domain, CNAME domain

**Subscription**:
The Tenant's billing state with the platform. One of: `trial`, `active`, `past_due`, `canceled`.
_Avoid_: Plan, billing status, account status

**BYOK (Bring Your Own Key)**:
The model where Merchants register directly with third-party providers (payment gateways, shipping APIs) and supply their own API credentials to the platform. Funds and data flow directly between the Merchant's provider account and Buyers — Omset Digital is never the intermediary.
_Avoid_: API key integration, self-service integration

### Storefront

**Storefront**:
The Buyer-facing website for a Tenant, served at the Tenant's subdomain or Custom Domain. Composed of templated Sections.
_Avoid_: Shop page, front-end, website

**Template**:
A package of React components and design tokens that renders the Storefront's pages. Declares the default Section ordering, which Section types it supports, and optional per-template layout settings. One Template is active per Tenant at a time. Switching Templates preserves base token overrides; per-template settings reset to the incoming Template's defaults.
_Avoid_: Theme, skin, design

**Section**:
A configurable content block within the Storefront (e.g. hero, product-grid, about, testimonials). Ordered, togglable, and content-preserving across Template switches.
_Avoid_: Block, widget, component

**StorefrontContent**:
The single Payload document per Tenant that holds all Section configurations and their content data.
_Avoid_: Page config, storefront settings

**TemplateToken**:
A named design variable (color, typography scale, border radius, container width) drawn from the platform's closed base vocabulary. Every Template exposes default values; Merchants override individual tokens to apply their branding. Token overrides persist when the active Template changes.
_Avoid_: CSS variable, design token, theme variable

**TemplateConfig**:
A namespaced map on the Tenant document holding per-Template layout and behavior settings (e.g. `heroLayout`, `showTicker`, `columns`). Keyed by Template slug; only the active Template's namespace is read at render time. Settings reset to the incoming Template's defaults on a Template switch; the dormant namespace is preserved but ignored.
_Avoid_: Theme settings, template options, settings object

**TemplateManifest**:
The machine-readable descriptor exported by a Template package. Declares the Template's slug, supported Section types, default Section ordering, default TemplateTokens, token schema, and optional settings schema. Read by `payload-plugin-template-registry` at boot time to generate the Payload admin UI.
_Avoid_: Theme manifest, config file, template descriptor

**Universal Block**:
A platform-defined Payload block type (RichText, Table, Media) available on any product page regardless of the active Template. React components for Universal Blocks live in `@repo/ui`; their Payload field definitions are registered by `payload-plugin-template-registry`.
_Avoid_: Shared block, common block, base block

### Products

**Product**:
A sellable item listed on the Storefront. Has one or more Variants.
_Avoid_: Item, listing, goods

**Variant**:
A specific purchasable variation of a Product, representing the leaf node of the variant tree. Carries its own price, stock, weight, and barcode. Linked to a Product and its selected Variant Options. Every Product has at least one Variant (Shopify model).
_Avoid_: Item, sub-product

**Variant Type**:
A named dimension of Product variation (e.g. Color, Size), scoped to a Tenant and reusable across Products.
_Avoid_: Attribute, option group, dimension, variant axis

**Variant Option**:
A discrete choice on a Variant Type (e.g. Red, Blue, Small, Large). Linked to a Variant Type.
_Avoid_: Value, choice, attribute value
**Digital Asset**:
A file attached to a Product of type `digital`, delivered to Buyers as a signed time-limited download URL after payment is confirmed.
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
