import { describe, expect, it } from "vitest";

import type { ThemeManifestDefinition } from "../types";
import { createTemplatesCollection } from "./createTemplatesCollection";
import { createThemesCollection } from "./createThemesCollection";

interface ExpectedDraftsConfig {
  autosave?: { interval?: number };
  schedulePublish?: boolean;
}

interface ExpectedVersionsConfig {
  drafts?: ExpectedDraftsConfig;
  maxPerDoc?: number;
}

type TestPreviewData = Record<
  string,
  boolean | number | string | { slug?: string } | null
>;

interface LivePreviewURLArgs {
  data: TestPreviewData;
  locale: { code: string; label: string };
  payload: unknown;
  req: unknown;
}
type LivePreviewURLFunction = (
  args: LivePreviewURLArgs
) => Promise<null | string | undefined>;

const testManifest: ThemeManifestDefinition = {
  name: "Test Theme",
  sections: [],
  settings: [],
  slug: "test-theme",
  version: "1.0.0",
};
const fakeFindByID = ({
  id,
}: {
  id: number | string;
}): Promise<{ id: number | string; slug: string } | null> =>
  Promise.resolve(id === 99 ? { id: 99, slug: "store-from-id" } : null);

const createFakeLivePreviewArgs = (
  data: TestPreviewData,
  payloadFindByID?: ({
    id,
  }: {
    id: number | string;
  }) => Promise<{ id: number | string; slug: string } | null>
): LivePreviewURLArgs => {
  const fakeReq = {
    payload: payloadFindByID ? { findByID: payloadFindByID } : {},
  };

  // SAFETY: Mock LivePreviewURLArgs matches Payload Admin livePreview.url runtime parameter shape.
  return {
    data,
    locale: { code: "en", label: "English" },
    payload: fakeReq.payload as never,
    req: fakeReq as never,
  };
};

describe("Theme and Template Collection Versioning", () => {
  it("createThemesCollection configures draft autosave interval 100 and schedulePublish", () => {
    const config = createThemesCollection({
      manifests: [testManifest],
    });

    expect(config.versions).toBeDefined();
    // SAFETY: Collection versions configuration is guaranteed to be an object when configured.
    const versions = config.versions as ExpectedVersionsConfig;
    expect(versions.maxPerDoc).toBe(50);
    expect(versions.drafts?.schedulePublish).toBeTruthy();
    expect(versions.drafts?.autosave?.interval).toBe(100);
  });

  it("createTemplatesCollection configures draft autosave interval 100 and schedulePublish", () => {
    const config = createTemplatesCollection({
      manifests: [testManifest],
    });

    expect(config.versions).toBeDefined();
    // SAFETY: Collection versions configuration is guaranteed to be an object when configured.
    const versions = config.versions as ExpectedVersionsConfig;
    expect(versions.maxPerDoc).toBe(50);
    expect(versions.drafts?.schedulePublish).toBeTruthy();
    expect(versions.drafts?.autosave?.interval).toBe(100);
  });

  it("respects version overrides when provided", () => {
    const config = createThemesCollection({
      manifests: [testManifest],
      overrides: {
        versions: {
          maxPerDoc: 10,
          drafts: {
            autosave: {
              interval: 500,
            },
          },
        },
      },
    });

    // SAFETY: Collection versions configuration is guaranteed to be an object when configured.
    const versions = config.versions as ExpectedVersionsConfig;
    expect(versions.maxPerDoc).toBe(10);
    expect(versions.drafts?.autosave?.interval).toBe(500);
  });
});

describe("Collection admin.livePreview Hooks", () => {
  it("createThemesCollection resolves livePreview URL using store object slug", async () => {
    const config = createThemesCollection({
      manifests: [testManifest],
    });

    const livePreview = config.admin?.livePreview;
    expect(livePreview).toBeDefined();
    expect(livePreview?.url).toBeTypeOf("function");

    // SAFETY: livePreview.url was asserted to be a function above.
    const urlFn = livePreview?.url as LivePreviewURLFunction;
    const url = await urlFn(
      createFakeLivePreviewArgs({
        slug: "test-theme",
        store: { slug: "toko-kopi" },
      })
    );

    expect(url).toContain("/next/preview?path=%2Ftoko-kopi");
  });

  it("createThemesCollection resolves store from req.payload when store field is an ID", async () => {
    const config = createThemesCollection({
      manifests: [testManifest],
    });

    const livePreview = config.admin?.livePreview;
    expect(livePreview).toBeDefined();

    // SAFETY: livePreview.url was asserted to be a function above.
    const urlFn = livePreview?.url as LivePreviewURLFunction;
    const url = await urlFn(
      createFakeLivePreviewArgs(
        {
          slug: "test-theme",
          store: 99,
        },
        fakeFindByID
      )
    );

    expect(url).toContain("/next/preview?path=%2Fstore-from-id");
  });

  it("createTemplatesCollection resolves livePreview URL for template routes", async () => {
    const config = createTemplatesCollection({
      manifests: [testManifest],
    });

    const livePreview = config.admin?.livePreview;
    expect(livePreview).toBeDefined();
    expect(livePreview?.url).toBeTypeOf("function");

    // SAFETY: livePreview.url was asserted to be a function above.
    const urlFn = livePreview?.url as LivePreviewURLFunction;
    const homeUrl = await urlFn(
      createFakeLivePreviewArgs({
        name: "Home Layout",
        store: { slug: "toko-sepatu" },
        type: "home",
      })
    );
    expect(homeUrl).toContain("/next/preview?path=%2Ftoko-sepatu");

    const productUrl = await urlFn(
      createFakeLivePreviewArgs({
        name: "Product Layout",
        store: { slug: "toko-sepatu" },
        type: "product",
      })
    );
    expect(productUrl).toContain(
      "/next/preview?path=%2Ftoko-sepatu%2Fproducts"
    );
  });
});
