import type { PayloadRequest } from "payload";

import { describe, expect, it } from "vitest";

import { env } from "@/env";
import { canWrite } from "@/payload/access/canWrite";
import { enforceStoreOnCreate } from "@/payload/hooks/enforceStoreOnCreate";
import { readPageAccess } from "./access/read";
import { Pages } from "./index";

interface LivePreviewUrlArgs {
  data: { slug?: string; store?: number };
  req: PayloadRequest;
}

type LivePreviewUrlFunction = (args: LivePreviewUrlArgs) => Promise<string>;

const createMockRequest = (mock: unknown): PayloadRequest =>
  // SAFETY: Duck-typed mock request fulfills PayloadRequest requirements for test.
  mock as PayloadRequest;

describe("Pages collection", () => {
  it("defines standard page collection configuration", () => {
    expect(Pages.slug).toBe("pages");
    expect(Pages.admin?.useAsTitle).toBe("title");
    expect(Pages.hooks?.beforeChange).toContain(enforceStoreOnCreate);
  });

  it("configures write access, read access, and drafts", () => {
    expect(Pages.access?.create).toBe(canWrite);
    expect(Pages.access?.update).toBe(canWrite);
    expect(Pages.access?.delete).toBe(canWrite);
    expect(Pages.access?.read).toBe(readPageAccess);
    expect(
      typeof Pages.versions === "object" && Boolean(Pages.versions?.drafts)
    ).toBeTruthy();
  });

  it("contains title, content, slug, and themeTemplateField", () => {
    const { fields } = Pages;
    const titleField = fields.find(
      (f) => "name" in f && f.name === "title" && f.type === "text"
    );
    const contentField = fields.find(
      (f) => "name" in f && f.name === "content" && f.type === "richText"
    );
    const slugFieldDef = fields.find(
      (f) =>
        ("name" in f && f.name === "slug") ||
        ("fields" in f &&
          Array.isArray(f.fields) &&
          f.fields.some((sub) => "name" in sub && sub.name === "slug"))
    );
    const templateField = fields.find(
      (f) =>
        "name" in f &&
        f.name === "template" &&
        f.type === "relationship" &&
        "relationTo" in f &&
        f.relationTo === "templates"
    );
    expect(titleField).toBeDefined();
    expect(contentField).toBeDefined();
    expect(slugFieldDef).toBeDefined();
    expect(templateField).toBeDefined();
    expect(
      templateField && "filterOptions" in templateField
        ? templateField.filterOptions
        : undefined
    ).toStrictEqual({
      type: { equals: "page" },
    });
  });

  it("generates live preview url with tenant store resolution", async () => {
    const rawUrlGetter = Pages.admin?.livePreview?.url;
    expect(rawUrlGetter).toBeTypeOf("function");

    if (typeof rawUrlGetter !== "function") {
      throw new TypeError("Pages admin livePreview url is not a function");
    }
    // SAFETY: Live preview url getter matches LivePreviewUrlFunction contract in tests.
    const urlGetter = rawUrlGetter as LivePreviewUrlFunction;
    const mockPayload = {
      findByID: () => Promise.resolve({ id: 42, slug: "toko-kopi" }),
    };
    const mockReq = createMockRequest({ payload: mockPayload });

    const url = await urlGetter({
      req: mockReq,
      data: {
        slug: "tentang-kami",
        store: 42,
      },
    });

    expect(url).toBe(
      `/next/preview?path=%2Ftoko-kopi%2Ftentang-kami&previewSecret=${env.PREVIEW_SECRET}`
    );
  });

  describe(readPageAccess, () => {
    it("returns published filter for unauthenticated visitors", () => {
      const mockReq = createMockRequest({});
      const result = readPageAccess({ req: mockReq });

      expect(result).toStrictEqual({ _status: { equals: "published" } });
    });

    it("returns true for super admin", () => {
      const mockUser = { id: 1, roles: ["super-admin"] };
      const mockReq = createMockRequest({ user: mockUser });
      const result = readPageAccess({ req: mockReq });

      expect(result).toBeTruthy();
    });

    it("returns published or store-scoped filter for store manager", () => {
      const mockUser = {
        id: 2,
        roles: ["user"],
        stores: [{ roles: ["manager"], store: 99 }],
      };
      const mockReq = createMockRequest({ user: mockUser });
      const result = readPageAccess({ req: mockReq });

      expect(result).toStrictEqual({
        or: [{ _status: { equals: "published" } }, { store: { in: [99] } }],
      });
    });
  });
});
