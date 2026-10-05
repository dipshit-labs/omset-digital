import { http, HttpResponse } from "msw";

export const xenditHandlers = [
  http.post("https://api.xendit.co/v2/invoices", async ({ request }) => {
    let externalId: string | undefined;
    let amount = 100_000;
    let description: string | undefined;
    let payerEmail = "customer@example.com";

    try {
      const parsed: unknown = await request.json();
      if (parsed && typeof parsed === "object") {
        if ("external_id" in parsed && typeof parsed.external_id === "string") {
          ({ external_id: externalId } = parsed);
        }
        if ("amount" in parsed && typeof parsed.amount === "number") {
          ({ amount } = parsed);
        }
        if ("description" in parsed && typeof parsed.description === "string") {
          ({ description } = parsed);
        }
        if ("payer_email" in parsed && typeof parsed.payer_email === "string") {
          ({ payer_email: payerEmail } = parsed);
        }
      }
    } catch {
      // Body may be empty or non-JSON
    }

    const id = `inv_mock_${Date.now()}`;
    const resolvedExternalId = externalId ?? `ext-${Date.now()}`;

    return HttpResponse.json(
      {
        id,
        amount,
        created: new Date().toISOString(),
        currency: "IDR",
        description: description ?? `Invoice for ${resolvedExternalId}`,
        expiry_date: new Date(Date.now() + 86_400_000).toISOString(),
        external_id: resolvedExternalId,
        invoice_url: `https://checkout-staging.xendit.co/web/${id}`,
        merchant_name: "Omset Digital Store",
        paid_amount: 0,
        payer_email: payerEmail,
        status: "PENDING",
        updated: new Date().toISOString(),
        user_id: "user_mock_xendit",
      },
      { status: 200 }
    );
  }),

  http.get("https://api.xendit.co/v2/invoices/:invoiceId", ({ params }) => {
    const id =
      typeof params.invoiceId === "string"
        ? params.invoiceId
        : "inv_mock_default";

    return HttpResponse.json(
      {
        id,
        amount: 100_000,
        created: new Date().toISOString(),
        currency: "IDR",
        description: `Invoice ${id}`,
        expiry_date: new Date(Date.now() + 86_400_000).toISOString(),
        external_id: `ext_${id}`,
        invoice_url: `https://checkout-staging.xendit.co/web/${id}`,
        merchant_name: "Omset Digital Store",
        paid_amount: 100_000,
        paid_at: new Date().toISOString(),
        payer_email: "customer@example.com",
        payment_method: "BANK_TRANSFER",
        status: "PAID",
        updated: new Date().toISOString(),
        user_id: "user_mock_xendit",
      },
      { status: 200 }
    );
  }),

  http.get("https://api.xendit.co/v2/invoices", ({ request }) => {
    const url = new URL(request.url);
    const externalId = url.searchParams.get("external_id") ?? "ext_mock_query";
    const id = `inv_${externalId}`;

    return HttpResponse.json(
      [
        {
          id,
          amount: 100_000,
          created: new Date().toISOString(),
          currency: "IDR",
          description: `Invoice for ${externalId}`,
          expiry_date: new Date(Date.now() + 86_400_000).toISOString(),
          external_id: externalId,
          invoice_url: `https://checkout-staging.xendit.co/web/${id}`,
          merchant_name: "Omset Digital Store",
          paid_amount: 100_000,
          paid_at: new Date().toISOString(),
          payer_email: "customer@example.com",
          payment_method: "BANK_TRANSFER",
          status: "PAID",
          updated: new Date().toISOString(),
          user_id: "user_mock_xendit",
        },
      ],
      { status: 200 }
    );
  }),
];
