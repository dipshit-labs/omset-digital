import { describe, expect, it } from "vitest";

import { storeCredentialsFactory } from "./storeCredentialsFactory";

describe("storeCredentials document factory", () => {
  it("builds a storeCredentials document synchronously with default values", () => {
    const creds = storeCredentialsFactory.build();

    expect(creds).toMatchObject({
      paymentProvider: "midtrans",
      shippingProvider: "rajaongkir",
      midtrans: {
        clientKey: "SB-Mid-client-1",
        serverKey: "SB-Mid-server-secret-1",
      },
      rajaongkir: {
        accountType: "starter",
        apiKey: "ro-api-key-1",
      },
      xendit: {
        secretKey: "xnd_development_secret_1",
      },
    });
  });

  it("increments sequence counter across builds", () => {
    const credsA = storeCredentialsFactory.build();
    const credsB = storeCredentialsFactory.build();

    expect(credsB.id).toBeGreaterThan(Number(credsA.id));
  });

  it("allows overriding specific fields during build", () => {
    const creds = storeCredentialsFactory.build({
      paymentProvider: "xendit",
      shippingProvider: "none",
    });

    expect(creds.paymentProvider).toBe("xendit");
    expect(creds.shippingProvider).toBe("none");
  });

  it("throws an error when create is called without transient payload", async () => {
    await expect(storeCredentialsFactory.create()).rejects.toThrow(
      "Payload instance required"
    );
  });
});
