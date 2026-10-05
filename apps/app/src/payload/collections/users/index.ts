import type { CollectionConfig } from "payload";

import { tenantsArrayField } from "@payloadcms/plugin-multi-tenant/fields";

import { isSuperAdmin } from "@/payload/access/isSuperAdmin";
import { createUserAccess } from "./access/create";
import { readUserAccess } from "./access/read";
import { updateAndDeleteUserAccess } from "./access/updateAndDelete";
import { ensureUniqueUsername } from "./hooks/ensureUniqueUsername";

const defaultStoreArrayField = tenantsArrayField({
  arrayFieldAccess: {},
  tenantFieldAccess: {},
  tenantsArrayFieldName: "stores",
  tenantsArrayTenantFieldName: "store",
  tenantsCollectionSlug: "stores",
  rowFields: [
    {
      name: "roles",
      type: "select",
      defaultValue: ["manager"],
      hasMany: true,
      options: ["owner", "manager"],
      required: true,
      access: {
        update: ({ req }) => Boolean(req.user),
      },
    },
  ],
});

export const Users: CollectionConfig = {
  auth: true,
  slug: "users",
  access: {
    create: createUserAccess,
    delete: updateAndDeleteUserAccess,
    read: readUserAccess,
    update: updateAndDeleteUserAccess,
  },
  admin: {
    useAsTitle: "email",
  },
  fields: [
    {
      name: "username",
      type: "text",
      index: true,
      hooks: {
        beforeValidate: [ensureUniqueUsername],
      },
    },
    {
      name: "password",
      type: "text",
      hidden: true,
      access: {
        read: () => false,
        update: ({ id, req }) => {
          if (!req.user) {
            return false;
          }

          if (id === req.user.id) {
            return true;
          }

          return isSuperAdmin(req.user);
        },
      },
    },
    {
      name: "roles",
      type: "select",
      defaultValue: ["user"],
      hasMany: true,
      options: ["super-admin", "user"],
      saveToJWT: true,
      access: {
        update: ({ req }) => isSuperAdmin(req.user),
      },
      admin: {
        position: "sidebar",
      },
    },
    {
      ...defaultStoreArrayField,
      admin: {
        ...defaultStoreArrayField?.admin,
        position: "sidebar",
      },
    },
  ],
};
