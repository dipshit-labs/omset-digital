import type { CollectionBeforeChangeHook } from "payload";
import { describe, expect, it, vi } from "vitest";

import { enforceSingleLiveTheme } from "./enforceSingleLiveTheme";

interface MockThemeDoc {
  _status?: string;
  id?: number | string;
  isLive?: boolean;
  name?: string;
  store?: unknown;
}

interface MockUpdateArgs {
  collection: string;
  context?: { preventLiveThemeSync?: boolean };
  data: MockThemeDoc;
  where: { and: unknown[] };
}

interface MockFindArgs {
  collection: string;
  where: { and: unknown[] };
}
interface MockHookArgs {
  context?: { preventLiveThemeSync?: boolean };
  data: MockThemeDoc;
  originalDoc?: MockThemeDoc;
  req: unknown;
}

const runHook = (
  hook: CollectionBeforeChangeHook,
  args: MockHookArgs
): Promise<MockThemeDoc> => {
  // SAFETY: Invoking CollectionBeforeChangeHook with test mock arguments matching payload hook signature.
  const fn = hook as (input: MockHookArgs) => Promise<MockThemeDoc>;
  return fn(args);
};
const createMockReq = ({
  existingDocs = [],
}: {
  existingDocs?: MockThemeDoc[];
} = {}) => {
  const updateCalls: MockUpdateArgs[] = [];
  const findCalls: MockFindArgs[] = [];

  const req = {
    context: {},
    payload: {
      find: vi.fn<
        (
          args: MockFindArgs
        ) => Promise<{ docs: MockThemeDoc[]; totalDocs: number }>
      >(({ collection, where }: MockFindArgs) => {
        findCalls.push({ collection, where });
        return Promise.resolve({
          docs: existingDocs,
          totalDocs: existingDocs.length,
        });
      }),
      update: vi.fn<(args: MockUpdateArgs) => Promise<MockThemeDoc[]>>(
        ({ collection, context, data, where }: MockUpdateArgs) => {
          updateCalls.push({ collection, context, data, where });
          return Promise.resolve([]);
        }
      ),
    },
  };

  return { findCalls, req, updateCalls };
};
describe("enforceSingleLiveTheme hook", () => {
  it("deactivates other themes when activating a theme on update", async () => {
    const { req, updateCalls } = createMockReq();
    const hook = enforceSingleLiveTheme("store", "themes");

    const result = await runHook(hook, {
      req,
      data: {
        id: "theme-2",
        isLive: true,
        store: "store-1",
      },
      originalDoc: {
        id: "theme-2",
        isLive: false,
        store: "store-1",
      },
    });

    expect(result.isLive).toBeTruthy();
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]).toMatchObject({
      collection: "themes",
      context: { preventLiveThemeSync: true },
      data: { isLive: false },
      where: {
        and: [
          { store: { equals: "store-1" } },
          { id: { not_equals: "theme-2" } },
        ],
      },
    });
  });

  it("extracts store ID when tenantField is a populated object", async () => {
    const { req, updateCalls } = createMockReq();
    const hook = enforceSingleLiveTheme("store", "themes");

    await runHook(hook, {
      req,
      data: {
        id: "theme-2",
        isLive: true,
        store: { id: "store-1", name: "Store One" },
      },
      originalDoc: {
        id: "theme-2",
        isLive: false,
        store: { id: "store-1" },
      },
    });

    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].where.and).toContainEqual({
      store: { equals: "store-1" },
    });
  });

  it("deactivates all existing store themes when creating a new live theme", async () => {
    const { req, updateCalls } = createMockReq();
    const hook = enforceSingleLiveTheme("store", "themes");

    const result = await runHook(hook, {
      originalDoc: undefined,
      req,
      data: {
        isLive: true,
        name: "New Live Theme",
        store: "store-1",
      },
    });

    expect(result.isLive).toBeTruthy();
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]).toMatchObject({
      collection: "themes",
      context: { preventLiveThemeSync: true },
      data: { isLive: false },
      where: {
        and: [{ store: { equals: "store-1" } }],
      },
    });
  });

  it("does not run deactivation query when theme is already active on update", async () => {
    const { req, updateCalls } = createMockReq();
    const hook = enforceSingleLiveTheme("store", "themes");

    const result = await runHook(hook, {
      req,
      data: {
        id: "theme-1",
        isLive: true,
        name: "Renamed Theme",
        store: "store-1",
      },
      originalDoc: {
        id: "theme-1",
        isLive: true,
        name: "Old Name",
        store: "store-1",
      },
    });

    expect(result.isLive).toBeTruthy();
    expect(updateCalls).toHaveLength(0);
  });

  it("does not deactivate published live themes during draft autosaves", async () => {
    const { req, updateCalls } = createMockReq();
    const hook = enforceSingleLiveTheme("store", "themes");

    const result = await runHook(hook, {
      req,
      data: {
        _status: "draft",
        id: "theme-2",
        isLive: true,
        store: "store-1",
      },
      originalDoc: {
        _status: "draft",
        id: "theme-2",
        isLive: false,
        store: "store-1",
      },
    });

    expect(result.isLive).toBeTruthy();
    expect(updateCalls).toHaveLength(0);
  });

  it("bypasses deconfliction when preventLiveThemeSync is true in request context", async () => {
    const { req, updateCalls } = createMockReq();
    req.context = { preventLiveThemeSync: true };
    const hook = enforceSingleLiveTheme("store", "themes");

    const result = await runHook(hook, {
      originalDoc: undefined,
      req,
      data: {
        id: "theme-1",
        isLive: true,
        store: "store-1",
      },
    });

    expect(result.isLive).toBeTruthy();
    expect(updateCalls).toHaveLength(0);
  });
});
