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
        name: "subdistrict_id",
        type: "number",
        index: true,
        required: true,
        admin: {
          description: "Unique subdistrict numeric identifier from RajaOngkir",
        },
      },
      {
        name: "subdistrict_name",
        type: "text",
        required: true,
        admin: {
          description: "Subdistrict (kecamatan) name",
        },
      },
      {
        name: "city_id",
        type: "number",
        index: true,
        required: true,
        admin: {
          description: "City or regency numeric identifier from RajaOngkir",
        },
      },
      {
        name: "city_name",
        type: "text",
        required: true,
        admin: {
          description: "City or regency name",
        },
      },
      {
        name: "city_type",
        type: "text",
        required: true,
        admin: {
          description: "Geographic unit type (Kota or Kabupaten)",
        },
      },
      {
        name: "province_id",
        type: "number",
        index: true,
        required: true,
        admin: {
          description: "Province numeric identifier from RajaOngkir",
        },
      },
      {
        name: "province_name",
        type: "text",
        required: true,
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
