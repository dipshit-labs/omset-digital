import { http, HttpResponse } from "msw";

export const midtransHandlers = [
  http.post("https://app.sandbox.midtrans.com/snap/v1/transactions", () => {
    const token = `mock-snap-token-${Date.now()}`;
    return HttpResponse.json(
      {
        redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${token}`,
        token,
      },
      { status: 201 }
    );
  }),
  http.post("https://app.midtrans.com/snap/v1/transactions", () => {
    const token = `mock-snap-token-${Date.now()}`;
    return HttpResponse.json(
      {
        redirect_url: `https://app.midtrans.com/snap/v2/vtweb/${token}`,
        token,
      },
      { status: 201 }
    );
  }),
  http.get(
    "https://api.sandbox.midtrans.com/v2/:orderId/status",
    ({ params }) => {
      const orderId =
        typeof params.orderId === "string" ? params.orderId : "mock-order-id";
      return HttpResponse.json(
        {
          fraud_status: "accept",
          gross_amount: "100000.00",
          order_id: orderId,
          payment_type: "credit_card",
          signature_key: "mock-signature-key",
          status_code: "200",
          status_message: "Success, transaction is found",
          transaction_id: `tx-midtrans-${Date.now()}`,
          transaction_status: "settlement",
          transaction_time: new Date().toISOString(),
        },
        { status: 200 }
      );
    }
  ),
  http.get("https://api.midtrans.com/v2/:orderId/status", ({ params }) => {
    const orderId =
      typeof params.orderId === "string" ? params.orderId : "mock-order-id";
    return HttpResponse.json(
      {
        fraud_status: "accept",
        gross_amount: "100000.00",
        order_id: orderId,
        payment_type: "credit_card",
        signature_key: "mock-signature-key",
        status_code: "200",
        status_message: "Success, transaction is found",
        transaction_id: `tx-midtrans-${Date.now()}`,
        transaction_status: "settlement",
        transaction_time: new Date().toISOString(),
      },
      { status: 200 }
    );
  }),
];
