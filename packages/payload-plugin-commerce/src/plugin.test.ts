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
      type: "text",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
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

  it("registers administrativeAreas collection hidden from admin navigation", async () => {
    const plugin = commercePlugin();
    const config = createMockConfig([mockStoresCollection]);

    const transformedConfig = await plugin(config);

    const administrativeAreas = transformedConfig.collections?.find(
      (c: CollectionConfig) => c.slug === "administrativeAreas"
    );
    expect(administrativeAreas).toBeDefined();
    expect(administrativeAreas?.admin?.hidden).toBeTruthy();
  });

  it("registers packages collection with default package management and store enforcement", async () => {
    const plugin = commercePlugin();
    const config = createMockConfig([mockStoresCollection]);

    const transformedConfig = await plugin(config);

    const packages = transformedConfig.collections?.find(
      (c: CollectionConfig) => c.slug === "packages"
    );
    expect(packages).toBeDefined();
    expect(packages?.admin?.useAsTitle).toBe("title");
    expect(packages?.hooks?.beforeChange).toHaveLength(2);
    expect(packages?.hooks?.afterChange).toHaveLength(1);
  });

  it("respects custom packages slug in options", async () => {
    const plugin = commercePlugin({
      slugs: {
        packages: "customPackages",
      },
    });
    const config = createMockConfig([mockStoresCollection]);

    const transformedConfig = await plugin(config);

    const packages = transformedConfig.collections?.find(
      (c: CollectionConfig) => c.slug === "customPackages"
    );
    expect(packages).toBeDefined();
    expect(packages?.slug).toBe("customPackages");
  });

  it("respects custom administrativeAreas slug in options", async () => {
    const plugin = commercePlugin({
      slugs: {
        administrativeAreas: "customRegions",
      },
    });
    const config = createMockConfig([mockStoresCollection]);

    const transformedConfig = await plugin(config);

    const customCollection = transformedConfig.collections?.find(
      (c: CollectionConfig) => c.slug === "customRegions"
    );
    expect(customCollection).toBeDefined();
    expect(customCollection?.admin?.hidden).toBeTruthy();
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

  it("transforms orders collection to include paymentMetadata field when present", async () => {
    const mockOrdersCollection: CollectionConfig = {
      slug: "orders",
      fields: [
        {
          name: "orderNumber",
          type: "text",
        },
      ],
    };
    const plugin = commercePlugin();
    const result = await plugin(
      createMockConfig([mockStoresCollection, mockOrdersCollection])
    );
    const orders = result.collections?.find((c) => c.slug === "orders");

    expect(orders).toBeDefined();
    const paymentMetadata = orders?.fields.find(
      (f: Field) => "name" in f && f.name === "paymentMetadata"
    );
    expect(paymentMetadata).toBeDefined();
  });

  it("handles pre-existing collections, pre-existing Integrations tab, and enabled = false", async () => {
    const existingStoresWithTabs: CollectionConfig = {
      slug: "stores",
      fields: [
        {
          type: "tabs",
          tabs: [
            { fields: [], label: "General" },
            {
              fields: [{ name: "credentialsManager", type: "ui" } as never],
              label: "Integrations",
            },
          ],
        },
      ],
    };

    const preExistingCollections: CollectionConfig[] = [
      existingStoresWithTabs,
      { fields: [], slug: "storeCredentials" },
      { fields: [], slug: "administrativeAreas" },
      { fields: [], slug: "packages" },
    ];

    const pluginDisabled = commercePlugin({ enabled: false });
    const result = await pluginDisabled(
      createMockConfig(preExistingCollections)
    );

    expect(result.collections).toHaveLength(4);
    const stores = result.collections?.find((c) => c.slug === "stores");
    // SAFETY: Cast field to tabs shape for test assertion
    const tabsField = stores?.fields.find((f) => f.type === "tabs") as {
      tabs: { label: string; fields: unknown[] }[];
    };
    const integrationsTab = tabsField.tabs.find(
      (t) => t.label === "Integrations"
    );
    expect(integrationsTab?.fields.length).toBeGreaterThan(0);
  });
});
