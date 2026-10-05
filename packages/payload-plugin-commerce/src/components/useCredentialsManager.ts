import type { Dispatch, SetStateAction } from "react";
import type {
  TestConnectionInput,
  TestConnectionResult,
} from "../actions/testConnection";
import type {
  MidtransCredentials,
  PaymentProvider,
  RajaOngkirCredentials,
  ShippingProvider,
  StoreCredentials,
  XenditCredentials,
} from "../types";

import { useDocumentInfo, useField } from "@payloadcms/ui";
import { useState } from "react";

export interface TestStatusState {
  message: string;
  provider: string;
  success: boolean;
}

export interface UseCredentialsManagerOptions {
  initialCredentials?: StoreCredentials;
  onSave?: (credentials: Partial<StoreCredentials>) => Promise<void>;
  onTestConnection: (
    input: TestConnectionInput
  ) => Promise<TestConnectionResult>;
}

export interface UseCredentialsManagerReturn {
  handleSaveCredentials: () => Promise<void>;
  handleSelectPaymentProvider: (provider: PaymentProvider) => void;
  handleSelectShippingProvider: (provider: ShippingProvider) => void;
  handleTestPayment: () => Promise<void>;
  handleTestShipping: () => Promise<void>;
  isSaving: boolean;
  isTesting: boolean;
  midtrans: MidtransCredentials;
  paymentProvider: PaymentProvider;
  rajaongkir: RajaOngkirCredentials;
  saveStatus: string | null;
  setMidtrans: Dispatch<SetStateAction<MidtransCredentials>>;
  setRajaongkir: Dispatch<SetStateAction<RajaOngkirCredentials>>;
  setXendit: Dispatch<SetStateAction<XenditCredentials>>;
  shippingProvider: ShippingProvider;
  storeId?: number | string;
  testStatus: TestStatusState | null;
  xendit: XenditCredentials;
}

const getInitialMidtrans = (creds?: StoreCredentials): MidtransCredentials => ({
  clientKey: creds?.midtrans?.clientKey ?? "",
  isProduction: creds?.midtrans?.isProduction ?? false,
  serverKey: creds?.midtrans?.serverKey ?? "",
});

const getInitialXendit = (creds?: StoreCredentials): XenditCredentials => ({
  isProduction: creds?.xendit?.isProduction ?? false,
  secretKey: creds?.xendit?.secretKey ?? "",
  webhookToken: creds?.xendit?.webhookToken ?? "",
});

const getInitialRajaOngkir = (
  creds?: StoreCredentials
): RajaOngkirCredentials => ({
  accountType: creds?.rajaongkir?.accountType ?? "starter",
  apiKey: creds?.rajaongkir?.apiKey ?? "",
});

const runPaymentTest = async (
  paymentProvider: PaymentProvider,
  midtrans: MidtransCredentials,
  xendit: XenditCredentials,
  onTestConnection: (
    input: TestConnectionInput
  ) => Promise<TestConnectionResult>
): Promise<TestStatusState> => {
  try {
    const input: TestConnectionInput =
      paymentProvider === "midtrans"
        ? {
            isProduction: midtrans.isProduction,
            provider: "midtrans",
            serverKey: midtrans.serverKey || "",
          }
        : {
            isProduction: xendit.isProduction,
            provider: "xendit",
            secretKey: xendit.secretKey || "",
          };

    const result = await onTestConnection(input);
    return {
      message: result.message,
      provider: paymentProvider,
      success: result.success,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Connection test failed";
    return {
      message,
      provider: paymentProvider,
      success: false,
    };
  }
};

const runShippingTest = async (
  rajaongkir: RajaOngkirCredentials,
  onTestConnection: (
    input: TestConnectionInput
  ) => Promise<TestConnectionResult>
): Promise<TestStatusState> => {
  try {
    const result = await onTestConnection({
      accountType: rajaongkir.accountType,
      apiKey: rajaongkir.apiKey || "",
      provider: "rajaongkir",
    });

    return {
      message: result.message,
      provider: "rajaongkir",
      success: result.success,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Connection test failed";
    return {
      message,
      provider: "rajaongkir",
      success: false,
    };
  }
};

const runSaveCredentials = async (
  payload: Partial<StoreCredentials>,
  onSave?: (credentials: Partial<StoreCredentials>) => Promise<void>
): Promise<string> => {
  if (!onSave) {
    return "";
  }
  try {
    await onSave(payload);
    return "Credentials saved successfully.";
  } catch (error: unknown) {
    return error instanceof Error
      ? error.message
      : "Failed to save credentials.";
  }
};

export const useCredentialsManager = ({
  initialCredentials,
  onSave,
  onTestConnection,
}: UseCredentialsManagerOptions): UseCredentialsManagerReturn => {
  const documentInfo = useDocumentInfo();
  const storeId = documentInfo?.id;

  const paymentField = useField<string>({ path: "activePaymentProvider" });
  const shippingField = useField<string>({ path: "activeShippingProvider" });

  // SAFETY: Form field string value matches PaymentProvider union.
  const initialPayment =
    (paymentField?.value as PaymentProvider | undefined) ??
    initialCredentials?.paymentProvider ??
    "none";
  // SAFETY: Form field string value matches ShippingProvider union.
  const initialShipping =
    (shippingField?.value as ShippingProvider | undefined) ??
    initialCredentials?.shippingProvider ??
    "none";

  const [paymentProvider, setPaymentProvider] =
    useState<PaymentProvider>(initialPayment);
  const [shippingProvider, setShippingProvider] =
    useState<ShippingProvider>(initialShipping);

  const [midtrans, setMidtrans] = useState<MidtransCredentials>(() =>
    getInitialMidtrans(initialCredentials)
  );
  const [xendit, setXendit] = useState<XenditCredentials>(() =>
    getInitialXendit(initialCredentials)
  );
  const [rajaongkir, setRajaongkir] = useState<RajaOngkirCredentials>(() =>
    getInitialRajaOngkir(initialCredentials)
  );

  const [testStatus, setTestStatus] = useState<TestStatusState | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleSelectPaymentProvider = (provider: PaymentProvider): void => {
    setPaymentProvider(provider);
    paymentField?.setValue(provider);
    setTestStatus(null);
  };

  const handleSelectShippingProvider = (provider: ShippingProvider): void => {
    setShippingProvider(provider);
    shippingField?.setValue(provider);
    setTestStatus(null);
  };

  const handleTestPayment = async (): Promise<void> => {
    if (paymentProvider === "none") {
      return;
    }
    setIsTesting(true);
    setTestStatus(null);
    const status = await runPaymentTest(
      paymentProvider,
      midtrans,
      xendit,
      onTestConnection
    );
    setTestStatus(status);
    setIsTesting(false);
  };

  const handleTestShipping = async (): Promise<void> => {
    if (shippingProvider === "none") {
      return;
    }
    setIsTesting(true);
    setTestStatus(null);
    const status = await runShippingTest(rajaongkir, onTestConnection);
    setTestStatus(status);
    setIsTesting(false);
  };

  const handleSaveCredentials = async (): Promise<void> => {
    if (!onSave || !storeId) {
      return;
    }
    setIsSaving(true);
    setSaveStatus(null);
    const status = await runSaveCredentials(
      {
        midtrans,
        paymentProvider,
        rajaongkir,
        shippingProvider,
        store: storeId,
        xendit,
      },
      onSave
    );
    setSaveStatus(status);
    setIsSaving(false);
  };

  return {
    handleSaveCredentials,
    handleSelectPaymentProvider,
    handleSelectShippingProvider,
    handleTestPayment,
    handleTestShipping,
    isSaving,
    isTesting,
    midtrans,
    paymentProvider,
    rajaongkir,
    saveStatus,
    setMidtrans,
    setRajaongkir,
    setXendit,
    shippingProvider,
    storeId,
    testStatus,
    xendit,
  };
};
