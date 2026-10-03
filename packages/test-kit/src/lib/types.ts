import type { Config, Payload, PayloadRequest } from "payload";

export type TestPayloadConfigOverrides = Partial<Config>;

export interface CreateTestReqOptions {
  headers?: Headers;
  user?: unknown;
}

export type CreateReqFn = (options?: CreateTestReqOptions) => PayloadRequest;

export interface TestKitFixtures {
  createReq: CreateReqFn;
  payload: Payload;
  req: PayloadRequest;
}

export interface PgPoolLike {
  end: () => Promise<void>;
  query: (
    queryText: string,
    values?: unknown[]
  ) => Promise<{ rows?: unknown[] }>;
}

export interface ProvisionPostgresWorkerSchemaOptions {
  closePool?: boolean;
  connectionString?: string;
  pool?: PgPoolLike;
  schemaName?: string;
}
