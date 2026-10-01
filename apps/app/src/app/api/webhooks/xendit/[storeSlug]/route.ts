import configPromise from "@payload-config";
import type { XenditWebhookPayload } from "@repo/commerce-adapters/payments";
import {
  verifyXenditCallbackToken,
  verifyXenditHmacSignature,
} from "@repo/commerce-adapters/payments";
import { decryptCredential, isCiphertext } from "@repo/commerce-adapters/utils";
import type { PaymentStatus } from "@repo/payload-plugin-commerce/hooks";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

import { env } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  xendit?: {
    isProduction?: boolean;
    secretKey?: string | null;
    webhookToken?: string | null;
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
  paymentStatus: PaymentStatus;
  xendit?: {
    amount?: number;
    externalId?: string;
    invoiceId?: string;
    paidAt?: string;
    paymentChannel?: string;
    paymentMethod?: string;
    status?: string;
  };
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

export type XenditWebhookRouteHandler = (
  req: NextRequest,
  context: WebhookRouteContext
) => Promise<NextResponse>;

const defaultGetPayload = async (): Promise<WebhookPayloadClient> => {
  const payload = await getPayload({ config: configPromise });
  // SAFETY: Payload client satisfies WebhookPayloadClient interface for collection operations.
  return payload as WebhookPayloadClient;
};

/**
 * Maps Xendit invoice or payment status to canonical payment statuses:
 * pending -> paid | expired | failed | cancelled
 */
export const mapXenditInvoiceStatus = (
  status?: string
): PaymentStatus | null => {
  if (!status) {
    return null;
  }

  const normalized = status.toUpperCase().trim();

  switch (normalized) {
    case "PAID":
    case "SETTLED":
    case "SUCCEEDED": {
      return "paid";
    }
    case "PENDING": {
      return "pending";
    }
    case "EXPIRED": {
      return "expired";
    }
    case "FAILED": {
      return "failed";
    }
    case "CANCELLED":
    case "CANCELED": {
      return "cancelled";
    }
    default: {
      return null;
    }
  }
};

interface ValidatedBodyResult {
  body?: XenditWebhookPayload;
  error?: string;
}

const parseAndValidateWebhookBody = (rawBody: string): ValidatedBodyResult => {
  if (!rawBody || !rawBody.trim()) {
    return { error: "Empty payload" };
  }

  let body: XenditWebhookPayload;
  try {
    // SAFETY: Parsing untrusted raw body text, immediately validated below.
    body = JSON.parse(rawBody) as XenditWebhookPayload;
  } catch {
    return { error: "Invalid JSON body" };
  }

  return { body };
};

interface ResolvedCredentialsResult {
  error?: string;
  secretKey?: string;
  status?: number;
  store?: WebhookStoreDoc;
  webhookToken?: string;
}

const resolveStoreAndXenditCredentials = async (
  payload: WebhookPayloadClient,
  storeSlug: string
): Promise<ResolvedCredentialsResult> => {
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

  // 2. Reject requests if store.activePaymentProvider !== 'xendit'
  if (store.activePaymentProvider !== "xendit") {
    return {
      error: "Xendit is not active for this store",
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

  const encryptedWebhookToken = credentials?.xendit?.webhookToken;
  const encryptedSecretKey = credentials?.xendit?.secretKey;

  if (!encryptedWebhookToken && !encryptedSecretKey) {
    return {
      error: "Xendit credentials not configured",
      status: 400,
    };
  }

  const secret = payload.secret || env.PAYLOAD_SECRET;

  let webhookToken: string | undefined;
  if (encryptedWebhookToken) {
    webhookToken = isCiphertext(encryptedWebhookToken)
      ? decryptCredential(encryptedWebhookToken, secret)
      : encryptedWebhookToken;
  }

  let secretKey: string | undefined;
  if (encryptedSecretKey) {
    secretKey = isCiphertext(encryptedSecretKey)
      ? decryptCredential(encryptedSecretKey, secret)
      : encryptedSecretKey;
  }

  return { secretKey, store, webhookToken };
};

interface WebhookAuthVerificationResult {
  error?: string;
  status?: number;
}

const verifyInboundWebhookAuth = (
  req: NextRequest,
  rawBody: string,
  creds: { webhookToken?: string }
): WebhookAuthVerificationResult => {
  const signatureHeader = req.headers.get("x-callback-signature");
  const tokenHeader = req.headers.get("x-callback-token");

  if (signatureHeader) {
    if (!creds.webhookToken) {
      return {
        error: "Xendit webhook token not configured for store",
        status: 400,
      };
    }

    const isValid = verifyXenditHmacSignature(
      rawBody,
      signatureHeader,
      creds.webhookToken
    );
    if (!isValid) {
      return { error: "Invalid Xendit HMAC signature", status: 401 };
    }
    return {};
  }

  if (tokenHeader) {
    if (!creds.webhookToken) {
      return {
        error: "Xendit webhook token not configured for store",
        status: 400,
      };
    }

    const isValid = verifyXenditCallbackToken(tokenHeader, creds.webhookToken);
    if (!isValid) {
      return { error: "Invalid Xendit callback token", status: 401 };
    }
    return {};
  }

  return { error: "Missing Xendit verification headers", status: 401 };
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

const extractExternalId = (body: XenditWebhookPayload): string => {
  if (body.external_id) {
    return body.external_id;
  }
  if (body.data?.reference_id) {
    return body.data.reference_id;
  }
  if (body.data?.external_id) {
    return body.data.external_id;
  }
  return "";
};

const extractRawStatus = (body: XenditWebhookPayload): string => {
  if (body.status) {
    return body.status;
  }
  if (body.data?.status) {
    return body.data.status;
  }
  return "";
};

const buildXenditOrderDetails = (
  body: XenditWebhookPayload,
  externalId: string,
  rawStatus: string
) => {
  let resolvedAmount: number | undefined;
  if (typeof body.amount === "number") {
    resolvedAmount = body.amount;
  } else if (typeof body.paid_amount === "number") {
    resolvedAmount = body.paid_amount;
  }

  return {
    amount: resolvedAmount,
    externalId,
    invoiceId: typeof body.id === "string" ? body.id : undefined,
    paidAt: typeof body.paid_at === "string" ? body.paid_at : undefined,
    status: rawStatus,
    paymentChannel:
      typeof body.payment_channel === "string"
        ? body.payment_channel
        : undefined,
    paymentMethod:
      typeof body.payment_method === "string" ? body.payment_method : undefined,
  };
};

const updateOrderPaymentStatus = async (
  payload: WebhookPayloadClient,
  orderDocId: number,
  canonicalStatus: PaymentStatus,
  xenditDetails: WebhookOrderUpdateData["xendit"]
): Promise<{ error?: string }> => {
  try {
    await payload.update({
      collection: "orders",
      id: orderDocId,
      overrideAccess: true,
      data: {
        paymentStatus: canonicalStatus,
        xendit: xenditDetails,
      },
    });
    return {};
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update order";
    return { error: message };
  }
};

export const createXenditWebhookHandler =
  (
    getPayloadClient: () => Promise<WebhookPayloadClient> = defaultGetPayload
  ): XenditWebhookRouteHandler =>
  async (req, context) => {
    // 1. Next.js 15 route handler awaits params asynchronously
    const { storeSlug } = await context.params;

    // 2. Consume raw body text once
    const rawBody = await req.text();

    const payload = await getPayloadClient();

    // 3. Resolve tenant store and merchant credentials via Payload Local API with overrideAccess: true
    const {
      error: credsError,
      status: credsStatus = 400,
      store,
      webhookToken,
    } = await resolveStoreAndXenditCredentials(payload, storeSlug);

    if (credsError || !store) {
      return NextResponse.json({ error: credsError }, { status: credsStatus });
    }

    // 4. Verify inbound request using either x-callback-signature or x-callback-token before body parsing
    const authResult = verifyInboundWebhookAuth(req, rawBody, {
      webhookToken,
    });
    if (authResult.error) {
      const authStatus = authResult.status ?? 401;
      return NextResponse.json(
        { error: authResult.error },
        { status: authStatus }
      );
    }

    // 5. Parse and validate JSON payload from raw body
    const { body, error: bodyError } = parseAndValidateWebhookBody(rawBody);
    if (bodyError || !body) {
      return NextResponse.json({ error: bodyError }, { status: 400 });
    }
    // 6. Extract external_id and status from payload
    const externalId = extractExternalId(body);
    if (!externalId) {
      return NextResponse.json(
        { error: "Missing external_id in payload" },
        { status: 400 }
      );
    }

    // 7. Resolve order and verify store scoping
    const {
      error: orderError,
      orderDoc,
      status: orderStatus = 404,
    } = await resolveAndVerifyOrder(payload, externalId, store.id);

    if (orderError || !orderDoc) {
      return NextResponse.json({ error: orderError }, { status: orderStatus });
    }

    // 8. Map Xendit status to canonical payment status and update order
    const rawStatus = extractRawStatus(body);
    const canonicalStatus = mapXenditInvoiceStatus(rawStatus);

    if (!canonicalStatus) {
      return NextResponse.json(
        { error: `Unhandled Xendit status: ${rawStatus}` },
        { status: 400 }
      );
    }

    const updateResult = await updateOrderPaymentStatus(
      payload,
      orderDoc.id,
      canonicalStatus,
      buildXenditOrderDetails(body, externalId, rawStatus)
    );

    if (updateResult.error) {
      return NextResponse.json({ error: updateResult.error }, { status: 400 });
    }

    return NextResponse.json({
      orderId: externalId,
      paymentStatus: canonicalStatus,
      status: "OK",
    });
  };

export const POST: XenditWebhookRouteHandler = createXenditWebhookHandler();
