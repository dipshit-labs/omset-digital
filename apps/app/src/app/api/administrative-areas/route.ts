import config from "@payload-config";
import {
  getCities,
  getProvinces,
  getSubdistricts,
} from "@repo/payload-plugin-commerce/actions";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPayload } from "payload";

export interface AdministrativeAreasPayloadClient {
  db: {
    drizzle: {
      execute: (q: unknown) => Promise<unknown>;
    };
  };
}

export const createAdministrativeAreasRouteHandler =
  (getPayloadClient: () => Promise<AdministrativeAreasPayloadClient>) =>
  async (req: NextRequest): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const payload = await getPayloadClient();

    if (type === "provinces") {
      const data = await getProvinces(payload);
      return NextResponse.json(data);
    }

    if (type === "cities") {
      const provinceId = searchParams.get("provinceId");

      if (!provinceId) {
        return NextResponse.json(
          { error: "provinceId query parameter is required" },
          { status: 400 }
        );
      }

      const data = await getCities(provinceId, payload);
      return NextResponse.json(data);
    }

    if (type === "subdistricts") {
      const cityId = searchParams.get("cityId");

      if (!cityId) {
        return NextResponse.json(
          { error: "cityId query parameter is required" },
          { status: 400 }
        );
      }

      const data = await getSubdistricts(cityId, payload);
      return NextResponse.json(data);
    }

    return NextResponse.json(
      {
        error:
          "Invalid type parameter. Expected provinces, cities, or subdistricts",
      },
      { status: 400 }
    );
  };

export const GET = createAdministrativeAreasRouteHandler(async () => {
  const payload = await getPayload({ config });
  // SAFETY: postgresAdapter mounts drizzle instance on payload.db.
  const dbHolder = payload.db as {
    drizzle: { execute: (q: unknown) => Promise<unknown> };
  };

  return {
    db: {
      drizzle: dbHolder.drizzle,
    },
  };
});
