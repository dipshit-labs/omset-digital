import type { PGlite } from "@electric-sql/pglite";
import type { DatabaseAdapterObj } from "payload";
import type { TestDatabase } from "./createTestDatabase";

import { PGlite as PGliteClient } from "@electric-sql/pglite";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { pushDevSchema } from "@payloadcms/drizzle";
import { drizzle } from "drizzle-orm/pglite";

import { quoteIdentifier } from "../../lib/utils";

type PostgresAdapter = ReturnType<typeof postgresAdapter>;
type PostgresAdapterInstance = ReturnType<NonNullable<PostgresAdapter["init"]>>;
type PgLiteAdapterInstance = Omit<PostgresAdapterInstance, "drizzle"> & {
  drizzle?: unknown;
  pglite?: PGlite;
  pgliteDataDir: string;
};

const connectPgLite = async function connectPgLite(
  this: PgLiteAdapterInstance,
  connectOptions: { hotReload?: boolean } = {}
): Promise<void> {
  try {
    if (!this.pglite) {
      this.pglite = new PGliteClient(this.pgliteDataDir);

      await this.pglite.waitReady;
    }

    this.drizzle = drizzle({
      client: this.pglite,
      logger: this.logger ?? false,
      schema: this.schema,
    });

    await this.createExtensions?.();

    if (
      !connectOptions.hotReload &&
      process.env.NODE_ENV !== "production" &&
      process.env.PAYLOAD_MIGRATING !== "true" &&
      this.push !== false
    ) {
      // SAFETY: Adapter instance provides schema, drizzle, and extension methods required by pushDevSchema.
      await pushDevSchema(this as never);
    }

    this.resolveInitializing?.();
  } catch (error) {
    this.rejectInitializing?.();

    await this.pglite?.close().catch(() => {
      // Preserve the original initialization error.
    });

    this.pglite = undefined;
    this.drizzle = undefined;

    throw error;
  }
};

const destroyPgLite = async function destroyPgLite(
  this: PgLiteAdapterInstance
): Promise<void> {
  try {
    await this.pglite?.close();
  } finally {
    this.pglite = undefined;
    this.drizzle = undefined;

    this.enums = {};
    this.schema = {};
    this.tables = {};
    this.relations = {};
    this.fieldConstraints = {};
  }
};

interface CreatePgLiteAdapterOptions {
  dataDir?: string;
  onInit?: (instance: PgLiteAdapterInstance) => void;
}

const createPgLiteAdapter = (
  options: CreatePgLiteAdapterOptions = {}
): DatabaseAdapterObj => {
  const database = postgresAdapter({
    disableCreateDatabase: true,
    // SAFETY: The PostgreSQL adapter requires a pool-shaped option, but connectPgLite replaces the actual connection lifecycle.
    pool: {} as never,
    push: true,
    transactionOptions: false,
  });

  return {
    ...database,
    init: (args) => {
      // SAFETY: postgresAdapter().init returns the Postgres adapter instance; PgLiteAdapterInstance only widens it with pglite fields that connectPgLite assigns before use.
      const adapterInstance = database.init(args) as PgLiteAdapterInstance;
      adapterInstance.pgliteDataDir = options.dataDir ?? "memory://";

      adapterInstance.connect = connectPgLite;
      adapterInstance.destroy = destroyPgLite;

      options.onInit?.(adapterInstance);
      return adapterInstance;
    },
  };
};

const resetPgliteDatabase = async (client: PGlite): Promise<void> => {
  const result = await client.query<{ tablename: string }>(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> 'payload_migrations'
    ORDER BY tablename;
  `);

  if (result.rows.length === 0) {
    return;
  }

  const tables = result.rows
    .map(({ tablename }) => quoteIdentifier(tablename))
    .join(", ");

  await client.exec(`
    TRUNCATE TABLE ${tables}
    RESTART IDENTITY
    CASCADE;
  `);
};

interface CreatePgliteTestDatabaseOptions {
  workerId: string;
}

export const createPgliteTestDatabase = ({
  workerId,
}: CreatePgliteTestDatabaseOptions): Promise<TestDatabase> => {
  let adapterInstance: PgLiteAdapterInstance | undefined;

  const adapter = createPgLiteAdapter({
    dataDir: `memory://test-payload-${workerId}`,
    onInit: (instance) => {
      adapterInstance = instance;
    },
  });

  return Promise.resolve({
    adapter,
    destroy: async (): Promise<void> => {
      await adapterInstance?.destroy?.();
    },
    reset: async (): Promise<void> => {
      const client = adapterInstance?.pglite;

      if (!client) {
        return;
      }

      await resetPgliteDatabase(client);
    },
  });
};
