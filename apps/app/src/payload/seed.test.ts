import { describe, expect, it, vi } from "vitest";

import { seed } from "./seed";

describe(seed, () => {
  it("populates originAddress on store and creates linked storeCredentials", async () => {
    interface CreatedDocs {
      storeCredentials: Record<string, unknown>[];
      stores: Record<string, unknown>[];
      users: Record<string, unknown>[];
    }

    const createdDocs: CreatedDocs = {
      storeCredentials: [],
      stores: [],
      users: [],
    };

    interface CreateArgs {
      collection: "storeCredentials" | "stores" | "users";
      data: Record<string, unknown>;
      draft?: boolean;
    }

    const mockCreate = vi.fn<
      (args: CreateArgs) => Promise<Record<string, unknown>>
    >((args) => {
      const doc = {
        id: 1,
        ...args.data,
      };
      createdDocs[args.collection].push(doc);
      return Promise.resolve(doc);
    });

    const mockPayload = {
      create: mockCreate,
    };

    // SAFETY: Providing mock Payload instance conforming to SeedParameters shape.
    await seed(mockPayload as never);
    // Verify stores creation with originAddress
    expect(mockPayload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "stores",
        data: expect.objectContaining({
          originAddress: expect.objectContaining({
            cityId: expect.any(String),
            cityName: expect.any(String),
            cityType: expect.any(String),
            postalCode: expect.any(String),
            provinceId: expect.any(String),
            provinceName: expect.any(String),
            streetAddress: expect.any(String),
            subdistrictId: expect.any(String),
            subdistrictName: expect.any(String),
          }),
        }),
      })
    );

    // Verify storeCredentials creation linked to the store
    expect(mockPayload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "storeCredentials",
        data: expect.objectContaining({
          paymentProvider: "none",
          shippingProvider: "none",
          store: 1,
        }),
      })
    );

    // Verify users creation
    expect(createdDocs.users).toHaveLength(2);
  });
});
