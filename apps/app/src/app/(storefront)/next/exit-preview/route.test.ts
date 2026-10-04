import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

interface RedirectError extends Error {
  digest: string;
}

const mockDraftDisable = vi.fn<() => void>();

vi.mock(import("next/headers"), () => ({
  draftMode: vi.fn<
    () => Promise<{
      disable: () => void;
      enable: () => void;
      isEnabled: boolean;
    }>
  >(() =>
    Promise.resolve({
      disable: mockDraftDisable,
      enable: vi.fn<() => void>(),
      isEnabled: false,
    })
  ),
}));

const mockRedirect = vi.fn<(url: string) => never>((url: string) => {
  // SAFETY: Next.js internal redirect error structure uses digest property
  const error = new Error(`NEXT_REDIRECT: ${url}`) as RedirectError;
  error.digest = `NEXT_REDIRECT;replace;${url};307;;`;
  throw error;
});

vi.mock(import("next/navigation"), () => ({
  redirect: (url: string) => mockRedirect(url),
}));
describe("GET /next/exit-preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disables draft mode and returns confirmation text when no path is provided", async () => {
    const req = new NextRequest("http://localhost:3000/next/exit-preview");

    const res = await GET(req);

    expect(mockDraftDisable).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe("Draft mode is disabled");
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("disables draft mode and works when called without request parameter", async () => {
    const res = await GET();

    expect(mockDraftDisable).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe("Draft mode is disabled");
  });

  it("disables draft mode and redirects to safePath when path query param is provided", async () => {
    const req = new NextRequest(
      "http://localhost:3000/next/exit-preview?path=%2Fwarung-kopi"
    );

    await expect(GET(req)).rejects.toThrow("NEXT_REDIRECT: /warung-kopi");

    expect(mockDraftDisable).toHaveBeenCalledOnce();
    expect(mockRedirect).toHaveBeenCalledWith("/warung-kopi");
  });

  it("does not redirect to open redirect external URLs and falls back to confirmation response", async () => {
    const req = new NextRequest(
      "http://localhost:3000/next/exit-preview?path=https%3A%2F%2Fevil.com"
    );

    const res = await GET(req);

    expect(mockDraftDisable).toHaveBeenCalledOnce();
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe("Draft mode is disabled");
  });
});
