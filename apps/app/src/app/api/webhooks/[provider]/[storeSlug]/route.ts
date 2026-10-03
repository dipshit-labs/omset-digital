import configPromise from "@payload-config";
import {
  isSupportedPaymentProvider,
  processIncomingWebhook,
} from "@repo/payload-plugin-commerce/webhooks";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPayload } from "payload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface WebhookRouteContext {
  params: Promise<{ provider: string; storeSlug: string }>;
}

export const POST = async (
  req: NextRequest,
  context: WebhookRouteContext
): Promise<NextResponse> => {
  const { provider: rawProvider, storeSlug } = await context.params;
  const provider = rawProvider.toLowerCase();

  if (!isSupportedPaymentProvider(provider)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const payload = await getPayload({ config: configPromise });

  return processIncomingWebhook({
    payload,
    provider,
    req,
    storeSlug,
  });
};
