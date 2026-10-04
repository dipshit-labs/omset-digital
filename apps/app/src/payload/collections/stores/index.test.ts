import type { Field, TabsField } from "payload";
import { describe, expect, it } from "vitest";

import { Stores } from "./index";

const getStoresTabsField = (): TabsField | undefined =>
  // SAFETY: Field with type === "tabs" conforms to TabsField.
  Stores.fields.find((f: Field): boolean => f.type === "tabs") as
    | TabsField
    | undefined;

describe("Stores collection configuration", () => {
  it("defines standard store collection configuration", () => {
    expect(Stores.slug).toBe("stores");
    expect(Stores.admin?.useAsTitle).toBe("name");
  });

  it("organizes fields into General and Integrations tabs", () => {
    const tabsField = getStoresTabsField();
    expect(tabsField).toBeDefined();
    const generalTab = tabsField?.tabs.find((t) => t.label === "General");
    const integrationsTab = tabsField?.tabs.find(
      (t) => t.label === "Integrations"
    );

    expect(generalTab).toBeDefined();
    expect(integrationsTab).toBeDefined();
  });

  it("contains originAddress in General tab", () => {
    const tabsField = getStoresTabsField();
    const generalTab = tabsField?.tabs.find((t) => t.label === "General");

    const originAddressField = generalTab?.fields.find(
      (f: Field): boolean => "name" in f && f.name === "originAddress"
    );
    expect(originAddressField).toBeDefined();
  });

  it("contains credentialsManager and active provider flags in Integrations tab", () => {
    const tabsField = getStoresTabsField();
    const integrationsTab = tabsField?.tabs.find(
      (t) => t.label === "Integrations"
    );

    const credentialsManager = integrationsTab?.fields.find(
      (f: Field): boolean => "name" in f && f.name === "credentialsManager"
    );
    const activePayment = integrationsTab?.fields.find(
      (f: Field): boolean => "name" in f && f.name === "activePaymentProvider"
    );
    const activeShipping = integrationsTab?.fields.find(
      (f: Field): boolean => "name" in f && f.name === "activeShippingProvider"
    );

    expect(credentialsManager).toBeDefined();
    expect(activePayment).toBeDefined();
    expect(activeShipping).toBeDefined();
  });

  it("does not contain legacy paymentProviders or shippingConfig fields", () => {
    const tabsField = getStoresTabsField();
    const allTabFields = tabsField?.tabs.flatMap((t) => t.fields) ?? [];
    const allFields = [...Stores.fields, ...allTabFields];

    const paymentProvidersField = allFields.find(
      (f: Field): boolean => "name" in f && f.name === "paymentProviders"
    );
    const shippingConfigField = allFields.find(
      (f: Field): boolean => "name" in f && f.name === "shippingConfig"
    );

    expect(paymentProvidersField).toBeUndefined();
    expect(shippingConfigField).toBeUndefined();
  });
});
