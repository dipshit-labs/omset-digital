# Generic PaymentProvider interface for multi-gateway support

The payment integration layer is designed around a `PaymentProvider` interface rather than being coupled to Xendit directly. Each gateway (Xendit, Midtrans, Stripe, etc.) is implemented as an adapter registered in a static provider map. A Tenant has one active provider at a time, selected via a Payload `blocks` field where each block type represents one provider and carries that provider's specific credentials as named, access-restricted fields. The webhook route is `/api/webhooks/[provider]/[tenantSlug]` so each adapter's verification logic runs in isolation.

The interface exposes two methods: `createSession(order)` and `parseWebhook(request)`. Status mapping from provider-specific values to the platform's canonical Payment Status (`pending | paid | expired | failed | cancelled`) is a private implementation detail of each adapter — it is not part of the public interface. `parseWebhook` handles signature verification internally and returns a `ParsedWebhookEvent` (platform Order ID, canonical status, provider event ID, optional metadata); it throws on verification failure.

## Considered Options

**Flat provider-specific field groups on Tenant** (`xenditConfig`, `midtransConfig`, …): rejected because it requires schema changes for every new provider and pollutes the Tenant document with fields for providers the merchant isn't using.

**Generic JSON credential bag**: rejected because field-level access control (hiding secret keys from non-owners) requires named fields, not a JSON blob.

**Payload `blocks` (chosen)**: one block type per provider, each with its own typed and access-restricted fields. Adding a new provider adds a new block type — no schema changes to existing blocks, and access control is per-field within each block.

## Consequences

Refund support is explicitly out of scope for v1. The interface can accommodate a `refund(orderId)` method in a future version without breaking existing adapters.
