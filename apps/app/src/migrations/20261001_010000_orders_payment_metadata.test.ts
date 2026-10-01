// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { down, up } from "./20261001_010000_orders_payment_metadata";

describe("orders payment metadata migration", () => {
  it("up() adds payment_metadata column and backfills existing orders", async () => {
    const executedQueries: unknown[] = [];
    const mockExecute = vi
      .fn<(q: unknown) => Promise<unknown>>()
      .mockImplementation((query: unknown) => {
        executedQueries.push(query);
        return Promise.resolve({ rows: [] });
      });

    const mockFind = vi.fn().mockResolvedValue({
      docs: [
        {
          id: 1,
          midtrans: {
            transactionId: "mid-1",
          },
          orderNumber: "ORD-1",
        },
      ],
      hasNextPage: false,
    });
    const mockUpdate = vi.fn().mockResolvedValue({});

    const mockPayload = {
      db: {
        drizzle: {
          execute: mockExecute,
        },
      },
      find: mockFind,
      update: mockUpdate,
    };

    // SAFETY: Providing mock payload conforming to MigrateUpArgs shape.
    await up({
      db: mockPayload.db as never,
      payload: mockPayload as never,
      req: {} as never,
    });

    expect(mockExecute).toHaveBeenCalledOnce();
    const ddl = JSON.stringify(executedQueries[0]);
    expect(ddl).toContain("payment_metadata");
    expect(mockFind).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "orders",
        data: {
          paymentMetadata: {
            provider: "midtrans",
            transactionId: "mid-1",
          },
        },
        id: 1,
      })
    );
  });

  it("down() drops the payment_metadata column", async () => {
    const executedQueries: unknown[] = [];
    const mockExecute = vi
      .fn<(q: unknown) => Promise<unknown>>()
      .mockImplementation((query: unknown) => {
        executedQueries.push(query);
        return Promise.resolve({ rows: [] });
      });

    const mockPayload = {
      db: {
        drizzle: {
          execute: mockExecute,
        },
      },
    };

    // SAFETY: Providing mock payload conforming to MigrateDownArgs shape.
    await down({
      db: mockPayload.db as never,
      payload: mockPayload as never,
      req: {} as never,
    });

    expect(mockExecute).toHaveBeenCalledOnce();
    const ddl = JSON.stringify(executedQueries[0]);
    expect(ddl).toContain("DROP COLUMN IF EXISTS");
    expect(ddl).toContain("payment_metadata");
  });
});
