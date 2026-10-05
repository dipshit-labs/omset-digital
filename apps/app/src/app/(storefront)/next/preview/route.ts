import type { NextRequest } from "next/server";
import type { Payload } from "payload";
import type { User } from "@repo/types";

import configPromise from "@payload-config";
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { getSafeRedirect } from "payload/shared";

import { env } from "@/env";
import { isSuperAdmin } from "@/payload/access/isSuperAdmin";
import { getUserStoreIDs } from "@/payload/lib/ids";

interface ResolvedTargetStore {
  isExplicit: boolean;
  slug: string;
}

const resolveTargetStore = (
  searchParams: URLSearchParams,
  safePath: string
): ResolvedTargetStore | null => {
  const directParam =
    searchParams.get("store") ?? searchParams.get("storeSlug");
  if (directParam) {
    return { isExplicit: true, slug: directParam };
  }

  try {
    const parsedUrl = new URL(safePath, "http://localhost");
    const safeParam =
      parsedUrl.searchParams.get("store") ??
      parsedUrl.searchParams.get("storeSlug");

    if (safeParam) {
      return { isExplicit: true, slug: safeParam };
    }
  } catch {
    // Ignore URL parse failures for relative paths
  }

  const [pathname] = safePath.split("?");
  const segments = (pathname ?? "").split("/").filter(Boolean);
  if (segments.length > 0 && segments[0] !== "next") {
    return { isExplicit: false, slug: segments[0] ?? "" };
  }

  return null;
};

const buildPreviewRedirectUrl = (
  safePath: string,
  storeSlug?: string | null
): string => {
  const [pathnamePart, queryPart] = safePath.split("?");
  const pathname = pathnamePart ?? "/";
  const params = new URLSearchParams(queryPart ?? "");

  let normalizedPath = pathname;

  if (storeSlug) {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0 && segments[0] === storeSlug) {
      const rest = segments.slice(1).join("/");
      normalizedPath = rest ? `/${rest}` : "/";
    }

    if (!params.has("store") && !params.has("storeSlug")) {
      params.set("store", storeSlug);
    }
  }

  const queryString = params.toString();
  return queryString ? `${normalizedPath}?${queryString}` : normalizedPath;
};
export interface PreviewLoggerErrorData {
  err?: unknown;
}

export interface PreviewPayloadLogger {
  error: (data: PreviewLoggerErrorData, message: string) => void;
}

export type PreviewPayloadClient = Pick<Payload, "auth" | "find"> & {
  logger: PreviewPayloadLogger;
};
const defaultGetPayload = (): Promise<PreviewPayloadClient> =>
  getPayload({ config: configPromise });

export const createPreviewHandler =
  (
    getPayloadClient: () => Promise<PreviewPayloadClient> = defaultGetPayload
  ): ((req: NextRequest) => Promise<Response>) =>
  async (req: NextRequest): Promise<Response> => {
    const { searchParams } = new URL(req.url);

    const path = searchParams.get("path");
    const previewSecret = searchParams.get("previewSecret");

    if (!previewSecret || previewSecret !== env.PREVIEW_SECRET) {
      return new Response("You are not allowed to preview this page", {
        status: 403,
      });
    }

    if (!path) {
      return new Response("Insufficient search params", { status: 404 });
    }

    const safePath = getSafeRedirect({ fallbackTo: "", redirectTo: path });

    if (!safePath) {
      return new Response(
        "This endpoint can only be used for relative previews",
        { status: 500 }
      );
    }

    const payload = await getPayloadClient();

    let user: User | null = null;
    try {
      const authResult = await payload.auth({
        headers: req.headers,
      });
      // SAFETY: Auth result user conforms to User schema from @repo/types
      user = (authResult.user as User | null) ?? null;
    } catch (error) {
      const draft = await draftMode();
      draft.disable();
      payload.logger.error(
        { err: error },
        "Error verifying token for live preview"
      );

      return new Response("You are not allowed to preview this page", {
        status: 403,
      });
    }

    const draft = await draftMode();

    if (!user) {
      draft.disable();
      return new Response("You are not allowed to preview this page", {
        status: 403,
      });
    }

    const targetStore = resolveTargetStore(searchParams, safePath);
    let resolvedStoreSlug: string | null = targetStore?.slug ?? null;

    if (!isSuperAdmin(user)) {
      if (targetStore) {
        const storeRes = await payload.find({
          collection: "stores",
          depth: 0,
          limit: 1,
          where: {
            slug: { equals: targetStore.slug },
          },
        });

        const [store] = storeRes.docs;

        if (store) {
          const allowedStoreIDs = getUserStoreIDs(user);

          if (!allowedStoreIDs.includes(store.id)) {
            draft.disable();
            return new Response("You are not allowed to preview this page", {
              status: 403,
            });
          }

          resolvedStoreSlug = store.slug;
        } else if (targetStore.isExplicit) {
          draft.disable();
          return new Response("Store not found", { status: 404 });
        } else {
          const allowedStoreIDs = getUserStoreIDs(user);

          if (allowedStoreIDs.length === 0) {
            draft.disable();
            return new Response("You are not allowed to preview this page", {
              status: 403,
            });
          }

          resolvedStoreSlug = null;
        }
      } else {
        const allowedStoreIDs = getUserStoreIDs(user);

        if (allowedStoreIDs.length === 0) {
          draft.disable();
          return new Response("You are not allowed to preview this page", {
            status: 403,
          });
        }
      }
    }

    draft.enable();

    const destination = buildPreviewRedirectUrl(safePath, resolvedStoreSlug);
    redirect(destination);
  };

export const GET: (req: NextRequest) => Promise<Response> =
  createPreviewHandler();
