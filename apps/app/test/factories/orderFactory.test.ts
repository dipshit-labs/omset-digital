import { beforeEach, describe, expect, it } from "vitest";

import { orderFactory } from "./orderFactory";

describe("order document factory", () => {
  beforeEach(() => {
    orderFactory.rewindSequence();
  });

  it("builds an order document synchronously with default core fields", () => {
    const order = orderFactory.build();

    expect(order.orderNumber).toBe("ORDER-1001");
    expect(order.paymentStatus).toBe("pending");
    expect(order.currency).toBe("IDR");
    expect(order.total).toBe(50_000);
    expect(order.store).toBe(1);
  });

  it("builds an order document with default customer and line items", () => {
    const order = orderFactory.build();

    expect(order.customer).toStrictEqual({
      email: "customer@example.com",
      firstName: "Budi",
      lastName: "Santoso",
      phone: "+6281234567890",
    });
    expect(order.items).toStrictEqual([
      {
        id: "item-1",
        price: 50_000,
        quantity: 1,
        title: "Item 1",
      },
    ]);
  });

  it("allows overriding specific fields during build", () => {
    const order = orderFactory.build({
      orderNumber: "CUSTOM-001",
      total: 125_000,
    });

    expect(order.orderNumber).toBe("CUSTOM-001");
    expect(order.total).toBe(125_000);
  });

  it("throws an error when create is called without transient payload", async () => {
    await expect(orderFactory.create()).rejects.toThrow(
      "Payload instance required"
    );
  });
});
