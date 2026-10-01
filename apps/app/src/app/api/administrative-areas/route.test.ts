// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { createAdministrativeAreasRouteHandler } from "./route";

const createMockHandler = () => {
  const mockExecute = vi
    .fn<(q: unknown) => Promise<unknown>>()
    .mockResolvedValue({
      rows: [{ province_id: "1", province_name: "Bali" }],
    });

  const mockPayload = {
    db: {
      drizzle: {
        execute: mockExecute,
      },
    },
  };

  const handler = createAdministrativeAreasRouteHandler(() =>
    Promise.resolve(mockPayload)
  );

  return { handler, mockExecute };
};

describe("administrative areas API route handler", () => {
  it("GET ?type=provinces returns province list", async () => {
    const { handler } = createMockHandler();
    const req = new NextRequest(
      "http://localhost:3000/api/administrative-areas?type=provinces"
    );
    const res = await handler(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0]?.province_name).toBe("Bali");
  });

  it("GET ?type=cities returns 400 if provinceId is missing", async () => {
    const { handler } = createMockHandler();
    const req = new NextRequest(
      "http://localhost:3000/api/administrative-areas?type=cities"
    );
    const res = await handler(req);

    expect(res.status).toBe(400);
  });

  it("GET ?type=subdistricts returns 400 if cityId is missing", async () => {
    const { handler } = createMockHandler();
    const req = new NextRequest(
      "http://localhost:3000/api/administrative-areas?type=subdistricts"
    );
    const res = await handler(req);

    expect(res.status).toBe(400);
  });

  it("GET with unknown type returns 400", async () => {
    const { handler } = createMockHandler();
    const req = new NextRequest(
      "http://localhost:3000/api/administrative-areas?type=unknown"
    );
    const res = await handler(req);

    expect(res.status).toBe(400);
  });
});
