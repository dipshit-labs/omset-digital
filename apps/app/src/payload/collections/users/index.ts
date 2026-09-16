import { tenantsArrayField } from "@payloadcms/plugin-multi-tenant/fields";
import type { CollectionConfig } from "payload";
import { isSuperAdmin } from "@/payload/access/isSuperAdmin";
import { createUserAccess } from "./access/create";
import { readUserAccess } from "./access/read";
import { updateAndDeleteUserAccess } from "./access/updateAndDelete";
import { ensureUniqueUsername } from "./hooks/ensureUniqueUsername";

const defaultTenantArrayField = tenantsArrayField({
  arrayFieldAccess: {},
  tenantFieldAccess: {},
  tenantsArrayFieldName: "tenants",
  tenantsArrayTenantFieldName: "tenant",
  tenantsCollectionSlug: "tenants",
  rowFields: [
    {
      defaultValue: ["manager"],
      hasMany: true,
      name: "roles",
      options: ["owner", "manager"],
      required: true,
      type: "select",
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
      index: true,
      name: "username",
      type: "text",
      hooks: {
        beforeValidate: [ensureUniqueUsername],
      },
    },
    {
      hidden: true,
      name: "password",
      type: "text",
      access: {
        read: () => false,
        update: ({ req, id }) => {
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
      defaultValue: ["user"],
      hasMany: true,
      name: "roles",
      options: ["super-admin", "user"],
      saveToJWT: true,
      type: "select",
      access: {
        update: ({ req }) => isSuperAdmin(req.user),
      },
      admin: {
        position: "sidebar",
      },
    },
    {
      ...defaultTenantArrayField,
      admin: {
        ...(defaultTenantArrayField?.admin || {}),
        position: "sidebar",
      },
    },
  ],
};
