import type { TestDatabase } from "./createTestDatabase";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { Pool } from "pg";

import { quoteIdentifier } from "../../lib/utils";

const createSchema = async (pool: Pool, schemaName: string): Promise<void> => {
  const schema = quoteIdentifier(schemaName);
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema};`);
};

const dropSchema = async (pool: Pool, schemaName: string): Promise<void> => {
  const schema = quoteIdentifier(schemaName);
  await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE;`);
};

const resetSchema = async (pool: Pool, schemaName: string): Promise<void> => {
  const result = await pool.query<{ tablename: string }>(
    `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = $1
        AND tablename <> 'payload_migrations'
      ORDER BY tablename;
    `,
    [schemaName]
  );

  if (result.rows.length === 0) {
    return;
  }

  const tables = result.rows
    .map(({ tablename }) =>
      [quoteIdentifier(schemaName), quoteIdentifier(tablename)].join(".")
    )
    .join(", ");

  await pool.query(`
    TRUNCATE TABLE ${tables}
    RESTART IDENTITY
    CASCADE;
  `);
};

const getWorkerSchemaName = (workerId: string): string => {
  const safeWorkerId = workerId.replaceAll(/[^a-zA-Z0-9_]/gu, "_");

  return `test_worker_${safeWorkerId}`;
};

interface CreatePostgresTestDatabaseOptions {
  connectionString: string;
  workerId: string;
}

export const createPostgresTestDatabase = async ({
  connectionString,
  workerId,
}: CreatePostgresTestDatabaseOptions): Promise<TestDatabase> => {
  const schemaName = getWorkerSchemaName(workerId);

  const adminPool = new Pool({
    connectionString,
    max: 1,
  });

  await createSchema(adminPool, schemaName);

  const adapter = postgresAdapter({
    push: true,
    schemaName,
    pool: {
      connectionString,
    },
  });

  let destroyed = false;

  return {
    adapter,
    destroy: async (): Promise<void> => {
      if (destroyed) {
        return;
      }

      destroyed = true;

      try {
        await dropSchema(adminPool, schemaName);
      } finally {
        await adminPool.end();
      }
    },
    reset: async (): Promise<void> => {
      await resetSchema(adminPool, schemaName);
    },
  };
};
