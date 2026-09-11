import type { CollectionConfig } from "payload";
import { isSuperAdmin } from "@/payload/access/access";

export const Users: CollectionConfig = {
  auth: true,
  slug: "users",
  admin: {
    useAsTitle: "email",
  },
  fields: [
    {
      defaultValue: ["user"],
      hasMany: true,
      name: "roles",
      required: true,
      type: "select",
      access: {
        create: ({ req: { user } }) => isSuperAdmin(user),
        update: ({ req: { user } }) => isSuperAdmin(user),
      },
      options: [
        { label: "Super Admin", value: "super-admin" },
        { label: "User", value: "user" },
      ],
    },
  ],
};
