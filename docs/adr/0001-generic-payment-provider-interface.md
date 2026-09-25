# Generic PaymentProvider interface for multi-gateway support

The payment integration layer is designed around a `PaymentProvider` interface rather than being coupled to Xendit directly. Each gateway (Xendit, Midtrans, Stripe, etc.) is implemented as an adapter registered in a static provider map. A Store has one active provider at a time, selected via a `paymentProvider` select field inside a `paymentConfig` group on the Store document. Each provider's credentials live in a named sub-group (`xenditConfig`, etc.) that is conditionally shown in the Payload admin UI via `admin.condition` keyed to the `paymentProvider` value. The webhook route is `/api/webhooks/[provider]/[storeSlug]` so each adapter's verification logic runs in isolation.

The interface exposes two methods: `createSession(order)` and `parseWebhook(request)`. Status mapping from provider-specific values to the platform's canonical Payment Status (`pending | paid | expired | failed | cancelled`) is a private implementation detail of each adapter — it is not part of the public interface. `parseWebhook` handles signature verification internally and returns a `ParsedWebhookEvent` (platform Order ID, canonical status, provider event ID, optional metadata); it throws on verification failure.

The same pattern applies to shipping: a `shippingProvider` select inside a `shippingConfig` group, with per-provider credential sub-groups conditionally shown. RajaOngkir is the only v1 provider; its `originSubdistrictId` field is further conditioned on `accountType === 'pro'`.

## Considered Options

**Flat provider-specific field groups on Store** (`xenditConfig`, `midtransConfig`, …): rejected because it requires schema changes for every new provider and pollutes the Store document with fields for providers the merchant isn't using.

**Generic JSON credential bag**: rejected because field-level access control (hiding secret keys from non-owners) requires named fields, not a JSON blob.

**Payload `blocks`**: one block type per provider, each with its own typed and access-restricted fields. Rejected because the blocks UX is designed for repeatable content, not mutually exclusive configuration — Merchants found it confusing to "add a block" to configure their payment provider.

**Conditional groups with a provider select (chosen)**: a single `paymentProvider` select drives `admin.condition` on each provider's credential sub-group. Only the active provider's fields are visible in the UI. Access restriction (owner + Platform Admin only) still applies at the field level on sensitive credentials. Adding a new provider adds a new sub-group and a new select option — no structural changes to existing sub-groups.

## Consequences

Refund support is explicitly out of scope for v1. The interface can accommodate a `refund(orderId)` method in a future version without breaking existing adapters.
