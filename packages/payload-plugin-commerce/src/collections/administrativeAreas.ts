import type { CollectionConfig } from "payload";

import type { CreateAdministrativeAreasCollectionOptions } from "../types";

export const createAdministrativeAreasCollection = (
  options: CreateAdministrativeAreasCollectionOptions = {}
): CollectionConfig => {
  const slug = options.slug ?? "administrativeAreas";

  return {
    slug,
    access: {
      create: () => false,
      delete: () => false,
      read: () => true,
      update: () => false,
    },
    admin: {
      hidden: true,
      useAsTitle: "subdistrict_name",
    },
    fields: [
      {
        index: true,
        name: "subdistrict_id",
        required: true,
        type: "number",
        admin: {
          description: "Unique subdistrict numeric identifier from RajaOngkir",
        },
      },
      {
        name: "subdistrict_name",
        required: true,
        type: "text",
        admin: {
          description: "Subdistrict (kecamatan) name",
        },
      },
      {
        index: true,
        name: "city_id",
        required: true,
        type: "number",
        admin: {
          description: "City or regency numeric identifier from RajaOngkir",
        },
      },
      {
        name: "city_name",
        required: true,
        type: "text",
        admin: {
          description: "City or regency name",
        },
      },
      {
        name: "city_type",
        required: true,
        type: "text",
        admin: {
          description: "Geographic unit type (Kota or Kabupaten)",
        },
      },
      {
        index: true,
        name: "province_id",
        required: true,
        type: "number",
        admin: {
          description: "Province numeric identifier from RajaOngkir",
        },
      },
      {
        name: "province_name",
        required: true,
        type: "text",
        admin: {
          description: "Province name",
        },
      },
      {
        name: "postal_code",
        type: "text",
        admin: {
          description: "Indonesian 5-digit postal code",
        },
      },
    ],
    labels: {
      plural: "Administrative Areas",
      singular: "Administrative Area",
    },
  };
};
