import type { Order } from "@repo/types";
import { Factory } from "fishery";
import type { Payload } from "payload";

export interface OrderTransientParams {
  payload?: Payload;
}

export const orderFactory = Factory.define<Order, OrderTransientParams>(
  ({ onCreate, sequence, transientParams }) => {
    onCreate(async (order) => {
      if (!transientParams.payload) {
        throw new Error("Payload instance required");
      }
      const {
        createdAt: _createdAt,
        id: _id,
        updatedAt: _updatedAt,
        ...data
      } = order;
      const created = await transientParams.payload.create({
        collection: "orders",
        data,
      });
      // SAFETY: Payload Local API returns persisted document matching Order interface.
      return created as Order;
    });

    return {
      createdAt: new Date().toISOString(),
      currency: "IDR",
      id: sequence,
      orderNumber: `ORDER-${1000 + sequence}`,
      paymentMetadata: null,
      paymentStatus: "pending",
      store: 1,
      total: 50_000,
      updatedAt: new Date().toISOString(),
      customer: {
        email: "customer@example.com",
        firstName: "Budi",
        lastName: "Santoso",
        phone: "+6281234567890",
      },
      items: [
        {
          id: `item-${sequence}`,
          price: 50_000,
          quantity: 1,
          title: `Item ${sequence}`,
        },
      ],
    };
  }
);
