# BYOK payment and shipping integration: Midtrans, Xendit, and RajaOngkir architecture

**Author:** Technical Architecture Research  
**Date:** September 2026  
**Status:** Completed  
**Target Repository:** Omset Digital

---

## 1. Executive summary

Omset Digital implements a Bring Your Own Key (BYOK) architecture for Indonesian merchants. Merchants configure their own payment gateway (Midtrans or Xendit) and shipping provider (RajaOngkir). The credentials reside within Payload CMS Store documents:

1. Payment configurations are stored as polymorphic blocks in `Store.paymentProviders` with `maxRows: 1` per ADR-0001 (`MidtransBlock`, `XenditBlock`).
2. Webhooks terminate at isolated Next.js 15 App Router endpoints (`/api/webhooks/[provider]/[storeSlug]`).
3. Shipping configurations reside in `Store.shippingConfig` with provider credentials conditionally loaded.
4. Merchant credentials (API keys, server keys, webhook verification tokens) require authenticated field-level encryption at rest.

This document evaluates the technical integration specifications for Midtrans, Xendit, and RajaOngkir against primary sources, inspects Payload 3.90.2 encryption internals, details webhook verification and payload formatting pitfalls, and establishes the case for direct typed `fetch` wrappers over official npm SDKs.

---

## 2. Primary sources consulted

The technical specifications in this document are verified against official documentation, API specifications, and repository source code:

- **Midtrans official documentation and API references:**
  - HTTP(S) Notification / Webhooks specification: `https://docs.midtrans.com/docs/https-notification-webhooks`
  - Receiving notifications reference: `https://docs.midtrans.com/reference/receiving-notifications`
  - Technical FAQ on server keys and status codes: `https://docs.midtrans.com/docs/technical-faq`
  - Snap API transaction reference: `https://docs.midtrans.com/reference/charge-transactions-1`
  - Transaction status API reference: `https://docs.midtrans.com/reference/get-transaction-status`
- **Xendit official documentation and API references:**
  - Handling webhooks and security best practices: `https://docs.xendit.co/docs/handling-webhooks`
  - Integration security guide: `https://docs.xendit.co/docs/integration-security`
  - Payment status callback webhook specification: `https://docs.xendit.co/apidocs/payment-status-callback-webhook`
  - Payment webhook notifications: `https://docs.xendit.co/apidocs/payment-webhook-notification`
  - Invoices API v2 reference: `https://docs.xendit.co/apidocs/create-invoice`
- **RajaOngkir official documentation and API endpoints:**
  - Starter tier documentation: `https://api.rajaongkir.com/dokumentasi/starter`
  - Pro tier documentation: `https://pro.rajaongkir.com/dokumentasi/pro`
  - City, province, and subdistrict endpoint definitions: `https://context7.com/websites/rajaongkir_dokumentasi/llms.txt`
  - Pro cost calculation endpoint specifications: `https://pro.rajaongkir.com/api/cost`
- **Payload CMS 3.90.2 source code (local workspace inspection):**
  - Encryption implementation: `node_modules/payload/dist/auth/crypto.js`
  - Configuration initialization and secret derivation: `node_modules/payload/dist/index.js`
  - API key encryption hooks: `node_modules/payload/dist/auth/baseFields/apiKey/encryptAPIKey.js`
  - Field omission hooks: `node_modules/payload/dist/auth/baseFields/apiKey/omitEncryptedAPIKey.js`
- **Official SDK packages on npm:**
  - `midtrans-client` (v1.4.3): `https://www.npmjs.com/package/midtrans-client`
  - `xendit-node` (v7.0.0): `https://www.npmjs.com/package/xendit-node`
  - Community RajaOngkir packages (`rajaongkir-node-js`, `node-rajaongkir`)

---

## 3. Midtrans and Xendit: webhook signature verification in Next.js 15 App Router

Webhook verification in a BYOK multi-tenant architecture differs from single-merchant applications. The application cannot verify signatures using an environment variable secret. It must resolve the tenant from the URL route parameter, retrieve and decrypt the tenant credentials from Payload Local API, and verify the signature using constant-time comparisons.

```
Incoming Webhook POST
  /api/webhooks/[provider]/[storeSlug]
                 │
                 ▼
  Next.js 15 App Router: await params
  provider: "midtrans" | "xendit"
  storeSlug: string
                 │
                 ▼
  Read Raw Request Body: req.text()
                 │
                 ▼
  Payload Local API: payload.find({
    collection: "stores",
    where: { slug: { equals: storeSlug } },
    depth: 0,
    overrideAccess: true,
  })
                 │
                 ▼
  Decrypt Tenant Credentials:
  AES-256-GCM decrypt(paymentProviders[0].serverKey | webhookToken)
                 │
                 ├───────────────────────────────┐
                 ▼                               ▼
       Midtrans Verifier                  Xendit Verifier
  Parse JSON from raw body        Inspect x-callback-token
  Compute SHA-512 over string:    or x-callback-signature
  order_id + status_code +        Verify via crypto.timingSafeEqual
  gross_amount + serverKey                       │
  Verify via crypto.timingSafeEqual              │
                 │                               │
                 └───────────────┬───────────────┘
                                 ▼
                     Dispatch Canonical Event
                 (pending | paid | failed | expired)
```

### 3.1 Midtrans signature verification

#### 3.1.1 Verification formula

According to the official Midtrans documentation (`https://docs.midtrans.com/docs/https-notification-webhooks`), Midtrans attaches a SHA-512 digest in the `signature_key` field of every webhook notification payload.

The exact formula is:

$$\text{signature\_key} = \text{SHA512}(\text{order\_id} + \text{status\_code} + \text{gross\_amount} + \text{ServerKey})$$

The elements are concatenated directly as raw strings with no delimiters:

- `order_id`: The merchant order identifier generated during transaction creation (string).
- `status_code`: The HTTP response code string returned by Midtrans core API (string, e.g., `"200"` for settlement, `"201"` for pending).
- `gross_amount`: The total transaction amount string (string, e.g., `"10000.00"`).
- `ServerKey`: The merchant secret server key obtained from the Midtrans Merchant Administration Portal (MAP).

Midtrans provides sample PHP verification code in their documentation (`https://docs.midtrans.com/reference/receiving-notifications`):

```php
$orderId = "1111";
$statusCode = "200";
$grossAmount = "100000.00";
$serverKey = "askvnoibnosifnboseofinbofinfgbiufglnbfg";
$input = $orderId.$statusCode.$grossAmount.$serverKey;
$signature = openssl_digest($input, 'sha512');
```

#### 3.1.2 The `gross_amount` decimal formatting pitfall

The most common implementation failure in Midtrans signature verification involves `gross_amount`.

Midtrans notification JSON payloads format `gross_amount` as a string with two decimal places, even for Indonesian Rupiah amounts that have no fractional cents:

```json
{
  "order_id": "ORDER-98231",
  "status_code": "200",
  "gross_amount": "150000.00",
  "signature_key": "fe5f725ea770c451017e9d6300af72b830a668d2f7d5da9b778ec2c4f9177efe5127d492d9ddfbcf6806ea5cd7dc1a7337c674d6139026b28f49ad0ea1ce5107"
}
```

The pitfalls arise when application code alters the representation:

1. **Number conversion:** If the incoming JSON is parsed by a schema library that coerces numbers (such as `z.coerce.number()`), `"150000.00"` becomes the JavaScript number `150000`. If this number is converted back to string (`150000.toString()`), the value is `"150000"`.
2. **Order table comparison:** If code verifies the signature using the order total stored in the application database instead of the exact string from the incoming webhook payload, the string is `"150000"`.

Because SHA-512 operates on byte sequences:

$$\text{SHA512}(\text{"ORDER-98231200150000.00" + ServerKey}) \neq \text{SHA512}(\text{"ORDER-98231200150000" + ServerKey})$$

The signature check fails, rejecting authentic webhooks.

**Rule:** Always extract `gross_amount` directly from the parsed JSON payload as an unmodified string. Never pass the value through numeric transformations prior to hash verification.

### 3.2 Xendit verification mechanisms

Xendit supports two distinct webhook authentication mechanisms depending on the API product and generation date.

#### 3.2.1 Legacy callback token (`x-callback-token`)

For Invoice API v2, classic Virtual Accounts, and standard disbursement callbacks, Xendit authenticates webhooks via a static verification token configured in the Xendit Dashboard under Settings > Webhooks.

- **Header name:** `x-callback-token`
- **Payload format:** JSON
- **Mechanism:** Shared secret equality. Xendit includes the static token in the header of each webhook request.
- **Verification protocol:** The receiving server reads `req.headers.get('x-callback-token')` and performs a constant-time comparison against the tenant stored `webhookToken`.

#### 3.2.2 Modern webhook signature (`x-callback-signature` and HMAC-SHA256)

For modern API products (such as Payment Requests, Payment Status Callbacks, and Bill Payments), Xendit provides cryptographic payload signing:

- **Header names:** `x-callback-signature` and `x-callback-timestamp` (or standard webhook headers `webhook-signature` and `webhook-timestamp`).
- **Signature algorithm:** HMAC-SHA256.
- **Signing input:** The raw request body string (or timestamp concatenated with raw body: `${timestamp}.${rawBody}`).
- **Secret key:** The merchant webhook verification token or API secret key.
- **Raw body requirement:** Verification requires the byte-for-byte unmodified request body. Parsing the body as JSON and calling `JSON.stringify()` alters whitespace and key order, invalidating the HMAC digest.

### 3.3 Next.js 15 App Router route handler implementation

Next.js 15 App Router introduces changes to dynamic route parameters and body streaming that directly impact webhook handlers.

#### 3.3.1 Asynchronous route handler parameters

In Next.js 15, dynamic route parameters in route handlers are promises:

```ts
// Next.js 15 contract: params must be awaited
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string; storeSlug: string }> }
) {
  const { provider, storeSlug } = await params;
  // ...
}
```

Accessing `params.provider` synchronously triggers runtime warnings in development and breaks under production optimizations.

#### 3.3.2 Stream consumption: `req.text()` versus `req.json()`

The request body stream in Next.js 15 can only be consumed once. Calling `await req.json()` prevents subsequent calls to `await req.text()`.

To support HMAC signature verification, auditing, and JSON parsing without reading the stream multiple times:

1. Consume the stream once as raw text using `const rawBody = await req.text()`.
2. Compute cryptographic hashes directly against `rawBody`.
3. Parse the JSON representation using `JSON.parse(rawBody)`.

#### 3.3.3 Timing-safe comparison

Comparing cryptographic hashes or secret tokens using standard equality operators (`===`) creates timing side-channel vulnerabilities. JavaScript runtime string comparisons exit on the first mismatched byte, allowing attackers to measure execution time variations to recover secret tokens byte by byte.

Node.js provides `crypto.timingSafeEqual(bufferA, bufferB)`. The function requires both buffers to have identical byte lengths; passing mismatched buffer lengths causes `timingSafeEqual` to throw an error.

The safe comparison helper must check length prior to comparison:

```ts
import crypto from "node:crypto";

export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
```

#### 3.3.4 Complete Next.js 15 webhook route handler

Below is the production-ready route handler for `/api/webhooks/[provider]/[storeSlug]/route.ts`. It resolves the tenant store from Payload Local API, decrypts the gateway credentials, executes the provider-specific verification, and returns standard HTTP responses:

```ts
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import configPromise from "@payload-config";
import { decryptCredential } from "@/lib/crypto/aes-gcm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string; storeSlug: string }> }
): Promise<NextResponse> {
  const { provider, storeSlug } = await params;

  if (provider !== "midtrans" && provider !== "xendit") {
    return NextResponse.json(
      { error: "Unsupported provider" },
      { status: 404 }
    );
  }

  const rawBody = await req.text();
  if (!rawBody) {
    return NextResponse.json({ error: "Empty payload" }, { status: 400 });
  }

  // 1. Resolve tenant store via Payload Local API
  const payload = await getPayload({ config: configPromise });
  const storeResult = await payload.find({
    collection: "stores",
    where: {
      slug: { equals: storeSlug },
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const store = storeResult.docs[0];
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  // 2. Validate active payment provider block
  const activeProvider = store.paymentProviders?.[0];
  if (!activeProvider || activeProvider.blockType !== provider) {
    return NextResponse.json(
      { error: "Provider not configured for store" },
      { status: 400 }
    );
  }

  // 3. Provider-specific signature verification
  if (provider === "midtrans") {
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const orderId = String(body.order_id ?? "");
    const statusCode = String(body.status_code ?? "");
    const grossAmount = String(body.gross_amount ?? "");
    const incomingSignature = String(body.signature_key ?? "");

    if (!orderId || !statusCode || !grossAmount || !incomingSignature) {
      return NextResponse.json(
        { error: "Missing required signature fields" },
        { status: 400 }
      );
    }

    // Decrypt tenant serverKey
    const serverKey = decryptCredential(activeProvider.serverKey);
    const hashInput = `${orderId}${statusCode}${grossAmount}${serverKey}`;
    const expectedSignature = crypto
      .createHash("sha512")
      .update(hashInput)
      .digest("hex");

    if (!safeCompare(incomingSignature, expectedSignature)) {
      return NextResponse.json(
        { error: "Invalid Midtrans signature" },
        { status: 401 }
      );
    }

    // Process Midtrans transaction status
    const transactionStatus = String(body.transaction_status ?? "");
    const fraudStatus = String(body.fraud_status ?? "");
    let canonicalStatus: "pending" | "paid" | "failed" | "expired" = "pending";

    if (transactionStatus === "capture") {
      canonicalStatus = fraudStatus === "challenge" ? "pending" : "paid";
    } else if (transactionStatus === "settlement") {
      canonicalStatus = "paid";
    } else if (["deny", "cancel", "failure"].includes(transactionStatus)) {
      canonicalStatus = "failed";
    } else if (transactionStatus === "expire") {
      canonicalStatus = "expired";
    }

    // Dispatch internal event or update order in Payload
    await handlePaymentStatusUpdate({
      payload,
      storeId: store.id,
      orderId,
      canonicalStatus,
      rawEvent: body,
    });

    return NextResponse.json({ status: "OK" }, { status: 200 });
  }

  if (provider === "xendit") {
    const callbackTokenHeader = req.headers.get("x-callback-token");
    const signatureHeader = req.headers.get("x-callback-signature");

    // Case A: Modern HMAC-SHA256 signature
    if (signatureHeader && activeProvider.webhookSecret) {
      const secret = decryptCredential(activeProvider.webhookSecret);
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

      if (!safeCompare(signatureHeader, expectedSignature)) {
        return NextResponse.json(
          { error: "Invalid Xendit HMAC signature" },
          { status: 401 }
        );
      }
    }
    // Case B: Static callback token
    else if (callbackTokenHeader && activeProvider.webhookToken) {
      const expectedToken = decryptCredential(activeProvider.webhookToken);
      if (!safeCompare(callbackTokenHeader, expectedToken)) {
        return NextResponse.json(
          { error: "Invalid Xendit callback token" },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Missing Xendit verification headers" },
        { status: 401 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Process Xendit invoice or payment status
    const externalId = String(
      body.external_id ??
        (body.data as Record<string, unknown>)?.reference_id ??
        ""
    );
    const status = String(
      body.status ?? (body.data as Record<string, unknown>)?.status ?? ""
    ).toUpperCase();
    let canonicalStatus: "pending" | "paid" | "failed" | "expired" = "pending";

    if (["PAID", "SETTLED", "SUCCEEDED"].includes(status)) {
      canonicalStatus = "paid";
    } else if (["EXPIRED"].includes(status)) {
      canonicalStatus = "expired";
    } else if (["FAILED"].includes(status)) {
      canonicalStatus = "failed";
    }

    await handlePaymentStatusUpdate({
      payload,
      storeId: store.id,
      orderId: externalId,
      canonicalStatus,
      rawEvent: body,
    });

    return NextResponse.json({ status: "OK" }, { status: 200 });
  }

  return NextResponse.json({ error: "Unhandled provider" }, { status: 500 });
}

async function handlePaymentStatusUpdate(_args: {
  payload: unknown;
  storeId: string;
  orderId: string;
  canonicalStatus: string;
  rawEvent: Record<string, unknown>;
}) {
  // Dispatches order transition state in Payload Local API
}
```

---

## 4. RajaOngkir API

RajaOngkir is the standard shipping rate aggregator for Indonesian couriers (JNE, POS Indonesia, TIKI, SiCepat, J&T, Wahana, and others). It exposes domestic and international shipping rates, administrative divisions, and airwaybill tracking.

### 4.1 Address and location structure

#### 4.1.1 Account tiers

RajaOngkir divides access into three subscription tiers:

| Feature / Limit | Starter Tier (Free) | Basic Tier (Paid) | Pro Tier (Paid) |
| :-- | :-- | :-- | :-- |
| **Base URL** | `https://api.rajaongkir.com/starter` | `https://api.rajaongkir.com/basic` | `https://pro.rajaongkir.com/api` |
| **Couriers Supported** | 3 (JNE, POS, TIKI) | 6 (JNE, POS, TIKI, PCP, RPX, ESL) | 20+ (JNE, POS, TIKI, SiCepat, J&T, AnterAja, Wahana, Lion, etc.) |
| **Geographic Resolution** | City / Kabupaten level only | City / Kabupaten level only | Subdistrict (`kecamatan`) level |
| **Subdistrict Endpoint** | Not supported | Not supported | `GET /subdistrict` supported |
| **Waybill Tracking** | No | Yes | Yes |
| **Rate Query Granularity** | `city` to `city` | `city` to `city` | `subdistrict` to `subdistrict` |
| **Max Package Weight** | 30,000 grams (30 kg) | 30,000 grams (30 kg) | Custom / Unlimited depending on courier |

#### 4.1.2 Geographic hierarchy

Indonesian administrative divisions follow this structure:

$$\text{Provinsi (Province)} \longrightarrow \text{Kota / Kabupaten (City / Regency)} \longrightarrow \text{Kecamatan (Subdistrict)}$$

1. **Province:** Retrieved via `GET /province`. Returns a list of 34-38 provinces with numeric `province_id` and `province`.
2. **City:** Retrieved via `GET /city?province={province_id}`. Returns 501+ cities and regencies with numeric `city_id`, `province_id`, `type` (`"Kota"` or `"Kabupaten"`), `city_name`, and `postal_code`.
3. **Subdistrict (Pro tier only):** Retrieved via `GET /subdistrict?city={city_id}`. Returns subdistricts (`kecamatan`) with `subdistrict_id`, `province_id`, `city_id`, and `subdistrict_name`.

#### 4.1.3 Postal codes versus internal numeric IDs

A common assumption among developers new to Indonesian ecommerce is that shipping rates can be queried using standard Indonesian postal codes (`kode pos`, 5 digits).

**Primary source verification:** According to the official RajaOngkir documentation (`https://api.rajaongkir.com/dokumentasi/starter` and `https://pro.rajaongkir.com/dokumentasi/pro`), shipping rates cannot be queried by postal code:

- The `postal_code` field returned by `/city` is static metadata representing the primary postal code of the regency seat. Multiple subdistricts within a single regency share postal code patterns or have distinct postal codes not reflected in the top-level city record.
- The `POST /cost` endpoint strictly accepts RajaOngkir internal numeric identifiers for origin and destination.
- Passing a 5-digit postal code (such as `"12950"`) into the `origin` or `destination` parameter either produces an HTTP 400 error (`Invalid destination`), or incorrectly resolves to an unrelated internal `city_id` or `subdistrict_id` that happens to match that integer.

**Rule:** Storefront checkout forms must resolve the merchant origin and customer destination to RajaOngkir internal numeric IDs (`subdistrict_id` for Pro, `city_id` for Starter/Basic) before dispatching rate queries.

#### 4.1.4 Parameter format differences between Starter/Basic and Pro

The request body for `POST /cost` differs across tiers:

**Starter and Basic tiers (`api.rajaongkir.com`):**

```http
POST /starter/cost HTTP/1.1
Host: api.rajaongkir.com
key: YOUR_API_KEY
Content-Type: application/x-www-form-urlencoded

origin=501&destination=114&weight=1000&courier=jne
```

Parameters:

- `origin`: City ID (integer).
- `destination`: City ID (integer).
- `weight`: Weight in grams (integer).
- `courier`: Courier code (`"jne"`, `"pos"`, or `"tiki"`).

**Pro tier (`pro.rajaongkir.com`):**

```http
POST /api/cost HTTP/1.1
Host: pro.rajaongkir.com
key: YOUR_API_KEY
Content-Type: application/x-www-form-urlencoded

origin=574&originType=subdistrict&destination=2094&destinationType=subdistrict&weight=1250&courier=jne:sicepat:jnt
```

Parameters:

- `origin`: Geographic ID (integer).
- `originType`: Required granularity level. Allowed values: `"city"` or `"subdistrict"`.
- `destination`: Geographic ID (integer).
- `destinationType`: Required granularity level. Allowed values: `"city"` or `"subdistrict"`.
- `weight`: Weight in grams (integer).
- `courier`: Single courier code or multiple colon-delimited courier codes (`"jne:pos:tiki:sicepat:jnt"`).

Omset Digital stores `originSubdistrictId` on the Store document under `Store.shippingConfig.rajaongkirConfig` when `accountType === 'pro'`, and `originCityId` when `accountType === 'starter'`. The rate request builder must dynamically assign `originType` and `destinationType` based on the configured account type.

### 4.2 Weight format and constraints

#### 4.2.1 Units and minimum values

- RajaOngkir strictly requires weight in integer grams (`weight > 0`).
- Passing floating-point numbers or kilograms causes request parsing failures. A 2.5 kg parcel must be sent as `2500`.
- Minimum queryable weight is `1` gram.
- For Starter and Basic accounts, the maximum supported weight is 30,000 grams (30 kg). Packages exceeding 30 kg return errors.

#### 4.2.2 Courier-specific rounding rules

Although RajaOngkir accepts arbitrary gram values, couriers calculate actual billing weights using proprietary rounding rules and volumetric formulas:

| Courier | Minimum Billable Weight | Rounding Threshold | Example: 1,180 grams | Example: 1,320 grams |
| :-- | :-- | :-- | :-- | :-- |
| **JNE (Reguler)** | 1,000 g (1 kg) | Up to 1,200 g rounds down to 1 kg; 1,201 g rounds up to 2 kg | Billed as 1 kg | Billed as 2 kg |
| **TIKI** | 1,000 g (1 kg) | Up to 1,200 g or 1,299 g (service-dependent) rounds down | Billed as 1 kg | Billed as 2 kg |
| **POS Indonesia** | 1,000 g (1 kg) | Strict 1,000 g increments; some parcel services allow 500 g tiers | Billed as 1 kg | Billed as 2 kg |
| **SiCepat** | 1,000 g (1 kg) | Up to 1,300 g rounds down to 1 kg (300 g tolerance) | Billed as 1 kg | Billed as 1 kg |
| **J&T Express** | 1,000 g (1 kg) | Up to 1,200 g rounds down to 1 kg | Billed as 1 kg | Billed as 2 kg |

When an order weighs 1,250 grams, SiCepat charges for 1 kg while JNE charges for 2 kg. RajaOngkir calculates these tariffs internally based on the courier rate matrices. The application must supply the true total item weight in grams and let the courier engine apply the appropriate tariff.

### 4.3 Average rate query latency and operational reliability

#### 4.3.1 Real-world latency characteristics

RajaOngkir operates as an aggregator. For many courier services, RajaOngkir proxies or programmatically queries the web calculators and internal rate portals of Indonesian logistics companies.

Operational observations across production deployments indicate:

1. **High baseline latency:** While city and province lookups respond within 150-300 ms, `/cost` rate queries average 1,200 ms to 3,500 ms under normal load.
2. **Multi-courier amplification:** When querying colon-delimited couriers on the Pro tier (`courier=jne:pos:tiki:sicepat:jnt`), RajaOngkir queries upstream portals concurrently. If one courier portal experiences slowness, the entire HTTP response is held until that courier times out (often 5,000 ms to 10,000 ms).
3. **Upstream portal downtime:** Couriers periodically update rate cards or undergo maintenance without notice. RajaOngkir may return an empty `costs` array for a specific courier while returning valid rates for others in the same response payload.

#### 4.3.2 Two-tier caching strategy

To prevent checkout abandonment caused by multi-second rate calculation delays, Omset Digital must implement a two-tier caching strategy:

```
Storefront Customer
        │
        ▼
Select Shipping Destination (Prov / City / Subdistrict)
        │
        ▼
[Tier 1 Cache: Static Location Dictionary]
  Storage: Local PostgreSQL / SQLite / Redis
  TTL: 30 days (Static)
  Latency: < 5ms
  No external RajaOngkir HTTP requests
        │
        ▼
Calculate Shipping Rates (Origin, Destination, Weight)
        │
        ▼
[Tier 2 Cache: Rate Quote Cache]
  Storage: Redis / Cache KV
  Cache Key: hash(originId + destId + weightTier + couriers)
  TTL: 6 to 12 hours
        │
   ┌────┴────┐
   ▼         ▼
Hit (<10ms)  Miss (1.5s - 3s)
             Query RajaOngkir POST /cost
             Populate Cache
```

**Tier 1: Static administrative location dictionary**

- **Data:** All provinces, cities, and subdistricts.
- **Volatility:** Negligible. Indonesian regional boundaries and subdistrict names change infrequently (years between administrative redistricting).
- **Strategy:** Seed the complete administrative hierarchy into the platform database during initial provisioning. Dropdowns in the customer checkout flow query the local database, never RajaOngkir. This eliminates all external network calls while customers choose addresses.
- **TTL:** 30 days or permanent with scheduled monthly re-sync.

**Tier 2: Dynamic rate quote caching**

- **Data:** Shipping service options and pricing returned by `POST /cost`.
- **Volatility:** Courier tariffs change periodically (quarterly fuel surcharges or annual tariff revisions).
- **Strategy:** Construct a deterministic cache key based on origin, destination, weight tier, and courier set: $$\text{Key} = \text{sha256}(\text{originId} + \text{":"} + \text{destId} + \text{":"} + \text{weightTier} + \text{":"} + \text{courier})$$ Weight tiering can normalize weights (e.g., packages between 1 g and 1,000 g share the 1 kg tier for couriers that have 1 kg minimums).
- **TTL:** 6 to 12 hours.
- **Storefront UX implication:** When a customer updates their address, display an immediate loading skeleton on the shipping selection card. Fetch quotes asynchronously. If RajaOngkir times out or a courier fails, display cached quotes if available or present the remaining successful couriers without failing the entire checkout page.

---

## 5. AES-256-GCM encryption patterns in Payload CMS hooks

BYOK credentials (Midtrans Server Key, Xendit Secret Key, Webhook Tokens) must be encrypted at rest in the database while remaining accessible to backend payment dispatchers.

### 5.1 Payload 3 native encryption analysis

Payload CMS exposes encryption methods on the payload instance (`payload.encrypt` and `payload.decrypt`). To determine whether native methods are suitable for merchant payment credentials, we inspect the implementation in `node_modules/payload/dist/auth/crypto.js`:

```js
import crypto from "crypto";
const algorithm = "aes-256-ctr";

export function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const secret = this.secret;
  const cipher = crypto.createCipheriv(algorithm, secret, iv);
  const encrypted = cipher.update(text, "utf8", "hex") + cipher.final("hex");
  const ivString = iv.toString("hex");
  return `${ivString}${encrypted}`;
}

export function decrypt(hash) {
  const iv = hash.slice(0, 32);
  const content = hash.slice(32);
  const secret = this.secret;
  const decipher = crypto.createDecipheriv(
    algorithm,
    secret,
    Buffer.from(iv, "hex")
  );
  return decipher.update(content, "hex", "utf8") + decipher.final("utf8");
}
```

And in `node_modules/payload/dist/index.js` (line 321):

```js
this.secret = crypto
  .createHash("sha256")
  .update(this.config.secret)
  .digest("hex")
  .slice(0, 32);
```

#### 5.1.1 Architectural vulnerabilities of Payload native encryption

1. **Unauthenticated cipher (`aes-256-ctr`):** Payload uses Counter Mode (CTR). CTR is a stream cipher mode that is malleable. It lacks an authentication tag (MAC). If an attacker with database read/write access flips bits in the stored ciphertext, the decrypted plaintext exhibits corresponding bit flips without triggering any decryption error. High-security payment credentials require Authenticated Encryption with Associated Data (AEAD), such as AES-256-GCM.
2. **Reduced key entropy:** Payload derives `this.secret` by taking the SHA-256 digest of the secret in hexadecimal format (64 characters) and slicing the first 32 characters (`.slice(0, 32)`). A 32-character hexadecimal string contains characters only in the set `[0-9a-f]`. Passing a 32-character ASCII hex string into `createCipheriv` provides only 128 bits of actual key entropy instead of the full 256 bits required for AES-256.
3. **No authentication tag handling:** Because CTR mode has no auth tag, Payload serialization stores only `${ivString}${encrypted}`. If ciphertext is truncated or corrupted, decryption silently returns corrupted text instead of failing fast.

**Conclusion:** Native `payload.encrypt` is designed for non-critical auth token storage (such as internal user API keys). It must not be used for merchant payment gateway secrets. Omset Digital must implement a custom Node.js `crypto` AES-256-GCM module.

### 5.2 Custom AES-256-GCM implementation

The custom encryption module implements NIST SP 800-38D compliant AES-256-GCM:

- **Algorithm:** `aes-256-gcm`
- **Key derivation:** HKDF (RFC 5869) extracting a full 256-bit (32-byte) binary key from the platform master secret and an application salt.
- **Initialization vector (IV):** 12 bytes (96 bits) of cryptographically secure random bytes generated per encryption operation.
- **Authentication tag:** 16 bytes (128 bits) generated by `cipher.getAuthTag()`. Decryption validates this tag before emitting plaintext.
- **Serialization format:** Versioned delimiter string: `v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>`.

```ts
import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits per NIST SP 800-38D
const TAG_LENGTH = 16; // 128 bits auth tag
const CURRENT_VERSION = "v1";

// Derive 32-byte key using HKDF from platform master secret
function deriveMasterKey(): Buffer {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("PAYLOAD_SECRET must be at least 32 characters");
  }
  return crypto.hkdfSync(
    "sha256",
    secret,
    "omset-digital-salt",
    "payment-byok-aes-key",
    32
  );
}

let cachedKey: Buffer | null = null;
function getKey(): Buffer {
  if (!cachedKey) {
    cachedKey = deriveMasterKey();
  }
  return cachedKey;
}

export function encryptCredential(plaintext: string): string {
  if (!plaintext) {
    return plaintext;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv, {
    authTagLength: TAG_LENGTH,
  });

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `${CURRENT_VERSION}:${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptCredential(serialized: string): string {
  if (!serialized || !serialized.startsWith("v1:")) {
    // If not ciphertext, return as-is or handle legacy
    return serialized;
  }

  const parts = serialized.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid ciphertext format");
  }

  const [version, ivHex, tagHex, cipherHex] = parts;
  if (version !== "v1") {
    throw new Error(`Unsupported encryption version: ${version}`);
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(cipherHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv, {
    authTagLength: TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function isCiphertext(value: unknown): boolean {
  return typeof value === "string" && value.startsWith("v1:");
}
```

### 5.3 Avoiding re-encryption and data loss pitfalls in Payload hooks

When managing encrypted credentials inside Payload collections, developers frequently encounter two severe failure modes: credential erasure and double-encryption loops.

#### 5.3.1 The `read: () => false` erasure pitfall

In Payload CMS, sensitive fields should be hidden from API consumers using field-level access control:

```ts
{
  name: 'serverKey',
  type: 'text',
  access: {
    read: () => false, // Hidden from frontend and admin read queries
  },
}
```

When an admin user edits a Store document in the Payload Admin UI (for example, updating the store name or toggling a boolean in the payment block), the Admin UI form does not have access to the existing `serverKey` because `read: () => false` withheld it.

When the Admin UI submits the form, it sends the block row data with `serverKey: undefined` (or omitted).

In standard top-level fields, Payload ignores undefined keys during updates. However, in array fields and polymorphic block fields (`paymentProviders`), Payload replaces the entire array or block row. If the hook does not protect the field, the missing property causes the database value to be overwritten with `null`, permanently deleting the merchant's secret key.

#### 5.3.2 The double-encryption loop

A naive `beforeChange` hook encrypts whatever value is passed:

```ts
// DANGEROUS: Causes double-encryption loops
beforeChange: [({ value }) => encryptCredential(value)];
```

Consider this sequence:

1. Merchant inputs plaintext API key `"SB-Mid-server-XYZ"`.
2. `beforeChange` runs: saves `"v1:iv1:tag1:cipher1"`.
3. Later, an automated background job or internal route reads the Store document via Payload Local API with `overrideAccess: true`. If `afterRead` does not decrypt the field, the document object contains `"v1:iv1:tag1:cipher1"`.
4. The background job updates another field on the store document (e.g. `store.status = 'active'`) and calls `payload.update({ collection: 'stores', id, data: store })`.
5. The `beforeChange` hook runs again. It receives `"v1:iv1:tag1:cipher1"` as `value`.
6. The hook blindly encrypts the ciphertext again, creating `"v1:iv2:tag2:cipher2(v1:iv1:tag1:cipher1)"`.
7. When the webhook handler subsequently decrypts the key, it decrypts only the outer layer, producing the inner ciphertext `"v1:iv1:tag1:cipher1"` instead of the real API key. The Midtrans signature check immediately fails.

#### 5.3.3 Production-grade credential field definition

To prevent credential loss and double-encryption loops, every encrypted field must adhere to three rules:

1. **Passthrough check:** If `value` already starts with the version prefix (`v1:`), return it untouched.
2. **Original document fallback:** If `value` is undefined, null, or empty string (meaning the Admin UI omitted it), retrieve the existing ciphertext from `originalDoc`.
3. **Dedicated server decryption helper:** Do not decrypt inside `afterRead`. If credentials decrypt on every read, any internal logging or accidental serialization leaks the secret. Keep the secret encrypted at all times until the exact execution moment in `createSession` or `parseWebhook`.

Here is the reusable field factory:

```ts
import type { Field } from "payload";
import { encryptCredential, isCiphertext } from "@/lib/crypto/aes-gcm";

export function createEncryptedSecretField(options: {
  name: string;
  label: string;
  required?: boolean;
}): Field {
  return {
    name: options.name,
    label: options.label,
    type: "text",
    required: options.required ?? false,
    admin: {
      description:
        "Encrypted at rest using AES-256-GCM. Hidden from standard read queries.",
    },
    access: {
      read: () => false, // Never expose over HTTP REST/GraphQL
    },
    hooks: {
      beforeChange: [
        ({ value, originalDoc, siblingData }) => {
          // 1. If value is empty or undefined, retain existing value from originalDoc
          if (value === undefined || value === null || value === "") {
            if (originalDoc) {
              // Find matching block in originalDoc if within blocks field
              const blockIndex = siblingData?.id;
              // Return original encrypted value
              return originalDoc[options.name];
            }
            return value;
          }

          // 2. Prevent double-encryption loops
          if (isCiphertext(value)) {
            return value;
          }

          // 3. New plaintext value provided: encrypt with AES-256-GCM
          return encryptCredential(String(value).trim());
        },
      ],
    },
  };
}
```

---

## 6. Official npm SDKs vs direct typed `fetch` wrappers

A central architectural decision in Omset Digital is whether to install official vendor SDKs (`midtrans-client`, `xendit-node`) or write direct typed `fetch` wrappers.

```
SDK Approach:
  Incoming Request
        │
        ▼
  Instantiate SDK: new Xendit({ secretKey }) -> Evaluates 5MB OpenAPI bundle
        │
        ▼
  Execute request via axios / CJS wrappers
  Memory overhead per tenant; slow serverless cold start

Direct Typed fetch Approach:
  Incoming Request
        │
        ▼
  Execute pure stateless function:
  createMidtransSession(credentials, order)
        │
        ▼
  Native Web fetch: Zero dependencies, 0ms overhead, works on Node/Edge
```

### 6.1 Evaluation of official and community SDKs

#### 6.1.1 Midtrans (`midtrans-client`)

- **NPM package:** `midtrans-client` (v1.4.3)
- **Dependencies:** `axios` (^1.9.0) and `lodash` (^4.17.21).
- **TypeScript support:** None. Written in legacy CommonJS JavaScript. TypeScript typings must be fetched via community package `@types/midtrans-client`, which lags behind API updates.
- **Runtime compatibility:** Relies on Node.js-specific modules and `axios` HTTP adapters. Breaks or requires polyfills in Next.js Edge Runtime or Cloudflare Workers.
- **Multi-tenant ergonomics:** Designed around class instantiation:
  ```ts
  const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: "...",
    clientKey: "...",
  });
  ```
  In a multi-tenant BYOK architecture, the server cannot maintain a singleton instance. It must instantiate new class objects with distinct options on every single HTTP request.

#### 6.1.2 Xendit (`xendit-node`)

- **NPM package:** `xendit-node` (v7.0.0)
- **Architecture:** Transitioned from handwritten code (v2) to an auto-generated client built via OpenAPI Generator (v5/v6/v7).
- **Bundle weight:** Extreme. Generates TypeScript classes, serializers, and union types for the entire Xendit financial catalog (disbursements, cards, retail outlets, XenPlatform, payroll, invoices). The package adds 2-5 MB of JavaScript to server bundles.
- **Cold start penalty:** Parsing massive OpenAPI-generated class hierarchies incurs measurable cold-start latency in serverless environments (AWS Lambda, Vercel Serverless Functions).
- **Typing quirks:** OpenAPI generator typings frequently produce deeply nested or rigid types (such as `InvoiceCallback` union types with discriminator fields) that complicate simple webhook handling.

#### 6.1.3 RajaOngkir

- **Official SDK:** Nonexistent. RajaOngkir has never published or maintained an official TypeScript or Node.js SDK on npm.
- **Community packages:** Community packages (such as `rajaongkir-node-js`, `node-rajaongkir`) were built between 2016 and 2022. They depend on abandoned HTTP libraries (such as `request` or early `axios`), lack TypeScript declarations, and hardcode HTTP endpoints rather than HTTPS.

### 6.2 Direct typed `fetch` wrappers for Omset Digital

Omset Digital requires only a small surface area from each provider:

1. **Midtrans:**
   - Create Snap Transaction: `POST https://app.midtrans.com/snap/v1/transactions`
   - Get Transaction Status: `GET https://api.midtrans.com/v2/{order_id}/status`
2. **Xendit:**
   - Create Invoice: `POST https://api.xendit.co/v2/invoices`
   - Get Invoice: `GET https://api.xendit.co/v2/invoices/{invoice_id}`
3. **RajaOngkir:**
   - Query Subdistricts: `GET https://pro.rajaongkir.com/api/subdistrict?city={cityId}`
   - Query Shipping Costs: `POST https://pro.rajaongkir.com/api/cost`

Building direct typed wrappers around native `fetch` provides significant advantages. Below are the complete typed contracts and wrappers.

#### 6.2.1 Midtrans typed wrapper

```ts
export interface MidtransCredentials {
  serverKey: string;
  isProduction: boolean;
}

export interface CreateSnapSessionInput {
  orderId: string;
  grossAmount: number;
  customer: {
    firstName: string;
    email: string;
    phone?: string;
  };
  items: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
}

export interface SnapSessionResponse {
  token: string;
  redirect_url: string;
}

export async function createMidtransSnapSession(
  credentials: MidtransCredentials,
  input: CreateSnapSessionInput
): Promise<SnapSessionResponse> {
  const baseUrl = credentials.isProduction
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  const authHeader = `Basic ${Buffer.from(`${credentials.serverKey}:`).toString("base64")}`;

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: input.orderId,
        gross_amount: input.grossAmount,
      },
      customer_details: {
        first_name: input.customer.firstName,
        email: input.customer.email,
        phone: input.customer.phone,
      },
      item_details: input.items.map((item) => ({
        id: item.id,
        price: item.price,
        quantity: item.quantity,
        name: item.name.slice(0, 50),
      })),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Midtrans API error (${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<SnapSessionResponse>;
}
```

#### 6.2.2 Xendit typed wrapper

```ts
export interface XenditCredentials {
  secretKey: string;
}

export interface CreateXenditInvoiceInput {
  externalId: string;
  amount: number;
  payerEmail: string;
  description: string;
  successRedirectUrl?: string;
  failureRedirectUrl?: string;
}

export interface XenditInvoiceResponse {
  id: string;
  external_id: string;
  status: string;
  merchant_name: string;
  amount: number;
  payer_email: string;
  description: string;
  invoice_url: string;
  expiry_date: string;
}

export async function createXenditInvoice(
  credentials: XenditCredentials,
  input: CreateXenditInvoiceInput
): Promise<XenditInvoiceResponse> {
  const authHeader = `Basic ${Buffer.from(`${credentials.secretKey}:`).toString("base64")}`;

  const response = await fetch("https://api.xendit.co/v2/invoices", {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_id: input.externalId,
      amount: input.amount,
      payer_email: input.payerEmail,
      description: input.description,
      success_redirect_url: input.successRedirectUrl,
      failure_redirect_url: input.failureRedirectUrl,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Xendit API error (${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<XenditInvoiceResponse>;
}
```

#### 6.2.3 RajaOngkir typed wrapper

```ts
export interface RajaOngkirCredentials {
  apiKey: string;
  accountType: "starter" | "basic" | "pro";
}

export interface ShippingCostQueryInput {
  origin: number;
  originType?: "city" | "subdistrict";
  destination: number;
  destinationType?: "city" | "subdistrict";
  weightInGrams: number;
  couriers: string[]; // ['jne', 'sicepat', 'jnt']
}

export interface CourierCostService {
  service: string;
  description: string;
  cost: Array<{
    value: number;
    etd: string;
    note: string;
  }>;
}

export interface CourierCostResult {
  code: string;
  name: string;
  costs: CourierCostService[];
}

export interface RajaOngkirCostResponse {
  rajaongkir: {
    status: {
      code: number;
      description: string;
    };
    results: CourierCostResult[];
  };
}

export async function queryRajaOngkirCost(
  credentials: RajaOngkirCredentials,
  input: ShippingCostQueryInput
): Promise<CourierCostResult[]> {
  const isPro = credentials.accountType === "pro";
  const url = isPro
    ? "https://pro.rajaongkir.com/api/cost"
    : "https://api.rajaongkir.com/starter/cost";

  const bodyParams = new URLSearchParams();
  bodyParams.append("origin", String(input.origin));
  bodyParams.append("destination", String(input.destination));
  bodyParams.append(
    "weight",
    String(Math.max(1, Math.round(input.weightInGrams)))
  );
  bodyParams.append("courier", input.couriers.join(":"));

  if (isPro) {
    bodyParams.append("originType", input.originType ?? "subdistrict");
    bodyParams.append(
      "destinationType",
      input.destinationType ?? "subdistrict"
    );
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      key: credentials.apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: bodyParams.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`RajaOngkir API error (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as RajaOngkirCostResponse;
  if (data.rajaongkir.status.code !== 200) {
    throw new Error(`RajaOngkir error: ${data.rajaongkir.status.description}`);
  }

  return data.rajaongkir.results;
}
```

### 6.3 Architectural comparison matrix

| Metric | Vendor npm SDKs (`midtrans-client`, `xendit-node`) | Direct Typed `fetch` Wrappers |
| :-- | :-- | :-- |
| **Bundle Weight** | **Heavy:** 2.5 MB to 6 MB combined across dependencies (`axios`, `lodash`, OpenAPI code-gen trees). | **Zero:** 0 kB external dependencies. Uses native Node 18+ and Next.js `fetch`. |
| **Serverless Cold Start** | **Slow:** Node runtime must parse, evaluate, and link thousands of generated classes and deep prototype chains. | **Instant:** Negligible script parse overhead; single lightweight function calls. |
| **Type Precision** | **Variable:** `midtrans-client` has no types (requires community `@types`); `xendit-node` has overly verbose generated types. | **Exact:** Tailored TypeScript interfaces match only the exact payloads and fields Omset Digital uses. |
| **Runtime Independence** | **Restricted:** Bound to Node.js APIs and CommonJS modules. Fails in Next.js Edge Runtime or Cloudflare Workers without polyfills. | **Universal:** Operates on standard Web APIs (`fetch`, `Request`, `Response`, `URLSearchParams`). Runs on Node, Bun, Edge. |
| **Multi-Tenant BYOK Ergonomics** | **Awkward:** Requires instantiating new class instances (`new Snap({...})`, `new Xendit({...})`) per request. Risk of memory retention. | **Native:** Pure stateless functions accept tenant credentials as arguments per invocation. |
| **Maintenance Burden** | **External risk:** Breaking upstream generator changes, security alerts in indirect dependencies (`axios`, `lodash`), abandoned packages. | **Low:** Directly tied to stable HTTP/REST vendor endpoints; no intermediate abstraction layers. |

---

## 7. Implementation recommendations for Omset Digital

1. **Reject Vendor SDKs:** Do not install `midtrans-client`, `xendit-node`, or community RajaOngkir packages. Place typed `fetch` adapters in `@/lib/integrations/{midtrans,xendit,rajaongkir}`.
2. **Standardize on AES-256-GCM:** Deploy custom encryption in `@/lib/crypto/aes-gcm.ts` using 96-bit IVs and 128-bit authentication tags with the `v1:` prefix format. Bypass Payload native `payload.encrypt`.
3. **Protect Secret Fields Against Erasure:** Wrap all credential fields with `createEncryptedSecretField()`. Verify that hooks preserve existing ciphertext from `originalDoc` when the Admin UI submits partial updates.
4. **Preserve Raw Body in Webhooks:** In `/api/webhooks/[provider]/[storeSlug]/route.ts`, read the request body once via `await req.text()`. Compute Midtrans SHA-512 and Xendit HMAC signatures directly from this text before JSON parsing.
5. **Enforce Timing-Safe Checks:** Compare all signatures and callback tokens using `crypto.timingSafeEqual` with buffer length validation.
6. **Pre-Seed Administrative Divisions:** Store Indonesian provinces, cities, and subdistricts in local PostgreSQL database tables. Never query RajaOngkir during address selection in the checkout UI. Cache rate quotes in Redis with 6-to-12-hour TTLs.
