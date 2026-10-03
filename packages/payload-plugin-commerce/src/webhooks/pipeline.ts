import type {
  ParsedWebhookEvent,
  PaymentMetadata,
  PaymentProvider,
  PaymentStatus,
} from "@repo/commerce-adapters/payments";
import {
  MidtransClient,
  PaymentWebhookError,
  XenditClient,
} from "@repo/commerce-adapters/payments";
import { decryptCredential, isCiphertext } from "@repo/commerce-adapters/utils";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Payload, Where } from "payload";

export const SUPPORTED_PAYMENT_PROVIDERS = ["midtrans", "xendit"] as const;

export type SupportedPaymentProvider =
  (typeof SUPPORTED_PAYMENT_PROVIDERS)[number];

export const isSupportedPaymentProvider = (
  provider: unknown
): provider is SupportedPaymentProvider =>
  typeof provider === "string" &&
  // SAFETY: Upcasting readonly tuple to readonly string[] allows Array.prototype.includes to evaluate arbitrary runtime string inputs.
  (SUPPORTED_PAYMENT_PROVIDERS as readonly string[]).includes(provider);

export interface WebhookPayloadClient {
  find: (args: {
    collection: string;
    depth?: number;
    limit?: number;
    overrideAccess?: boolean;
    where?: unknown;
  }) => Promise<{ docs: unknown[] }>;
  secret?: string;
  update: (args: {
    collection: string;
    data: unknown;
    id: number | string;
    overrideAccess?: boolean;
  }) => Promise<unknown>;
}

export interface ProcessIncomingWebhookArgs {
  payload: Payload | WebhookPayloadClient;
  provider: SupportedPaymentProvider;
  req: NextRequest;
  secret?: string;
  storeSlug: string;
}

interface StoreDoc {
  activePaymentProvider?: SupportedPaymentProvider | string | null;
  id: number | string;
  slug?: string;
}

interface StoreCredentialsDoc {
  midtrans?: {
    clientKey?: string;
    isProduction?: boolean;
    serverKey?: string | null;
  };
  store?: number | string;
  xendit?: {
    isProduction?: boolean;
    secretKey?: string | null;
    webhookToken?: string | null;
  };
}

interface OrderDoc {
  id: number | string;
  orderNumber?: string;
  paymentMetadata?: PaymentMetadata | null;
  paymentStatus?: PaymentStatus;
  store?: { id: number | string } | number | string;
}

type StoreResolution =
  | { error: string; status: number; success: false }
  | { store: StoreDoc; success: true };

type AdapterResolution =
  | { error: string; status: number; success: false }
  | { adapter: PaymentProvider; success: true; verificationSecret?: string };

type OrderResolution =
  | { error: string; status: number; success: false }
  | { orderDoc: OrderDoc; success: true };

const TERMINAL_PAYMENT_STATUSES = new Set<string>([
  "cancelled",
  "expired",
  "failed",
  "paid",
]);

/**
 * Resolves a sensitive credential string: decrypts versioned AES-256-GCM ciphertext
 * or returns plaintext string as-is. Returns undefined if input is null, undefined, or
 * if decryption fails.
 */
export const resolveCredential = (
  encryptedOrPlaintext: string | null | undefined,
  secret: string
): string | undefined => {
  if (!encryptedOrPlaintext) {
    return undefined;
  }
  if (isCiphertext(encryptedOrPlaintext)) {
    try {
      return decryptCredential(encryptedOrPlaintext, secret);
    } catch {
      return undefined;
    }
  }
  return encryptedOrPlaintext;
};

const resolveTenantStore = async (
  payload: Payload | WebhookPayloadClient,
  storeSlug: string,
  provider: SupportedPaymentProvider
): Promise<StoreResolution> => {
  const storeResult = await payload.find({
    collection: "stores",
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { slug: { equals: storeSlug } },
  });

  // SAFETY: Stores collection find with depth 0 returns store records matching StoreDoc shape.
  const [store] = storeResult.docs as (StoreDoc | undefined)[];
  if (!store) {
    return { error: "Store not found", status: 404, success: false };
  }

  if (store.activePaymentProvider !== provider) {
    return {
      error: `${provider} is not active for this store`,
      status: 400,
      success: false,
    };
  }

  return { store, success: true };
};

const createMidtransAdapter = (
  credentialsDoc: StoreCredentialsDoc,
  secret: string
): AdapterResolution => {
  const rawServerKey = credentialsDoc.midtrans?.serverKey;
  const decryptedServerKey = resolveCredential(rawServerKey, secret);
  if (!decryptedServerKey) {
    return {
      error: "Midtrans credentials not configured",
      status: 400,
      success: false,
    };
  }

  const adapter = new MidtransClient({
    clientKey: credentialsDoc.midtrans?.clientKey,
    isProduction: credentialsDoc.midtrans?.isProduction,
    serverKey: decryptedServerKey,
  });

  return { adapter, success: true, verificationSecret: decryptedServerKey };
};

const createXenditAdapter = (
  credentialsDoc: StoreCredentialsDoc,
  secret: string
): AdapterResolution => {
  const rawSecretKey = credentialsDoc.xendit?.secretKey;
  const rawWebhookToken = credentialsDoc.xendit?.webhookToken;

  const decryptedSecretKey = resolveCredential(rawSecretKey, secret);
  const decryptedWebhookToken = resolveCredential(rawWebhookToken, secret);

  if (!decryptedSecretKey && !decryptedWebhookToken) {
    return {
      error: "Xendit credentials not configured",
      status: 400,
      success: false,
    };
  }

  const adapter = new XenditClient({
    isProduction: credentialsDoc.xendit?.isProduction,
    secretKey: decryptedSecretKey ?? "",
    webhookToken: decryptedWebhookToken,
  });

  return {
    adapter,
    success: true,
    verificationSecret: decryptedWebhookToken,
  };
};

const resolveProviderAdapter = async (
  payload: Payload | WebhookPayloadClient,
  storeId: number | string,
  provider: SupportedPaymentProvider,
  secret: string
): Promise<AdapterResolution> => {
  const credentialsResult = await payload.find({
    collection: "storeCredentials",
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { store: { equals: storeId } },
  });

  // SAFETY: StoreCredentials collection find returns records matching StoreCredentialsDoc shape.
  const [credentialsDoc] = credentialsResult.docs as (
    | StoreCredentialsDoc
    | undefined
  )[];

  const providerDisplayName = provider === "midtrans" ? "Midtrans" : "Xendit";

  if (!credentialsDoc) {
    return {
      error: `${providerDisplayName} credentials not configured`,
      status: 400,
      success: false,
    };
  }

  if (provider === "midtrans") {
    return createMidtransAdapter(credentialsDoc, secret);
  }

  return createXenditAdapter(credentialsDoc, secret);
};

const resolveStoreOrder = async (
  payload: Payload | WebhookPayloadClient,
  storeId: number | string,
  orderId: string
): Promise<OrderResolution> => {
  const conditions: Where[] = [{ orderNumber: { equals: orderId } }];

  if (/^\d+$/u.test(orderId)) {
    conditions.push({ id: { equals: Number(orderId) } });
  }

  const ordersResult = await payload.find({
    collection: "orders",
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: {
      and: [{ store: { equals: storeId } }, { or: conditions }],
    },
  });

  // SAFETY: Orders collection query returns matching records conforming to OrderDoc shape.
  const [orderDoc] = ordersResult.docs as (OrderDoc | undefined)[];
  if (!orderDoc) {
    return { error: "Order not found", status: 404, success: false };
  }

  return { orderDoc, success: true };
};

const updateOrderPayment = async (
  payload: Payload | WebhookPayloadClient,
  orderDoc: OrderDoc,
  parsedEvent: ParsedWebhookEvent,
  provider: SupportedPaymentProvider
): Promise<{ error?: string; status?: number }> => {
  const existingMetadata: PaymentMetadata =
    typeof orderDoc.paymentMetadata === "object" &&
    orderDoc.paymentMetadata !== null &&
    !Array.isArray(orderDoc.paymentMetadata)
      ? orderDoc.paymentMetadata
      : {};

  const updatedMetadata: PaymentMetadata = {
    ...existingMetadata,
    ...parsedEvent.metadata,
    provider,
  };

  if (parsedEvent.providerEventId) {
    updatedMetadata.providerEventId = parsedEvent.providerEventId;
  }

  try {
    await payload.update({
      collection: "orders",
      id: orderDoc.id,
      overrideAccess: true,
      data: {
        paymentMetadata: updatedMetadata,
        paymentStatus: parsedEvent.paymentStatus,
      },
    });
    return {};
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update order";
    return { error: message, status: 500 };
  }
};

export const processIncomingWebhook = async ({
  payload,
  provider,
  req,
  secret,
  storeSlug,
}: ProcessIncomingWebhookArgs): Promise<NextResponse> => {
  // 1. Resolve tenant store and verify provider is active
  const storeResolution = await resolveTenantStore(
    payload,
    storeSlug,
    provider
  );
  if (!storeResolution.success) {
    return NextResponse.json(
      { error: storeResolution.error },
      { status: storeResolution.status }
    );
  }

  // 2. Resolve credentials and adapter
  const encryptionSecret = secret || payload.secret || "";
  const adapterResolution = await resolveProviderAdapter(
    payload,
    storeResolution.store.id,
    provider,
    encryptionSecret
  );

  if (!adapterResolution.success) {
    return NextResponse.json(
      { error: adapterResolution.error },
      { status: adapterResolution.status }
    );
  }

  // 3. Ingest raw body text and parse webhook
  const rawBody = await req.text();
  let parsedEvent: ParsedWebhookEvent;
  try {
    parsedEvent = await adapterResolution.adapter.parseWebhook({
      headers: req.headers,
      rawBody,
      secret: adapterResolution.verificationSecret,
    });
  } catch (error) {
    if (error instanceof PaymentWebhookError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to parse webhook";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // 4. Resolve store-scoped order
  const orderResolution = await resolveStoreOrder(
    payload,
    storeResolution.store.id,
    parsedEvent.orderId
  );

  if (!orderResolution.success) {
    return NextResponse.json(
      { error: orderResolution.error },
      { status: orderResolution.status }
    );
  }

  const { orderDoc } = orderResolution;

  // 5. Enforce idempotency: If order is already terminal, return 200 OK without mutation
  if (
    orderDoc.paymentStatus &&
    TERMINAL_PAYMENT_STATUSES.has(orderDoc.paymentStatus)
  ) {
    console.info(
      `[webhook] Order ${orderDoc.id} is already in terminal payment status: "${orderDoc.paymentStatus}". Skipping mutation.`
    );
    return NextResponse.json({
      message: "Order is already in terminal state",
      orderId: parsedEvent.orderId,
      paymentStatus: orderDoc.paymentStatus,
      status: "OK",
    });
  }

  // 6. Persist paymentStatus and paymentMetadata
  const updateResult = await updateOrderPayment(
    payload,
    orderDoc,
    parsedEvent,
    provider
  );

  if (updateResult.error) {
    return NextResponse.json(
      { error: updateResult.error },
      { status: updateResult.status ?? 500 }
    );
  }

  return NextResponse.json({
    orderId: parsedEvent.orderId,
    paymentStatus: parsedEvent.paymentStatus,
    status: "OK",
  });
};
