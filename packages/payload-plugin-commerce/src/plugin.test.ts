import type {
  CollectionConfig,
  Config,
  Field,
  GroupField,
  TabsField,
} from "payload";
import { describe, expect, it } from "vitest";

import { commercePlugin } from "./plugin";

const mockStoresCollection: CollectionConfig = {
  slug: "stores",
  admin: {
    useAsTitle: "name",
  },
  fields: [
    {
      name: "name",
      required: true,
      type: "text",
    },
    {
      name: "slug",
      required: true,
      type: "text",
    },
  ],
};

const createMockConfig = (
  collections: CollectionConfig[] = [mockStoresCollection]
): Config => {
  const config = {
    collections,
  };
  // SAFETY: Test configuration provides mock collections for plugin transformation tests.
  return config as Config;
};

describe(commercePlugin, () => {
  it("registers storeCredentials collection in config", async () => {
    const plugin = commercePlugin();
    const config = createMockConfig([mockStoresCollection]);

    const transformedConfig = await plugin(config);

    const storeCredentials = transformedConfig.collections?.find(
      (c: CollectionConfig) => c.slug === "storeCredentials"
    );
    expect(storeCredentials).toBeDefined();
    expect(storeCredentials?.admin?.hidden).toBeTruthy();
  });

  it("injects tabs with General and Integrations into stores collection", async () => {
    const plugin = commercePlugin();
    const config = createMockConfig([
      { ...mockStoresCollection, fields: [...mockStoresCollection.fields] },
    ]);

    const transformedConfig = await plugin(config);
    const storesCollection = transformedConfig.collections?.find(
      (c: CollectionConfig) => c.slug === "stores"
    );

    expect(storesCollection).toBeDefined();

    const tabsField = storesCollection?.fields.find(
      (f: Field): boolean => f.type === "tabs"
    ) as TabsField | undefined;

    expect(tabsField).toBeDefined();
    expect(tabsField?.tabs.find((t) => t.label === "General")).toBeDefined();
    expect(
      tabsField?.tabs.find((t) => t.label === "Integrations")
    ).toBeDefined();
  });

  it("injects originAddress and public provider flags into stores collection", async () => {
    const plugin = commercePlugin();
    const config = createMockConfig([
      { ...mockStoresCollection, fields: [...mockStoresCollection.fields] },
    ]);

    const transformedConfig = await plugin(config);
    const storesCollection = transformedConfig.collections?.find(
      (c: CollectionConfig) => c.slug === "stores"
    );

    const tabsField = storesCollection?.fields.find(
      (f: Field): boolean => f.type === "tabs"
    ) as TabsField | undefined;
    const generalTab = tabsField?.tabs.find((t) => t.label === "General");
    const integrationsTab = tabsField?.tabs.find(
      (t) => t.label === "Integrations"
    );

    const originAddress = generalTab?.fields.find(
      (f: Field): boolean => "name" in f && f.name === "originAddress"
    ) as GroupField | undefined;
    expect(originAddress).toBeDefined();

    const activePayment = integrationsTab?.fields.find(
      (f: Field): boolean => "name" in f && f.name === "activePaymentProvider"
    );
    expect(activePayment).toBeDefined();

    const activeShipping = integrationsTab?.fields.find(
      (f: Field): boolean => "name" in f && f.name === "activeShippingProvider"
    );
    expect(activeShipping).toBeDefined();
  });
});
