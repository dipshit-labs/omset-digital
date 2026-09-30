import configPromise from "@payload-config";
import type { MidtransWebhookPayload } from "@repo/commerce-adapters/payments";
import { verifyMidtransSignature } from "@repo/commerce-adapters/payments";
import { decryptCredential, isCiphertext } from "@repo/commerce-adapters/utils";
import type { PaymentStatus } from "@repo/payload-plugin-commerce/hooks";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

import { env } from "@/env";

export interface WebhookRouteParams {
  storeSlug: string;
}

export interface WebhookRouteContext {
  params: Promise<WebhookRouteParams>;
}

export interface WebhookStoreDoc {
  activePaymentProvider?: string;
  id: number;
}

export interface WebhookCredentialsDoc {
  midtrans?: {
    serverKey?: string | null;
  };
}

export interface WebhookOrderDoc {
  id: number;
  paymentStatus?: string;
  store?: { id: number } | number;
}

export interface WebhookPayloadQueryArgs {
  collection: string;
  depth?: number;
  limit?: number;
  overrideAccess?: boolean;
  where?: unknown;
}

export interface WebhookOrderUpdateData {
  midtrans?: {
    grossAmount?: string;
    paymentType?: string;
    settlementTime?: string;
    transactionId?: string;
  };
  paymentStatus: PaymentStatus;
}

export interface WebhookPayloadClient {
  find: (args: WebhookPayloadQueryArgs) => Promise<{ docs: unknown[] }>;
  findByID?: (args: {
    collection: string;
    id: number | string;
    overrideAccess?: boolean;
  }) => Promise<unknown>;
  secret?: string;
  update: (args: {
    collection: string;
    data: WebhookOrderUpdateData;
    id: number | string;
    overrideAccess?: boolean;
  }) => Promise<unknown>;
}

export type MidtransWebhookRouteHandler = (
  req: NextRequest,
  context: WebhookRouteContext
) => Promise<NextResponse>;

const defaultGetPayload = async (): Promise<WebhookPayloadClient> => {
  const payload = await getPayload({ config: configPromise });
  // SAFETY: Payload client satisfies WebhookPayloadClient interface for collection operations.
  return payload as WebhookPayloadClient;
};

/**
 * Maps Midtrans transaction_status and fraud_status to canonical payment statuses:
 * pending -> paid | expired | failed | cancelled
 */
export const mapMidtransTransactionStatus = (params: {
  fraudStatus?: string;
  transactionStatus: string;
}): PaymentStatus | null => {
  switch (params.transactionStatus) {
    case "capture": {
      return params.fraudStatus === "challenge" ? "pending" : "paid";
    }
    case "settlement": {
      return "paid";
    }
    case "pending": {
      return "pending";
    }
    case "deny":
    case "failure": {
      return "failed";
    }
    case "expire": {
      return "expired";
    }
    case "cancel": {
      return "cancelled";
    }
    default: {
      return null;
    }
  }
};

interface ValidatedBodyResult {
  body?: MidtransWebhookPayload;
  error?: string;
}

const parseAndValidateWebhookBody = (rawBody: string): ValidatedBodyResult => {
  let body: MidtransWebhookPayload;
  try {
    // SAFETY: Parsing untrusted raw body text, immediately validated below.
    body = JSON.parse(rawBody) as MidtransWebhookPayload;
  } catch {
    return { error: "Invalid JSON body" };
  }

  const orderId = body.order_id ? String(body.order_id) : "";
  const statusCode = body.status_code ? String(body.status_code) : "";
  const grossAmount = body.gross_amount ? String(body.gross_amount) : "";
  const signatureKey = body.signature_key ? String(body.signature_key) : "";

  if (!orderId || !statusCode || !grossAmount || !signatureKey) {
    return { error: "Missing required signature fields" };
  }

  return { body };
};

interface ResolvedServerKeyResult {
  error?: string;
  serverKey?: string;
  status?: number;
  store?: WebhookStoreDoc;
}

const resolveStoreAndServerKey = async (
  payload: WebhookPayloadClient,
  storeSlug: string
): Promise<ResolvedServerKeyResult> => {
  // 1. Resolve tenant store via Payload Local API with overrideAccess: true
  const storeResult = await payload.find({
    collection: "stores",
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { slug: { equals: storeSlug } },
  });

  // SAFETY: Stores collection find returns WebhookStoreDoc records.
  const store = storeResult.docs[0] as WebhookStoreDoc | undefined;
  if (!store) {
    return { error: "Store not found", status: 404 };
  }

  // 2. Reject requests if store.activePaymentProvider !== 'midtrans'
  if (store.activePaymentProvider !== "midtrans") {
    return {
      error: "Midtrans is not active for this store",
      status: 400,
    };
  }

  // 3. Resolve merchant credentials from storeCredentials via overrideAccess: true
  const credentialsResult = await payload.find({
    collection: "storeCredentials",
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { store: { equals: store.id } },
  });

  // SAFETY: storeCredentials collection find returns WebhookCredentialsDoc records.
  const credentials = credentialsResult.docs[0] as
    | WebhookCredentialsDoc
    | undefined;

  const encryptedServerKey = credentials?.midtrans?.serverKey;
  if (!encryptedServerKey) {
    return {
      error: "Midtrans credentials not configured",
      status: 400,
    };
  }

  const secret = payload.secret || env.PAYLOAD_SECRET;
  const serverKey = isCiphertext(encryptedServerKey)
    ? decryptCredential(encryptedServerKey, secret)
    : encryptedServerKey;

  return { serverKey, store };
};

interface OrderLookupCondition {
  id?: { equals: number };
  orderNumber?: { equals: string };
}

interface ResolvedOrderResult {
  error?: string;
  orderDoc?: WebhookOrderDoc;
  status?: number;
}

const resolveAndVerifyOrder = async (
  payload: WebhookPayloadClient,
  orderId: string,
  storeId: number
): Promise<ResolvedOrderResult> => {
  const conditions: OrderLookupCondition[] = [
    { orderNumber: { equals: orderId } },
  ];

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

  // SAFETY: Orders query returns WebhookOrderDoc records.
  const orderDoc = ordersResult.docs[0] as WebhookOrderDoc | undefined;

  if (!orderDoc) {
    return { error: "Order not found", status: 404 };
  }

  return { orderDoc };
};

export const createMidtransWebhookHandler =
  (
    getPayloadClient: () => Promise<WebhookPayloadClient> = defaultGetPayload
  ): MidtransWebhookRouteHandler =>
  async (req, context) => {
    // 1. Next.js 15 route handler awaits params asynchronously
    const { storeSlug } = await context.params;

    // 2. Consume raw body text once
    const rawBody = await req.text();
    const { body, error: bodyError } = parseAndValidateWebhookBody(rawBody);
    if (bodyError || !body) {
      return NextResponse.json({ error: bodyError }, { status: 400 });
    }

    const payload = await getPayloadClient();

    // 3. Resolve tenant store and merchant serverKey
    const {
      error: credsError,
      serverKey,
      status: credsStatus,
      store,
    } = await resolveStoreAndServerKey(payload, storeSlug);

    if (credsError || !serverKey || !store) {
      return NextResponse.json(
        { error: credsError },
        { status: credsStatus ?? 400 }
      );
    }

    // 4. Verify SHA-512 signature preserving unmodified decimal string gross_amount
    const isSignatureValid = verifyMidtransSignature(
      {
        gross_amount: String(body.gross_amount),
        order_id: String(body.order_id),
        signature_key: String(body.signature_key),
        status_code: String(body.status_code),
      },
      serverKey
    );

    if (!isSignatureValid) {
      return NextResponse.json(
        { error: "Invalid Midtrans signature" },
        { status: 401 }
      );
    }

    // 5. Resolve order and verify store scoping
    const {
      error: orderError,
      orderDoc,
      status: orderStatus,
    } = await resolveAndVerifyOrder(payload, String(body.order_id), store.id);

    if (orderError || !orderDoc) {
      return NextResponse.json(
        { error: orderError },
        { status: orderStatus ?? 404 }
      );
    }

    // 6. Map Midtrans status to canonical payment status and update order
    const canonicalStatus = mapMidtransTransactionStatus({
      fraudStatus: body.fraud_status,
      transactionStatus: body.transaction_status,
    });

    if (!canonicalStatus) {
      return NextResponse.json(
        {
          error: `Unhandled Midtrans transaction status: ${body.transaction_status}`,
        },
        { status: 400 }
      );
    }
    try {
      await payload.update({
        collection: "orders",
        id: orderDoc.id,
        overrideAccess: true,
        data: {
          paymentStatus: canonicalStatus,
          midtrans: {
            grossAmount: body.gross_amount,
            paymentType: body.payment_type,
            settlementTime: body.settlement_time,
            transactionId: body.transaction_id,
          },
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update order";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({
      orderId: body.order_id,
      paymentStatus: canonicalStatus,
      status: "OK",
    });
  };

export const POST: MidtransWebhookRouteHandler = createMidtransWebhookHandler();
