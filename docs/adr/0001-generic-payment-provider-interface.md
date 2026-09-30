# Generic PaymentProvider interface for multi-gateway support

> **Status:** Superseded by [ADR-0005: BYOK Payment and Shipping Architecture](0005-byok-payment-and-shipping-architecture.md)

The payment integration layer is designed around a `PaymentProvider` interface rather than being coupled to Xendit directly. Each gateway (Xendit, Midtrans, Stripe, etc.) is implemented as an adapter registered in a static provider map. A Store has one active payment gateway at a time, configured via a polymorphic `paymentProviders` blocks field with `maxRows: 1`. Each provider's credentials live in an isolated block definition (e.g. `XenditBlock`) with encrypted secrets (`secretKey`, `webhookToken`) restricted to store owners and super-admins. The webhook route is `/api/webhooks/[provider]/[storeSlug]` so each adapter's verification logic runs in isolation.
