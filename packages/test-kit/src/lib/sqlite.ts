import { _createClient } from "@libsql/client/sqlite3";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import type { DatabaseAdapterObj } from "payload";

export const getSqliteMemoryUri = (workerId?: string): string => {
  const id = workerId ?? process.env.VITEST_POOL_ID ?? "0";
  return `file:test_mem_${id}?mode=memory&cache=shared`;
};

export const createSqliteAdapter = (workerId?: string): DatabaseAdapterObj => {
  const id = workerId ?? process.env.VITEST_POOL_ID ?? "0";
  const dbPath = getSqliteMemoryUri(id);

  const baseDb = sqliteAdapter({
    logger: false,
    client: {
      url: dbPath,
    },
  });

  const db: DatabaseAdapterObj = {
    ...baseDb,
    init: (args) => {
      const adapterInstance = baseDb.init(args);
      adapterInstance.client = _createClient({
        authority: undefined,
        authToken: undefined,
        concurrency: 20,
        encryptionKey: undefined,
        fetch: undefined,
        intMode: "number",
        path: dbPath,
        scheme: "file",
        syncInterval: undefined,
        syncUrl: undefined,
        tls: false,
      });
      return adapterInstance;
    },
  };

  return db;
};
