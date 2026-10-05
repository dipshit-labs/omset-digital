# Unified payment provider interface and shared webhook pipeline

> **Status:** Accepted (evolves [ADR-0005](0005-byok-payment-and-shipping-architecture.md))

Omset Digital consolidates payment gateway integrations behind a deep `PaymentProvider` interface in `@repo/commerce-adapters`, replaces duplicated route handlers with a centralized `processIncomingWebhook` pipeline in `@repo/payload-plugin-commerce`, and replaces dedicated provider groups on `Orders` with a polymorphic `paymentMetadata` JSON field.

## Context and problem statement

ADR-0005 established dedicated collections for store credentials and hand-rolled typed fetch clients for Midtrans and Xendit. While this secured credentials and eliminated vendor SDK bloat, the implementation introduced architectural friction:

1. **Duplicated webhook pipeline:** The Next.js route handlers (`/api/webhooks/midtrans/[storeSlug]` and `/api/webhooks/xendit/[storeSlug]`) duplicated five identical steps: raw body ingestion, store lookup, credential decryption, order lookup, and order state updates. Adding a third provider would require copying ~120 lines of boilerplate.
2. **Provider detail leakage across the seam:** The `orders` collection defined dedicated provider groups (`orders.midtrans`, `orders.xendit`). Every new payment gateway required modifying the core Orders schema and running database migrations.
3. **Shallow adapter interfaces:** `MidtransClient` and `XenditClient` exposed provider-native types (`MidtransTransactionStatusResponse`, `XenditInvoiceResponse`) with dozens of vendor-specific snake_case fields directly to callers, rather than normalizing them into platform domain models.
4. **Fragile validation:** Inbound webhooks and outbound fetch responses used manual JSON parsing and unchecked type assertions (`as RajaOngkirCostResponse`), bypassing runtime type safety.
5. **Timing oracle:** `timingSafeEqualString` included an early length-check branch that exposed a timing side channel for arbitrary-length callback tokens.

## Decisions

### 1. Deep `PaymentProvider` interface in `@repo/commerce-adapters`

All payment gateways implement a uniform 3-method interface:

```typescript
export interface PaymentProvider {
  readonly id: string; // 'midtrans' | 'xendit'
  createSession(input: CreatePaymentSessionInput): Promise<PaymentSession>;
  parseWebhook(input: ParseWebhookInput): Promise<ParsedWebhookEvent>;
  getTransactionStatus(orderId: string): Promise<ParsedPaymentStatus>;
}
```

- Provider-specific payload shapes, snake_case vendor types, and signature verification logic remain **implementation-private** inside `@repo/commerce-adapters`.
- `parseWebhook` accepts raw request text, headers, and decrypted merchant credentials. It performs signature/token verification and returns a canonical `ParsedWebhookEvent` containing `orderId`, `paymentStatus`, `providerEventId`, and `metadata`.
- Callers never import or interact with vendor-specific types.

### 2. Centralized webhook orchestrator in `@repo/payload-plugin-commerce`

A shared function `processIncomingWebhook` handles the entire server-side ingestion lifecycle:

```typescript
export async function processIncomingWebhook(args: {
  provider: "midtrans" | "xendit";
  storeSlug: string;
  req: NextRequest;
  payload: Payload;
}): Promise<NextResponse>;
```

The orchestrator:

1. Resolves the Store and verifies the provider is active.
2. Retrieves and decrypts the Store Credentials.
3. Dispatches to `PaymentProvider.parseWebhook()`. Returns semantic HTTP status codes on failure (401 for bad signature, 400 for malformed payload).
4. Looks up the Order scoped to the Store.
5. Evaluates idempotency: if the Order is already in a terminal Payment Status (`paid`, `expired`, `failed`, `cancelled`), logs the event and returns `200 OK` without mutation.
6. Updates the Order's `paymentStatus` and appends `providerEventId` and transaction details to `paymentMetadata`.

Next.js App Router route files (`/api/webhooks/[provider]/[storeSlug]/route.ts`) become thin 5-line dispatchers.

### 3. Polymorphic `paymentMetadata` on `Orders`

The dedicated `orders.midtrans` and `orders.xendit` fields are replaced by a single `paymentMetadata: json` field on the `orders` collection:

- Stores gateway-specific transaction IDs, timestamps, payment channels, and settlement records polymorphically.
- Adding future payment providers (e.g. Duitku, DOKU) requires zero schema migrations on `orders`.

### 4. Implementation-private Zod v4 validation

Runtime validation standardizes on **Zod v4** (using `@zod/mini` in `@repo/commerce-adapters` to minimize bundle weight):

- Webhook schemas and API response schemas are private to each provider adapter.
- Coerces vendor string decimals (e.g. Midtrans `"150000.00"`) into numbers cleanly during parse.
- Unchecked `as` type assertions on API responses are eliminated.

### 5. Battle-tested constant-time string comparison

`timingSafeEqualString` is replaced with the `tsscmp` package across all HMAC and token verification paths, eliminating length oracles via the Double-HMAC pattern.

## Considered options

- **Valibot for commerce adapters:** Evaluated in research. While offering a ~1.5 kB bundle, introducing a second validation library alongside the monorepo's existing Zod v4 (`catalog:core`) adds unnecessary cognitive overhead and catalog churn when `@zod/mini` already satisfies bundle constraints.
- **Dedicated provider groups on `Orders`:** Rejected because schema bloat couples core ecommerce models to third-party vendor lifecycles.
- **Higher-order route factory:** Rejected in favor of the functional `processIncomingWebhook` helper to keep Next.js App Router request/response boundaries explicit for debugging and edge tracing.

## Consequences

1. `@repo/commerce-adapters` exports only domain types (`PaymentProvider`, `PaymentSession`, `ParsedWebhookEvent`, `ParsedPaymentStatus`) and factory functions; vendor schemas stay hidden.
2. Webhook route handlers in `apps/app` shrink from ~350 lines each to ~15 lines.
3. A Payload migration updates `orders` to consolidate existing `midtrans` and `xendit` data into `paymentMetadata`.
4. Webhook replay attacks and out-of-order deliveries are handled safely via terminal-state short-circuiting.
