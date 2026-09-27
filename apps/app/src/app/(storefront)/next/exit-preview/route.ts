import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getSafeRedirect } from "payload/shared";

export const GET: (req?: NextRequest) => Promise<Response> = async (
  req?: NextRequest
): Promise<Response> => {
  const draft = await draftMode();
  draft.disable();

  if (req) {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");

    if (path) {
      const safePath = getSafeRedirect({ fallbackTo: "", redirectTo: path });
      if (safePath) {
        redirect(safePath);
      }
    }
  }

  return new Response("Draft mode is disabled");
};
