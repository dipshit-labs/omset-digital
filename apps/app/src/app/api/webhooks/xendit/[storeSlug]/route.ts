import configPromise from "@payload-config";
import { processIncomingWebhook } from "@repo/payload-plugin-commerce/webhooks";
import type { WebhookPayloadClient } from "@repo/payload-plugin-commerce/webhooks";
import type { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import type { Payload } from "payload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface WebhookRouteContext {
  params: Promise<{ storeSlug: string }>;
}

export type WebhookPayloadProvider = () => Promise<
  Payload | WebhookPayloadClient
>;

const defaultGetPayload: WebhookPayloadProvider = () =>
  getPayload({ config: configPromise });

export type WebhookRouteHandler = (
  req: NextRequest,
  context: WebhookRouteContext
) => Promise<NextResponse>;

export const createXenditWebhookHandler =
  (
    getPayloadClient: WebhookPayloadProvider = defaultGetPayload
  ): WebhookRouteHandler =>
  async (
    req: NextRequest,
    context: WebhookRouteContext
  ): Promise<NextResponse> => {
    const { storeSlug } = await context.params;
    const payload = await getPayloadClient();
    return processIncomingWebhook({
      payload,
      provider: "xendit",
      req,
      storeSlug,
    });
  };

export const POST: WebhookRouteHandler = createXenditWebhookHandler();
