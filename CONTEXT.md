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
The Buyer-facing website for a Tenant, served at the Tenant's subdomain or Custom Domain. Composed of themed Sections.
_Avoid_: Shop page, front-end, website

**Theme**:
A package of React components that renders the Storefront's pages. One Theme is active per Tenant at a time. Switching Themes never changes content.
_Avoid_: Template, skin, design

**Section**:
A configurable content block within the Storefront home page (e.g. hero, product-grid, about, testimonials). Ordered, togglable, and content-preserving across Theme switches.
_Avoid_: Block, widget, component

**StorefrontContent**:
The single Payload document per Tenant that holds all Section configurations and their content data.
_Avoid_: Page config, storefront settings

### Products

**Product**:
A sellable item listed on the Storefront. Has one or more SKUs.
_Avoid_: Item, listing, goods

**SKU**:
A specific purchasable variant of a Product — the leaf node of the variant tree. Carries its own price (optional override), stock, and weight.
_Avoid_: Variant, option, item

**Variant Axis**:
A named dimension of Product variation (e.g. Color, Size). A Product's SKUs are the Cartesian product of its Variant Axes.
_Avoid_: Attribute, option group, dimension

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
