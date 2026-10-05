import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
  CollectionSlug,
  Field,
  Where,
} from "payload";
import type { CreatePackagesCollectionOptions } from "../types";

import { APIError } from "payload";

/**
 * Extracts store tenant ID from string, number, or populated object.
 */
const resolveStoreId = (rawStore: unknown): number | string | null => {
  if (typeof rawStore === "number" || typeof rawStore === "string") {
    return rawStore;
  }

  if (
    rawStore &&
    typeof rawStore === "object" &&
    "id" in rawStore &&
    (typeof rawStore.id === "string" || typeof rawStore.id === "number")
  ) {
    return rawStore.id;
  }

  return null;
};

/**
 * Extracts tenant identifier from request cookies if present.
 */
const extractTenantFromCookie = (
  headers?: Headers | Record<string, string | string[] | undefined> | null
): number | string | null => {
  if (!headers) {
    return null;
  }

  let cookieHeader = "";
  if (headers instanceof Headers) {
    cookieHeader = headers.get("cookie") ?? "";
  } else if ("cookie" in headers && typeof headers.cookie === "string") {
    cookieHeader = headers.cookie;
  }

  const match = cookieHeader.match(/payload-tenant=(?<tenantId>[^;]+)/u);
  const rawId = match?.groups?.tenantId;
  if (!rawId) {
    return null;
  }

  const decoded = decodeURIComponent(rawId);
  const num = Number(decoded);
  return Number.isNaN(num) ? decoded : num;
};

/**
 * Ensures newly created package records are assigned to the active store tenant.
 */
export const createEnforceStoreOnCreate =
  (_storesSlug = "stores"): CollectionBeforeChangeHook =>
  // oxlint-disable-next-line require-await
  async ({ data, operation, req }) => {
    if (operation !== "create") {
      return data;
    }

    if (data?.store) {
      return data;
    }

    // SAFETY: Verified user structure from PayloadRequest.
    const user = req?.user as { roles?: string[] } | undefined;
    if (user?.roles?.includes("super-admin")) {
      return data;
    }

    let storeId: number | string | null = null;

    if (req?.headers) {
      storeId = extractTenantFromCookie(req.headers);
    }

    if (!storeId && req?.context?.storeId) {
      // SAFETY: storeId context parameter set as string or number by caller.
      storeId = req.context.storeId as number | string;
    }

    if (!storeId) {
      throw new APIError("No active store selected.", 400);
    }

    return { ...data, store: storeId };
  };

/**
 * Hook to automatically set isDefault = true if this is the store's first package,
 * or prevent unsetting isDefault if it is the only default package for the store.
 */
export const createHandleDefaultPackageBeforeChange =
  (packagesSlug = "packages"): CollectionBeforeChangeHook =>
  async ({ data, operation, originalDoc, req }) => {
    if (req.context?.skipDefaultPackageSync) {
      return data;
    }

    const storeRaw = data?.store ?? originalDoc?.store;
    const storeId = resolveStoreId(storeRaw);

    if (!storeId) {
      return data;
    }

    if (operation === "create") {
      // SAFETY: packagesSlug dynamically references the configured collection slug.
      const existing = await req.payload.count({
        collection: packagesSlug as CollectionSlug,
        overrideAccess: true,
        req,
        where: {
          store: {
            equals: storeId,
          },
        },
      });

      if (existing.totalDocs === 0) {
        data.isDefault = true;
      }
    }

    if (operation === "update" && !data?.isDefault && originalDoc?.isDefault) {
      const currentId = originalDoc.id;
      const andConditions: Where[] = [
        { store: { equals: storeId } },
        { isDefault: { equals: true } },
      ];

      if (currentId !== undefined && currentId !== null) {
        andConditions.push({ id: { not_equals: currentId } });
      }

      // SAFETY: packagesSlug dynamically references the configured collection slug.
      const otherDefaults = await req.payload.count({
        collection: packagesSlug as CollectionSlug,
        overrideAccess: true,
        req,
        where: { and: andConditions },
      });

      if (otherDefaults.totalDocs === 0) {
        data.isDefault = true;
      }
    }

    return data;
  };

/**
 * Hook to ensure only one package per store is marked as default.
 */
export const createHandleDefaultPackageAfterChange =
  (packagesSlug = "packages"): CollectionAfterChangeHook =>
  async ({ doc, req }) => {
    if (req.context?.skipDefaultPackageSync) {
      return doc;
    }

    if (!doc.isDefault) {
      return doc;
    }

    const storeId = resolveStoreId(doc.store);
    if (!storeId) {
      return doc;
    }

    const andConditions: Where[] = [
      { store: { equals: storeId } },
      { isDefault: { equals: true } },
    ];

    if (doc.id !== undefined && doc.id !== null) {
      andConditions.push({ id: { not_equals: doc.id } });
    }

    // SAFETY: packagesSlug dynamically references the configured collection slug.
    await req.payload.update({
      collection: packagesSlug as CollectionSlug,
      overrideAccess: true,
      req,
      where: { and: andConditions },
      context: {
        ...req.context,
        skipDefaultPackageSync: true,
      },
      data: {
        isDefault: false,
      },
    });

    return doc;
  };

export const createPackagesCollection = (
  options: CreatePackagesCollectionOptions = {}
): CollectionConfig => {
  const slug = options.slug ?? "packages";
  const storesSlug = options.storesSlug ?? "stores";

  const fields: Field[] = [
    {
      name: "store",
      type: "relationship",
      index: true,
      // SAFETY: storesSlug references the configured stores collection slug.
      relationTo: storesSlug as CollectionSlug,
      required: true,
      admin: {
        description: "Associated store document",
        position: "sidebar",
      },
    },
    {
      name: "title",
      type: "text",
      label: "Package name",
      required: true,
    },
    {
      type: "row",
      fields: [
        {
          name: "dimensions",
          type: "group",
          label: false,
          admin: {
            hideGutter: true,
            width: "60%",
          },
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "length",
                  type: "number",
                  label: "Length (cm)",
                  min: 0.1,
                  required: true,
                  admin: {
                    placeholder: "0.0",
                  },
                },
                {
                  name: "width",
                  type: "number",
                  label: "Width (cm)",
                  min: 0.1,
                  required: true,
                  admin: {
                    placeholder: "0.0",
                  },
                },
                {
                  name: "height",
                  type: "number",
                  label: "Height (cm)",
                  min: 0.1,
                  required: true,
                  admin: {
                    placeholder: "0.0",
                  },
                },
              ],
            },
          ],
        },
        {
          name: "tareWeight",
          type: "group",
          label: false,
          admin: {
            hideGutter: true,
          },
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "value",
                  type: "number",
                  defaultValue: 0,
                  label: "Weight (Empty)",
                  min: 0,
                  required: true,
                  admin: {
                    placeholder: "0",
                  },
                },
                {
                  name: "unit",
                  type: "select",
                  defaultValue: "g",
                  label: false,
                  required: true,
                  admin: {
                    isClearable: false,
                    width: "35%",
                    style: {
                      alignSelf: "end",
                    },
                  },
                  options: [
                    { label: "g", value: "g" },
                    { label: "kg", value: "kg" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "isDefault",
      type: "checkbox",
      defaultValue: false,
      label: "Use as default package for all products",
      admin: {
        description:
          "Used to calculate rates at checkout and pre-selected when buying labels",
      },
    },
  ];

  const enforceStoreOnCreate = createEnforceStoreOnCreate(storesSlug);
  const handleDefaultPackageBeforeChange =
    createHandleDefaultPackageBeforeChange(slug);
  const handleDefaultPackageAfterChange =
    createHandleDefaultPackageAfterChange(slug);

  const baseConfig: CollectionConfig = {
    fields,
    slug,
    access: {
      create: ({ req }) => Boolean(req.user),
      delete: ({ req }) => {
        if (!req.user) {
          return false;
        }
        // SAFETY: User model roles check for platform super-admin privileges.
        const user = req.user as { roles?: string[]; stores?: unknown[] };
        if (user.roles?.includes("super-admin")) {
          return true;
        }
        const storeIds = (user.stores ?? [])
          .map((s) => (typeof s === "object" && s && "id" in s ? s.id : s))
          .filter(
            (id): id is number | string => id !== null && id !== undefined
          );
        if (storeIds.length > 0) {
          return { store: { in: storeIds } };
        }
        return true;
      },
      read: () => true,
      update: ({ req }) => {
        if (!req.user) {
          return false;
        }
        // SAFETY: User model roles check for platform super-admin privileges.
        const user = req.user as { roles?: string[]; stores?: unknown[] };
        if (user.roles?.includes("super-admin")) {
          return true;
        }
        const storeIds = (user.stores ?? [])
          .map((s) => (typeof s === "object" && s && "id" in s ? s.id : s))
          .filter(
            (id): id is number | string => id !== null && id !== undefined
          );
        if (storeIds.length > 0) {
          return { store: { in: storeIds } };
        }
        return true;
      },
    },
    admin: {
      defaultColumns: ["title", "dimensions", "tareWeight", "isDefault"],
      useAsTitle: "title",
    },
    hooks: {
      afterChange: [handleDefaultPackageAfterChange],
      beforeChange: [enforceStoreOnCreate, handleDefaultPackageBeforeChange],
    },
  };

  return {
    ...baseConfig,
    ...options.overrides,
    admin: {
      ...baseConfig.admin,
      ...options.overrides?.admin,
    },
    hooks: {
      ...baseConfig.hooks,
      ...options.overrides?.hooks,
      afterChange: [
        ...(baseConfig.hooks?.afterChange ?? []),
        ...(options.overrides?.hooks?.afterChange ?? []),
      ],
      beforeChange: [
        ...(baseConfig.hooks?.beforeChange ?? []),
        ...(options.overrides?.hooks?.beforeChange ?? []),
      ],
    },
  };
};
