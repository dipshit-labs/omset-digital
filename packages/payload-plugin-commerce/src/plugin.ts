import type {
  CollectionConfig,
  Config,
  Field,
  Plugin,
  TabsField,
  UIField,
} from "payload";

import { createAdministrativeAreasCollection } from "./collections/administrativeAreas";
import { createPackagesCollection } from "./collections/packages";
import { createStoreCredentialsCollection } from "./collections/storeCredentials";
import type { CommercePluginOptions } from "./types";

export const originAddressField: Field = {
  name: "originAddress",
  type: "group",
  admin: {
    description: "Merchant store fulfillment origin address",
    components: {
      Field: "@repo/payload-plugin-commerce/client#OriginAddressField",
    },
  },
  fields: [
    {
      admin: { description: "Province numeric ID" },
      name: "provinceId",
      type: "text",
    },
    {
      admin: { description: "Province name" },
      name: "provinceName",
      type: "text",
    },
    {
      admin: { description: "City/Regency numeric ID" },
      name: "cityId",
      type: "text",
    },
    {
      admin: { description: "City/Regency name" },
      name: "cityName",
      type: "text",
    },
    {
      admin: { description: "City or regency type (Kota or Kabupaten)" },
      name: "cityType",
      type: "text",
    },
    {
      admin: { description: "Subdistrict numeric ID" },
      name: "subdistrictId",
      type: "text",
    },
    {
      admin: { description: "Subdistrict name" },
      name: "subdistrictName",
      type: "text",
    },
    {
      admin: { description: "Street address and fulfillment location details" },
      name: "streetAddress",
      type: "textarea",
    },
    {
      admin: { description: "Postal code" },
      name: "postalCode",
      type: "text",
    },
  ],
};

export const activePaymentProviderField: Field = {
  defaultValue: "none",
  name: "activePaymentProvider",
  type: "select",
  admin: {
    description: "Active payment gateway",
  },
  options: [
    { label: "None", value: "none" },
    { label: "Midtrans", value: "midtrans" },
    { label: "Xendit", value: "xendit" },
  ],
};

export const activeShippingProviderField: Field = {
  defaultValue: "none",
  name: "activeShippingProvider",
  type: "select",
  admin: {
    description: "Active shipping provider",
  },
  options: [
    { label: "None", value: "none" },
    { label: "RajaOngkir", value: "rajaongkir" },
  ],
};

export const credentialsManagerField: UIField = {
  name: "credentialsManager",
  type: "ui",
  admin: {
    components: {
      Field: "@repo/payload-plugin-commerce/client#CredentialsManager",
    },
  },
};

const transformStoresCollection = (
  storesCollection: CollectionConfig
): CollectionConfig => {
  const fields = [...storesCollection.fields];
  const existingTabsIndex = fields.findIndex((f) => f.type === "tabs");

  if (existingTabsIndex !== -1) {
    // SAFETY: Field with type === "tabs" conforms to TabsField.
    const existingTabsField = fields[existingTabsIndex] as TabsField;
    const tabs = [...existingTabsField.tabs];
    // Ensure originAddress in General / first tab
    const [firstTab] = tabs;
    if (
      firstTab &&
      !firstTab.fields.some((f) => "name" in f && f.name === "originAddress")
    ) {
      firstTab.fields = [...firstTab.fields, originAddressField];
    }

    // Ensure Integrations tab
    const integrationsTabIndex = tabs.findIndex(
      (t) => t.label === "Integrations"
    );

    const integrationsFields: Field[] = [
      credentialsManagerField,
      activePaymentProviderField,
      activeShippingProviderField,
    ];

    if (integrationsTabIndex === -1) {
      tabs.push({
        fields: integrationsFields,
        label: "Integrations",
      });
    } else {
      const existingTab = tabs[integrationsTabIndex];
      if (existingTab) {
        existingTab.fields = [
          ...integrationsFields,
          ...existingTab.fields.filter(
            (f) =>
              !(
                "name" in f &&
                (f.name === "credentialsManager" ||
                  f.name === "activePaymentProvider" ||
                  f.name === "activeShippingProvider")
              )
          ),
        ];
      }
    }

    fields[existingTabsIndex] = {
      ...existingTabsField,
      tabs,
    };

    return {
      ...storesCollection,
      fields,
    };
  }

  const tabsField: TabsField = {
    type: "tabs",
    tabs: [
      {
        fields: [...fields, originAddressField],
        label: "General",
      },
      {
        label: "Integrations",
        fields: [
          credentialsManagerField,
          activePaymentProviderField,
          activeShippingProviderField,
        ],
      },
    ],
  };

  return {
    ...storesCollection,
    fields: [tabsField],
  };
};

export const commercePlugin =
  (options: CommercePluginOptions = {}): Plugin =>
  (incomingConfig: Config): Config => {
    const storesSlug = options.slugs?.stores ?? "stores";
    const storeCredentialsSlug =
      options.slugs?.storeCredentials ?? "storeCredentials";
    const administrativeAreasSlug =
      options.slugs?.administrativeAreas ?? "administrativeAreas";

    const config: Config = { ...incomingConfig };
    config.collections = config.collections ? [...config.collections] : [];

    // 1. Add storeCredentials collection if not present
    const existingCredentialsIndex = config.collections.findIndex(
      (c) => c.slug === storeCredentialsSlug
    );

    const storeCredentialsCollection = createStoreCredentialsCollection({
      secretOrResolver: options.secret,
      slug: storeCredentialsSlug,
      storesSlug,
    });

    if (existingCredentialsIndex === -1) {
      config.collections.push(storeCredentialsCollection);
    } else {
      config.collections[existingCredentialsIndex] = storeCredentialsCollection;
    }
    // 2. Add administrativeAreas collection if not present
    const existingAreasIndex = config.collections.findIndex(
      (c) => c.slug === administrativeAreasSlug
    );

    const administrativeAreasCollection = createAdministrativeAreasCollection({
      slug: administrativeAreasSlug,
    });

    if (existingAreasIndex === -1) {
      config.collections.push(administrativeAreasCollection);
    } else {
      config.collections[existingAreasIndex] = administrativeAreasCollection;
    }

    // 3. Add packages collection if not present
    const packagesSlug = options.slugs?.packages ?? "packages";
    const existingPackagesIndex = config.collections.findIndex(
      (c) => c.slug === packagesSlug
    );

    const packagesCollection = createPackagesCollection({
      slug: packagesSlug,
      storesSlug,
    });

    if (existingPackagesIndex === -1) {
      config.collections.push(packagesCollection);
    } else {
      config.collections[existingPackagesIndex] = packagesCollection;
    }

    // 4. Transform stores collection to include Integrations tab and flags
    const storesIndex = config.collections.findIndex(
      (c) => c.slug === storesSlug
    );

    if (storesIndex !== -1) {
      const existingStores = config.collections[storesIndex];
      if (existingStores) {
        config.collections[storesIndex] =
          transformStoresCollection(existingStores);
      }
    }

    // If disabled, stop after schema updates
    if (options.enabled === false) {
      return config;
    }

    return config;
  };
