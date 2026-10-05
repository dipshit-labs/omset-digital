import type { PreviewLoggerErrorData, PreviewPayloadClient } from "./route";
import type { Store, User } from "@repo/types";

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { env } from "@/env";
import { createPreviewHandler } from "./route";

interface RedirectError extends Error {
  digest: string;
}

const mockDraftEnable = vi.fn<() => void>();
const mockDraftDisable = vi.fn<() => void>();
let mockDraftIsEnabled = false;

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
      enable: mockDraftEnable,
      isEnabled: mockDraftIsEnabled,
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

const createMockStore = (overrides: Partial<Store> = {}): Store => ({
  id: 1,
  name: "Default Store",
  createdAt: "",
  slug: "default",
  theme: "default",
  updatedAt: "",
  subscription: {
    status: "active",
  },
  ...overrides,
});

const toStoreDocs = (docs: Store[]) => ({
  docs,
  hasNextPage: false,
  hasPrevPage: false,
  limit: docs.length,
  page: 1,
  pagingCounter: 1,
  totalDocs: docs.length,
  totalPages: 1,
});

interface FakePayloadState {
  authShouldThrow: boolean;
  currentUser: User | null;
  currentStoreDocs: Store[];
}

const fakeState: FakePayloadState = {
  authShouldThrow: false,
  currentStoreDocs: [],
  currentUser: null,
};

// SAFETY: In-memory fake auth method satisfies PreviewPayloadClient auth signature
const fakeAuth = ((_options: unknown) => {
  if (fakeState.authShouldThrow) {
    return Promise.reject(new Error("JWT expired"));
  }
  return Promise.resolve({
    permissions: {},
    user: fakeState.currentUser,
  });
}) as PreviewPayloadClient["auth"];

// SAFETY: In-memory fake find method satisfies PreviewPayloadClient find signature
const fakeFind = ((_options: unknown) =>
  Promise.resolve(
    toStoreDocs(fakeState.currentStoreDocs)
  )) as PreviewPayloadClient["find"];

const mockLoggerError =
  vi.fn<(data: PreviewLoggerErrorData, message: string) => void>();

const fakePayloadClient: PreviewPayloadClient = {
  auth: fakeAuth,
  find: fakeFind,
  logger: {
    error: mockLoggerError,
  },
};

const handler = createPreviewHandler(() => Promise.resolve(fakePayloadClient));

describe("GET /next/preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDraftIsEnabled = false;
    fakeState.authShouldThrow = false;
    fakeState.currentUser = null;
    fakeState.currentStoreDocs = [];
  });

  it("returns 403 when previewSecret is missing or incorrect", async () => {
    const req = new NextRequest(
      "http://localhost:3000/next/preview?path=%2Fwarung-kopi&previewSecret=wrong-secret"
    );

    const res = await handler(req);

    expect(res.status).toBe(403);
    await expect(res.text()).resolves.toContain(
      "You are not allowed to preview this page"
    );
    expect(mockDraftEnable).not.toHaveBeenCalled();
  });

  it("returns 404 when path query param is missing", async () => {
    const req = new NextRequest(
      `http://localhost:3000/next/preview?previewSecret=${env.PREVIEW_SECRET}`
    );

    const res = await handler(req);

    expect(res.status).toBe(404);
    await expect(res.text()).resolves.toContain("Insufficient search params");
    expect(mockDraftEnable).not.toHaveBeenCalled();
  });

  it("returns 500 when path is an open redirect or external URL", async () => {
    const req = new NextRequest(
      `http://localhost:3000/next/preview?path=https%3A%2F%2Fevil.com&previewSecret=${env.PREVIEW_SECRET}`
    );

    const res = await handler(req);

    expect(res.status).toBe(500);
    await expect(res.text()).resolves.toContain(
      "This endpoint can only be used for relative previews"
    );
    expect(mockDraftEnable).not.toHaveBeenCalled();
  });

  it("returns 403 and disables draft mode when user is unauthenticated", async () => {
    fakeState.currentUser = null;

    const req = new NextRequest(
      `http://localhost:3000/next/preview?path=%2Fwarung-kopi&previewSecret=${env.PREVIEW_SECRET}`
    );

    const res = await handler(req);

    expect(res.status).toBe(403);
    await expect(res.text()).resolves.toContain(
      "You are not allowed to preview this page"
    );
    expect(mockDraftDisable).toHaveBeenCalledOnce();
    expect(mockDraftEnable).not.toHaveBeenCalled();
  });

  it("returns 403 when user auth throws an error", async () => {
    fakeState.authShouldThrow = true;

    const req = new NextRequest(
      `http://localhost:3000/next/preview?path=%2Fwarung-kopi&previewSecret=${env.PREVIEW_SECRET}`
    );

    const res = await handler(req);

    expect(res.status).toBe(403);
    await expect(res.text()).resolves.toContain(
      "You are not allowed to preview this page"
    );
    expect(mockDraftDisable).toHaveBeenCalledOnce();
    expect(mockLoggerError).toHaveBeenCalledOnce();
    expect(mockDraftEnable).not.toHaveBeenCalled();
  });

  it("returns 403 when merchant does not have access to the target store", async () => {
    fakeState.currentUser = {
      id: 42,
      collection: "users",
      createdAt: "",
      email: "merchant@test.com",
      roles: ["user"],
      updatedAt: "",
      stores: [
        {
          roles: ["owner"],
          store: 1,
        },
      ],
    };

    // Store slug "warung-kopi" has ID 2
    fakeState.currentStoreDocs = [
      createMockStore({
        id: 2,
        name: "Warung Kopi",
        slug: "warung-kopi",
      }),
    ];

    const req = new NextRequest(
      `http://localhost:3000/next/preview?path=%2Fwarung-kopi&previewSecret=${env.PREVIEW_SECRET}`
    );

    const res = await handler(req);

    expect(res.status).toBe(403);
    await expect(res.text()).resolves.toContain(
      "You are not allowed to preview this page"
    );
    expect(mockDraftDisable).toHaveBeenCalledOnce();
    expect(mockDraftEnable).not.toHaveBeenCalled();
  });

  it("returns 404 when target store slug is not found in database", async () => {
    fakeState.currentUser = {
      id: 42,
      collection: "users",
      createdAt: "",
      email: "merchant@test.com",
      roles: ["user"],
      updatedAt: "",
      stores: [
        {
          roles: ["owner"],
          store: 1,
        },
      ],
    };

    fakeState.currentStoreDocs = [];

    const req = new NextRequest(
      `http://localhost:3000/next/preview?path=%2F&store=nonexistent-store&previewSecret=${env.PREVIEW_SECRET}`
    );

    const res = await handler(req);

    expect(res.status).toBe(404);
    await expect(res.text()).resolves.toContain("Store not found");
    expect(mockDraftDisable).toHaveBeenCalledOnce();
    expect(mockDraftEnable).not.toHaveBeenCalled();
  });

  it("allows previewing non-store paths like /products when merchant has store access", async () => {
    fakeState.currentUser = {
      id: 42,
      collection: "users",
      createdAt: "",
      email: "merchant@test.com",
      roles: ["user"],
      updatedAt: "",
      stores: [
        {
          roles: ["owner"],
          store: 1,
        },
      ],
    };

    // /products is not in stores collection
    fakeState.currentStoreDocs = [];

    const req = new NextRequest(
      `http://localhost:3000/next/preview?path=%2Fproducts&previewSecret=${env.PREVIEW_SECRET}`
    );

    await expect(handler(req)).rejects.toThrow("NEXT_REDIRECT: /products");

    expect(mockDraftEnable).toHaveBeenCalledOnce();
    expect(mockRedirect).toHaveBeenCalledWith("/products");
  });

  it("activates draft mode and redirects when merchant has store access", async () => {
    fakeState.currentUser = {
      id: 42,
      collection: "users",
      createdAt: "",
      email: "merchant@test.com",
      roles: ["user"],
      updatedAt: "",
      stores: [
        {
          roles: ["owner"],
          store: 10,
        },
      ],
    };

    fakeState.currentStoreDocs = [
      createMockStore({
        id: 10,
        name: "Warung Kopi",
        slug: "warung-kopi",
      }),
    ];

    const req = new NextRequest(
      `http://localhost:3000/next/preview?path=%2Fwarung-kopi&previewSecret=${env.PREVIEW_SECRET}`
    );

    await expect(handler(req)).rejects.toThrow(
      "NEXT_REDIRECT: /?store=warung-kopi"
    );

    expect(mockDraftEnable).toHaveBeenCalledOnce();
    expect(mockRedirect).toHaveBeenCalledWith("/?store=warung-kopi");
  });

  it("normalizes store path prefix to query parameter on nested routes", async () => {
    fakeState.currentUser = {
      id: 42,
      collection: "users",
      createdAt: "",
      email: "merchant@test.com",
      roles: ["user"],
      updatedAt: "",
      stores: [
        {
          roles: ["owner"],
          store: 10,
        },
      ],
    };

    fakeState.currentStoreDocs = [
      createMockStore({
        id: 10,
        name: "Warung Kopi",
        slug: "warung-kopi",
      }),
    ];

    const req = new NextRequest(
      `http://localhost:3000/next/preview?path=%2Fwarung-kopi%2Fproducts&previewSecret=${env.PREVIEW_SECRET}`
    );

    await expect(handler(req)).rejects.toThrow(
      "NEXT_REDIRECT: /products?store=warung-kopi"
    );

    expect(mockDraftEnable).toHaveBeenCalledOnce();
    expect(mockRedirect).toHaveBeenCalledWith("/products?store=warung-kopi");
  });

  it("activates draft mode and redirects for super admin regardless of store assignments", async () => {
    fakeState.currentUser = {
      id: 1,
      collection: "users",
      createdAt: "",
      email: "admin@test.com",
      roles: ["super-admin"],
      stores: [],
      updatedAt: "",
    };

    const req = new NextRequest(
      `http://localhost:3000/next/preview?path=%2Fany-store%2Fabout&previewSecret=${env.PREVIEW_SECRET}`
    );

    await expect(handler(req)).rejects.toThrow(
      "NEXT_REDIRECT: /about?store=any-store"
    );

    expect(mockDraftEnable).toHaveBeenCalledOnce();
    expect(mockRedirect).toHaveBeenCalledWith("/about?store=any-store");
  });

  it("resolves target store from explicit search parameter when path is root", async () => {
    fakeState.currentUser = {
      id: 42,
      collection: "users",
      createdAt: "",
      email: "manager@test.com",
      roles: ["user"],
      updatedAt: "",
      stores: [
        {
          roles: ["manager"],
          store: 5,
        },
      ],
    };

    fakeState.currentStoreDocs = [
      createMockStore({
        id: 5,
        name: "Kedai Kopi",
        slug: "kedai-kopi",
      }),
    ];

    const req = new NextRequest(
      `http://localhost:3000/next/preview?path=%2F&store=kedai-kopi&previewSecret=${env.PREVIEW_SECRET}`
    );

    await expect(handler(req)).rejects.toThrow(
      "NEXT_REDIRECT: /?store=kedai-kopi"
    );

    expect(mockDraftEnable).toHaveBeenCalledOnce();
    expect(mockRedirect).toHaveBeenCalledWith("/?store=kedai-kopi");
  });
});
