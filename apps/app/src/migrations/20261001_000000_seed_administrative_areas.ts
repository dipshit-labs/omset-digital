import type { MigrateDownArgs, MigrateUpArgs } from "@payloadcms/db-postgres";
import { sql } from "@payloadcms/db-postgres";
import { seedAdministrativeAreas } from "@repo/payload-plugin-commerce";

interface DrizzleExecutorHolder {
  drizzle: {
    execute: (q: unknown) => Promise<unknown>;
  };
}

const resolveDrizzle = (db: unknown): DrizzleExecutorHolder["drizzle"] => {
  // SAFETY: postgresAdapter mounts drizzle on payload.db.
  const holder = db as DrizzleExecutorHolder;
  return holder.drizzle;
};

export const up = async ({ payload }: MigrateUpArgs): Promise<void> => {
  const drizzle = resolveDrizzle(payload.db);

  await drizzle.execute(sql`
    CREATE TABLE IF NOT EXISTS "administrative_areas" (
      "id" serial PRIMARY KEY NOT NULL,
      "subdistrict_id" numeric NOT NULL UNIQUE,
      "subdistrict_name" varchar NOT NULL,
      "city_id" numeric NOT NULL,
      "city_name" varchar NOT NULL,
      "city_type" varchar NOT NULL,
      "province_id" numeric NOT NULL,
      "province_name" varchar NOT NULL,
      "postal_code" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "idx_administrative_areas_composite" ON "administrative_areas" ("province_id", "city_id", "subdistrict_id");
    CREATE INDEX IF NOT EXISTS "idx_administrative_areas_province_id" ON "administrative_areas" ("province_id");
    CREATE INDEX IF NOT EXISTS "idx_administrative_areas_city_id" ON "administrative_areas" ("city_id");
    CREATE INDEX IF NOT EXISTS "idx_administrative_areas_subdistrict_id" ON "administrative_areas" ("subdistrict_id");
  `);

  await seedAdministrativeAreas(payload);
};

export const down = async ({ payload }: MigrateDownArgs): Promise<void> => {
  const drizzle = resolveDrizzle(payload.db);

  await drizzle.execute(sql`
    DROP TABLE IF EXISTS "administrative_areas" CASCADE;
  `);
};
