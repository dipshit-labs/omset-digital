import type { MigrateDownArgs, MigrateUpArgs } from "@payloadcms/db-postgres";
import { sql } from "@payloadcms/db-postgres";
import { backfillOrdersPaymentMetadata } from "@repo/payload-plugin-commerce/actions";

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
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_metadata" jsonb;
  `);

  await backfillOrdersPaymentMetadata(payload);
};

export const down = async ({ payload }: MigrateDownArgs): Promise<void> => {
  const drizzle = resolveDrizzle(payload.db);

  await drizzle.execute(sql`
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "payment_metadata";
  `);
};
