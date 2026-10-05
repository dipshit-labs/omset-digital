import { PGlite } from "@electric-sql/pglite";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { pushDevSchema } from "@payloadcms/drizzle";
import { drizzle } from "drizzle-orm/pglite";
import type { DatabaseAdapter, DatabaseAdapterObj } from "payload";

export type PgLiteAdapterInstance = Omit<
  DatabaseAdapter,
  "drizzle" | "pool"
> & {
  drizzle: unknown;
  pglite: PGlite;
  pool: PGlite;
};

export const createPgLiteAdapter = (): DatabaseAdapterObj => {
  const pglite = new PGlite("memory://");

  const database = postgresAdapter({
    disableCreateDatabase: true,
    // SAFETY: Duck-typed pool option bypassed by overriding adapter.connect.
    pool: {} as never,
    transactionOptions: false,
  });

  return {
    ...database,
    init: (args) => {
      const adapterInstance = Object.assign(database.init(args), {
        pglite,
        pool: pglite,
      });

      adapterInstance.connect = async function connect(): Promise<void> {
        await pglite.waitReady;

        // SAFETY: Drizzle PGlite database is runtime-compatible with Payload Drizzle adapter query builders.
        this.drizzle = drizzle({
          client: pglite,
          // SAFETY: Payload logger configuration satisfies Drizzle logger interface at runtime.
          logger: (this.logger as never) || false,
          schema: this.schema,
        }) as never;

        await this.createExtensions?.();

        const migrationsTable = this.tables?.payload_migrations;
        if (
          process.env.NODE_ENV !== "production" &&
          process.env.PAYLOAD_MIGRATING !== "true" &&
          this.push !== false &&
          Boolean(migrationsTable)
        ) {
          // SAFETY: Adapter instance provides schema, drizzle, and extension methods required by pushDevSchema.
          await pushDevSchema(this as never);
        }

        if (typeof this.resolveInitializing === "function") {
          this.resolveInitializing();
        }
      };

      adapterInstance.destroy = async function destroy(): Promise<void> {
        if (!pglite.closed) {
          await pglite.close();
        }
      };

      return adapterInstance;
    },
  };
};
