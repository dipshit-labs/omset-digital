// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { createAdministrativeAreasActions } from "./administrativeAreas";

const createMockActions = () => {
  const mockExecute = vi
    .fn<(q: unknown) => Promise<unknown>>()
    .mockResolvedValue({
      rows: [
        { province_id: "1", province_name: "Bali" },
        { province_id: "5", province_name: "DI Yogyakarta" },
      ],
    });

  const mockPayload = {
    db: {
      drizzle: {
        execute: mockExecute,
      },
    },
  };

  const actions = createAdministrativeAreasActions(() =>
    Promise.resolve(mockPayload)
  );

  return { actions, mockExecute };
};

describe("administrativeAreas server actions", () => {
  it("getProvinces returns sorted provinces using payload drizzle", async () => {
    const { actions } = createMockActions();
    const provinces = await actions.getProvinces();

    expect(provinces).toBeDefined();
    expect(provinces).toHaveLength(2);
    expect(provinces[0]?.province_name).toBe("Bali");
    expect(provinces[1]?.province_name).toBe("DI Yogyakarta");
  });

  it("getCities forwards provinceId to query helper", async () => {
    const { actions } = createMockActions();
    const cities = await actions.getCities(5);

    expect(cities).toBeDefined();
  });

  it("getSubdistricts forwards cityId to query helper", async () => {
    const { actions } = createMockActions();
    const subdistricts = await actions.getSubdistricts(39);

    expect(subdistricts).toBeDefined();
  });
});
