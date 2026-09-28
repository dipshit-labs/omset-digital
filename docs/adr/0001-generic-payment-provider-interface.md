# Generic PaymentProvider interface for multi-gateway support

The payment integration layer is designed around a `PaymentProvider` interface rather than being coupled to Xendit directly. Each gateway (Xendit, Midtrans, Stripe, etc.) is implemented as an adapter registered in a static provider map. A Store has one active payment gateway at a time, configured via a polymorphic `paymentProviders` blocks field with `maxRows: 1`. Each provider's credentials live in an isolated block definition (e.g. `XenditBlock`) with encrypted secrets (`secretKey`, `webhookToken`) restricted to store owners and super-admins. The webhook route is `/api/webhooks/[provider]/[storeSlug]` so each adapter's verification logic runs in isolation.

The interface exposes two methods: `createSession(order)` and `parseWebhook(request)`. Status mapping from provider-specific values to the platform's canonical Payment Status (`pending | paid | expired | failed | cancelled`) is a private implementation detail of each adapter — it is not part of the public interface. `parseWebhook` handles signature verification internally and returns a `ParsedWebhookEvent` (platform Order ID, canonical status, provider event ID, optional metadata); it throws on verification failure.

The same pattern applies to shipping: a `shippingProvider` select inside a `shippingConfig` group, with per-provider credential sub-groups conditionally shown. RajaOngkir is the only v1 provider; its `originSubdistrictId` field is further conditioned on `accountType === 'pro'`.

## Considered Options

**Flat provider-specific field groups on Store** (`xenditConfig`, `midtransConfig`, …): rejected because it requires schema changes for every new provider and pollutes the Store document with fields for providers the merchant isn't using.

**Generic JSON credential bag**: rejected because field-level access control (hiding secret keys from non-owners) requires named fields, not a JSON blob.

**Conditional groups with a provider select**: rejected for payment gateways because adding new gateways requires mutating the core Store schema with new credential groups. While used for shipping (`shippingConfig`), payment providers benefit from polymorphic blocks to isolate gateway schemas into dedicated block modules.

**Polymorphic `blocks` with `maxRows: 1` (chosen)**: one block type per payment provider (`XenditBlock`, etc.), with typed and encrypted fields. Restricting `maxRows: 1` ensures mutually exclusive gateway configuration while keeping gateway schemas completely modular and decoupled from the main Store document. Adding a new gateway requires creating a new block definition and registering it in the `paymentProviders.blocks` array.

## Consequences

Refund support is explicitly out of scope for v1. The interface can accommodate a `refund(orderId)` method in a future version without breaking existing adapters.
