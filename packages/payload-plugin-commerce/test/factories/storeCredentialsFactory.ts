import { Factory } from "fishery";
import type { Payload } from "payload";

import type { StoreCredentials } from "../../src/types";

export interface StoreCredentialsTransientParams {
  payload?: Payload;
}

export const storeCredentialsFactory = Factory.define<
  StoreCredentials,
  StoreCredentialsTransientParams
>(({ onCreate, sequence, transientParams }) => {
  onCreate(async (creds) => {
    if (!transientParams.payload) {
      throw new Error("Payload instance required");
    }
    const {
      createdAt: _createdAt,
      id: _id,
      updatedAt: _updatedAt,
      ...data
    } = creds;
    // SAFETY: Stripped document properties satisfy StoreCredentials collection schema for create.
    const created = (await transientParams.payload.create({
      collection: "storeCredentials",
      data: data as never,
    })) as StoreCredentials;
    return created;
  });

  return {
    createdAt: new Date().toISOString(),
    id: sequence,
    paymentProvider: "midtrans",
    shippingProvider: "rajaongkir",
    store: sequence,
    updatedAt: new Date().toISOString(),
    midtrans: {
      clientKey: `SB-Mid-client-${sequence}`,
      isProduction: false,
      serverKey: `SB-Mid-server-secret-${sequence}`,
    },
    rajaongkir: {
      accountType: "starter",
      apiKey: `ro-api-key-${sequence}`,
    },
    xendit: {
      isProduction: false,
      secretKey: `xnd_development_secret_${sequence}`,
      webhookToken: `xnd_webhook_token_${sequence}`,
    },
  };
});
