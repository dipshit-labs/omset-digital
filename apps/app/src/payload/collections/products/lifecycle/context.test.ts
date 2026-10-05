import type { PayloadRequest } from "payload";
import type { VirtualCatalogData } from "./context";

import { describe, expect, it } from "vitest";

import { createTestReq } from "@repo/test-kit";
import {
  getStashedVirtualData,
  stashVirtualData,
  VIRTUAL_DATA_KEY,
} from "./context";

describe("lifecycle virtual context", () => {
  it("stashes virtual catalog data into req.context with proper key", () => {
    const req = createTestReq();

    const virtualData: VirtualCatalogData = {
      inventory: {
        allowBackorder: false,
        barcode: null,
        sku: "TEST-SKU",
        stock: 5,
        tracked: true,
      },
      pricing: {
        compareAtPrice: 200,
        price: 150,
      },
      shipping: {
        package: 1,
        required: true,
        weight: {
          unit: "g",
          value: 300,
        },
      },
    };

    stashVirtualData(req, virtualData);

    expect(req.context[VIRTUAL_DATA_KEY]).toStrictEqual(virtualData);
    expect(getStashedVirtualData(req)).toStrictEqual(virtualData);
  });

  it("initializes req.context if undefined when stashing", () => {
    // SAFETY: Simulating legacy or external request where context is uninitialized.
    const req = {
      headers: new Headers(),
    } as PayloadRequest;

    stashVirtualData(req, { pricing: { compareAtPrice: null, price: 99 } });

    expect(req.context).toBeDefined();
    expect(getStashedVirtualData(req)).toStrictEqual({
      pricing: { compareAtPrice: null, price: 99 },
    });
  });

  it("returns undefined when no virtual data has been stashed", () => {
    const req = createTestReq();
    expect(getStashedVirtualData(req)).toBeUndefined();
  });
});
