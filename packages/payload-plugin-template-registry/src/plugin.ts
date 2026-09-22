import {
  type TemplateManifest,
  TemplateTokenSchema,
} from "@repo/template-contract";
import type { Config, Field, GroupField, SelectField } from "payload";
import { fieldAffectsData } from "payload/shared";
import { zodToPayloadFields } from "./zod-to-payload";

export interface TemplateRegistryPluginOptions {
  manifests?: TemplateManifest[] | Record<string, TemplateManifest>;
  templates?: TemplateManifest[] | Record<string, TemplateManifest>;
  tenantCollectionSlug?: string;
}

export function templateRegistryPlugin(
  options: TemplateRegistryPluginOptions
): (incomingConfig: Config) => Config {
  return (incomingConfig: Config): Config => {
    const rawManifests = options.manifests ?? options.templates ?? [];
    const manifestList = Array.isArray(rawManifests)
      ? rawManifests
      : Object.values(rawManifests);

    // Validate slug uniqueness and presence at boot/config initialization
    const seenSlugs = new Set<string>();
    for (const manifest of manifestList) {
      if (!manifest.slug || manifest.slug.trim() === "") {
        throw new Error("Template manifest must have a non-empty slug.");
      }
      if (seenSlugs.has(manifest.slug)) {
        throw new Error(
          `Duplicate template slug detected: "${manifest.slug}". Template slugs must be unique.`
        );
      }
      seenSlugs.add(manifest.slug);
    }

    const tenantSlug = options.tenantCollectionSlug ?? "tenants";
    const config = { ...incomingConfig };

    const activeTemplateField: SelectField = {
      defaultValue: manifestList[0]?.slug ?? "default",
      name: "activeTemplate",
      options: manifestList.map((m) => ({
        label: m.label,
        value: m.slug,
      })),
      required: true,
      type: "select",
      admin: {
        description: "Active storefront template",
      },
    };

    const templateTokensField: GroupField = {
      fields: zodToPayloadFields(TemplateTokenSchema.partial()),
      name: "templateTokens",
      type: "group",
      admin: {
        description: "Storefront design tokens (brand overrides)",
      },
    };

    const templateConfigSubGroups: Field[] = [];
    for (const manifest of manifestList) {
      if (manifest.settingsSchema) {
        const subGroup: GroupField = {
          fields: zodToPayloadFields(manifest.settingsSchema),
          label: `${manifest.label} Settings`,
          name: manifest.slug,
          type: "group",
          admin: {
            condition: (data, siblingData) => {
              let active: unknown;
              if (
                data &&
                typeof data === "object" &&
                "activeTemplate" in data
              ) {
                active = data.activeTemplate;
              } else if (
                siblingData &&
                typeof siblingData === "object" &&
                "activeTemplate" in siblingData
              ) {
                active = siblingData.activeTemplate;
              }
              return active === manifest.slug;
            },
          },
        };
        templateConfigSubGroups.push(subGroup);
      }
    }

    const templateConfigField: GroupField = {
      fields: templateConfigSubGroups,
      name: "templateConfig",
      type: "group",
      admin: {
        description: "Per-template settings",
      },
    };

    const injectedFields: Field[] = [
      activeTemplateField,
      templateTokensField,
      templateConfigField,
    ];

    config.collections = config.collections?.map((collection) => {
      if (collection.slug !== tenantSlug) {
        return collection;
      }

      // Filter out legacy theme fields as well as existing template fields to remain idempotent
      const isLegacyOrInjected = (name: string): boolean =>
        name === "theme" ||
        name === "themeConfig" ||
        name === "activeTemplate" ||
        name === "templateTokens" ||
        name === "templateConfig";
      const filteredFields = collection.fields.filter((field) => {
        if (fieldAffectsData(field) && isLegacyOrInjected(field.name)) {
          return false;
        }
        return true;
      });

      // Insert after customDomain if present, otherwise append
      const customDomainIndex = filteredFields.findIndex(
        (field) => fieldAffectsData(field) && field.name === "customDomain"
      );

      const updatedFields = [...filteredFields];
      if (customDomainIndex === -1) {
        updatedFields.push(...injectedFields);
      } else {
        updatedFields.splice(customDomainIndex + 1, 0, ...injectedFields);
      }

      const updatedAdmin = { ...collection.admin };
      if (Array.isArray(updatedAdmin.defaultColumns)) {
        updatedAdmin.defaultColumns = updatedAdmin.defaultColumns.map((col) =>
          col === "theme" ? "activeTemplate" : col
        );
      }

      return {
        ...collection,
        admin: updatedAdmin,
        fields: updatedFields,
      };
    });

    return config;
  };
}
