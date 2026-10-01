"use client";

import { Button } from "@payloadcms/ui";
import type { Dispatch, ReactElement, SetStateAction } from "react";

import { testConnection } from "../actions/testConnection";
import type {
  TestConnectionInput,
  TestConnectionResult,
} from "../actions/testConnection";
import type {
  MidtransCredentials,
  PaymentProvider,
  RajaOngkirAccountType,
  RajaOngkirCredentials,
  ShippingProvider,
  StoreCredentials,
  XenditCredentials,
} from "../types";
import { cn } from "../utils/cn";
import type { TestStatusState } from "./useCredentialsManager";
import { useCredentialsManager } from "./useCredentialsManager";

import styles from "./CredentialsManager.module.css";

export interface CredentialsManagerProps {
  initialCredentials?: StoreCredentials;
  onSave?: (credentials: Partial<StoreCredentials>) => Promise<void>;
  onTestConnection?: (
    input: TestConnectionInput
  ) => Promise<TestConnectionResult>;
  readOnly?: boolean;
}

interface PaymentGatewaySectionProps {
  isTesting: boolean;
  midtrans: MidtransCredentials;
  onSelectProvider: (provider: PaymentProvider) => void;
  onTestPayment: () => void;
  paymentProvider: PaymentProvider;
  readOnly: boolean;
  setMidtrans: Dispatch<SetStateAction<MidtransCredentials>>;
  setXendit: Dispatch<SetStateAction<XenditCredentials>>;
  testStatus: TestStatusState | null;
  xendit: XenditCredentials;
}

const PaymentGatewaySection = ({
  isTesting,
  midtrans,
  onSelectProvider,
  onTestPayment,
  paymentProvider,
  readOnly,
  setMidtrans,
  setXendit,
  testStatus,
  xendit,
}: PaymentGatewaySectionProps): ReactElement => (
  <section className={styles.section}>
    <div className={styles.sectionHeader}>
      <h3 className={styles.sectionTitle}>Payment Gateway</h3>
      <p className={styles.sectionDescription}>
        Select your preferred Indonesian payment provider and enter your API
        keys. Inactive credentials are preserved when switching.
      </p>
    </div>

    <div className={styles.radioGrid}>
      <label
        className={cn(
          styles.radioCard,
          paymentProvider === "none" && styles.radioCardSelected
        )}
      >
        <div className={styles.radioCardHeader}>
          <input
            aria-label="No online payment"
            checked={paymentProvider === "none"}
            className={styles.radioInput}
            disabled={readOnly}
            name="paymentProvider"
            onChange={() => onSelectProvider("none")}
            type="radio"
            value="none"
          />
          <span className={styles.radioLabel}>None</span>
        </div>
        <span className={styles.radioCardDescription}>
          Disable automated online payments.
        </span>
      </label>

      <label
        className={cn(
          styles.radioCard,
          paymentProvider === "midtrans" && styles.radioCardSelected
        )}
      >
        <div className={styles.radioCardHeader}>
          <input
            aria-label="Midtrans Snap"
            checked={paymentProvider === "midtrans"}
            className={styles.radioInput}
            disabled={readOnly}
            name="paymentProvider"
            onChange={() => onSelectProvider("midtrans")}
            type="radio"
            value="midtrans"
          />
          <span className={styles.radioLabel}>Midtrans</span>
        </div>
        <span className={styles.radioCardDescription}>
          Snap popup with QRIS, GoPay, ShopeePay, Virtual Accounts.
        </span>
      </label>

      <label
        className={cn(
          styles.radioCard,
          paymentProvider === "xendit" && styles.radioCardSelected
        )}
      >
        <div className={styles.radioCardHeader}>
          <input
            aria-label="Xendit Invoice"
            checked={paymentProvider === "xendit"}
            className={styles.radioInput}
            disabled={readOnly}
            name="paymentProvider"
            onChange={() => onSelectProvider("xendit")}
            type="radio"
            value="xendit"
          />
          <span className={styles.radioLabel}>Xendit</span>
        </div>
        <span className={styles.radioCardDescription}>
          Hosted checkout page with OVO, DANA, Virtual Accounts.
        </span>
      </label>
    </div>

    {paymentProvider === "midtrans" && (
      <div className={styles.credentialsForm}>
        <div className={styles.formField}>
          <label className={styles.fieldLabel} htmlFor="midtrans-server-key">
            Server Key
          </label>
          <input
            className={styles.input}
            disabled={readOnly}
            id="midtrans-server-key"
            onChange={(e) =>
              setMidtrans((prev) => ({ ...prev, serverKey: e.target.value }))
            }
            placeholder="SB-Mid-server-..."
            type="password"
            value={midtrans.serverKey}
          />
          <span className={styles.fieldHelp}>
            Encrypted at rest with authenticated AES-256-GCM.
          </span>
        </div>

        <div className={styles.formField}>
          <label className={styles.fieldLabel} htmlFor="midtrans-client-key">
            Client Key
          </label>
          <input
            className={styles.input}
            disabled={readOnly}
            id="midtrans-client-key"
            onChange={(e) =>
              setMidtrans((prev) => ({ ...prev, clientKey: e.target.value }))
            }
            placeholder="SB-Mid-client-..."
            type="text"
            value={midtrans.clientKey}
          />
          <span className={styles.fieldHelp}>
            Public client key used to load Midtrans Snap JS SDK.
          </span>
        </div>

        <label className={styles.checkboxField}>
          <input
            aria-label="Production Environment"
            checked={midtrans.isProduction}
            className={styles.checkbox}
            disabled={readOnly}
            onChange={(e) =>
              setMidtrans((prev) => ({
                ...prev,
                isProduction: e.target.checked,
              }))
            }
            type="checkbox"
          />
          <span className={styles.fieldLabel}>
            Production Environment (uncheck for Sandbox)
          </span>
        </label>

        <div className={styles.actionsRow}>
          <Button
            disabled={isTesting || !midtrans.serverKey || readOnly}
            onClick={onTestPayment}
          >
            {isTesting ? "Testing..." : "Test Midtrans Connection"}
          </Button>
        </div>
      </div>
    )}

    {paymentProvider === "xendit" && (
      <div className={styles.credentialsForm}>
        <div className={styles.formField}>
          <label className={styles.fieldLabel} htmlFor="xendit-secret-key">
            Secret API Key
          </label>
          <input
            className={styles.input}
            disabled={readOnly}
            id="xendit-secret-key"
            onChange={(e) =>
              setXendit((prev) => ({ ...prev, secretKey: e.target.value }))
            }
            placeholder="xnd_development_... or xnd_production_..."
            type="password"
            value={xendit.secretKey}
          />
          <span className={styles.fieldHelp}>
            Encrypted at rest with authenticated AES-256-GCM.
          </span>
        </div>

        <div className={styles.formField}>
          <label className={styles.fieldLabel} htmlFor="xendit-webhook-token">
            Webhook Verification Token
          </label>
          <input
            className={styles.input}
            disabled={readOnly}
            id="xendit-webhook-token"
            onChange={(e) =>
              setXendit((prev) => ({ ...prev, webhookToken: e.target.value }))
            }
            placeholder="Webhook token from Xendit Settings > Webhooks"
            type="password"
            value={xendit.webhookToken}
          />
          <span className={styles.fieldHelp}>
            Used to verify x-callback-token on inbound webhooks.
          </span>
        </div>

        <label className={styles.checkboxField}>
          <input
            aria-label="Production Environment"
            checked={xendit.isProduction}
            className={styles.checkbox}
            disabled={readOnly}
            onChange={(e) =>
              setXendit((prev) => ({ ...prev, isProduction: e.target.checked }))
            }
            type="checkbox"
          />
          <span className={styles.fieldLabel}>
            Production Environment (uncheck for Sandbox)
          </span>
        </label>

        <div className={styles.actionsRow}>
          <Button
            disabled={isTesting || !xendit.secretKey || readOnly}
            onClick={onTestPayment}
          >
            {isTesting ? "Testing..." : "Test Xendit Connection"}
          </Button>
        </div>
      </div>
    )}

    {testStatus &&
      (testStatus.provider === "midtrans" ||
        testStatus.provider === "xendit") && (
        <div
          className={
            testStatus.success ? styles.alertSuccess : styles.alertError
          }
        >
          {testStatus.message}
        </div>
      )}
  </section>
);

interface ShippingCalculationSectionProps {
  isTesting: boolean;
  onSelectProvider: (provider: ShippingProvider) => void;
  onTestShipping: () => void;
  rajaongkir: RajaOngkirCredentials;
  readOnly: boolean;
  setRajaongkir: Dispatch<SetStateAction<RajaOngkirCredentials>>;
  shippingProvider: ShippingProvider;
  testStatus: TestStatusState | null;
}

const ShippingCalculationSection = ({
  isTesting,
  onSelectProvider,
  onTestShipping,
  rajaongkir,
  readOnly,
  setRajaongkir,
  shippingProvider,
  testStatus,
}: ShippingCalculationSectionProps): ReactElement => (
  <section className={styles.section}>
    <div className={styles.sectionHeader}>
      <h3 className={styles.sectionTitle}>Shipping Calculation</h3>
      <p className={styles.sectionDescription}>
        Select your shipping rates calculator. Configure RajaOngkir to query
        live domestic Indonesian courier rates.
      </p>
    </div>

    <div className={styles.radioGrid}>
      <label
        className={cn(
          styles.radioCard,
          shippingProvider === "none" && styles.radioCardSelected
        )}
      >
        <div className={styles.radioCardHeader}>
          <input
            aria-label="No automated shipping"
            checked={shippingProvider === "none"}
            className={styles.radioInput}
            disabled={readOnly}
            name="shippingProvider"
            onChange={() => onSelectProvider("none")}
            type="radio"
            value="none"
          />
          <span className={styles.radioLabel}>None</span>
        </div>
        <span className={styles.radioCardDescription}>
          Use flat rate or manual courier arrangements.
        </span>
      </label>

      <label
        className={cn(
          styles.radioCard,
          shippingProvider === "rajaongkir" && styles.radioCardSelected
        )}
      >
        <div className={styles.radioCardHeader}>
          <input
            aria-label="RajaOngkir"
            checked={shippingProvider === "rajaongkir"}
            className={styles.radioInput}
            disabled={readOnly}
            name="shippingProvider"
            onChange={() => onSelectProvider("rajaongkir")}
            type="radio"
            value="rajaongkir"
          />
          <span className={styles.radioLabel}>RajaOngkir</span>
        </div>
        <span className={styles.radioCardDescription}>
          Aggregate JNE, POS, TIKI, SiCepat, J&T courier rates.
        </span>
      </label>
    </div>

    {shippingProvider === "rajaongkir" && (
      <div className={styles.credentialsForm}>
        <div className={styles.formField}>
          <label className={styles.fieldLabel} htmlFor="rajaongkir-api-key">
            RajaOngkir API Key
          </label>
          <input
            className={styles.input}
            disabled={readOnly}
            id="rajaongkir-api-key"
            onChange={(e) =>
              setRajaongkir((prev) => ({ ...prev, apiKey: e.target.value }))
            }
            placeholder="RajaOngkir API key..."
            type="password"
            value={rajaongkir.apiKey}
          />
          <span className={styles.fieldHelp}>
            Encrypted at rest with authenticated AES-256-GCM.
          </span>
        </div>

        <div className={styles.formField}>
          <label className={styles.fieldLabel} htmlFor="rajaongkir-tier">
            Account Tier
          </label>
          <select
            className={styles.input}
            disabled={readOnly}
            id="rajaongkir-tier"
            onChange={(e) =>
              setRajaongkir((prev) => ({
                ...prev,
                // SAFETY: e.target.value from the select options is restricted to valid RajaOngkir account tiers.
                accountType: e.target.value as RajaOngkirAccountType,
              }))
            }
            value={rajaongkir.accountType}
          >
            <option value="starter">Starter (JNE, POS, TIKI)</option>
            <option value="basic">Basic (6 couriers)</option>
            <option value="pro">Pro (20+ couriers + subdistrict rate)</option>
          </select>
          <span className={styles.fieldHelp}>
            Pro tier enables subdistrict-level rate calculation.
          </span>
        </div>

        <div className={styles.actionsRow}>
          <Button
            disabled={isTesting || !rajaongkir.apiKey || readOnly}
            onClick={onTestShipping}
          >
            {isTesting ? "Testing..." : "Test RajaOngkir Connection"}
          </Button>
        </div>
      </div>
    )}

    {testStatus && testStatus.provider === "rajaongkir" && (
      <div
        className={testStatus.success ? styles.alertSuccess : styles.alertError}
      >
        {testStatus.message}
      </div>
    )}
  </section>
);

export const CredentialsManager = ({
  initialCredentials,
  onSave,
  onTestConnection = testConnection,
  readOnly = false,
}: CredentialsManagerProps): ReactElement => {
  const {
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
    testStatus,
    xendit,
  } = useCredentialsManager({
    initialCredentials,
    onSave,
    onTestConnection,
  });

  return (
    <div className={styles.container}>
      <PaymentGatewaySection
        isTesting={isTesting}
        midtrans={midtrans}
        onSelectProvider={handleSelectPaymentProvider}
        onTestPayment={handleTestPayment}
        paymentProvider={paymentProvider}
        readOnly={readOnly}
        setMidtrans={setMidtrans}
        setXendit={setXendit}
        testStatus={testStatus}
        xendit={xendit}
      />

      <ShippingCalculationSection
        isTesting={isTesting}
        onSelectProvider={handleSelectShippingProvider}
        onTestShipping={handleTestShipping}
        rajaongkir={rajaongkir}
        readOnly={readOnly}
        setRajaongkir={setRajaongkir}
        shippingProvider={shippingProvider}
        testStatus={testStatus}
      />

      {onSave && !readOnly && (
        <div className={styles.actionsRow}>
          <Button disabled={isSaving} onClick={handleSaveCredentials}>
            {isSaving ? "Saving..." : "Save Credentials"}
          </Button>
          {saveStatus && <span>{saveStatus}</span>}
        </div>
      )}
    </div>
  );
};
