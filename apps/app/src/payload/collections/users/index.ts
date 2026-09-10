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
  hooks: {
    beforeChange: [
      async ({ operation, req, data }) => {
        if (operation === "create") {
          const userCount = await req.payload.count({
            collection: "users",
            overrideAccess: false,
            req,
          });
          if (userCount.totalDocs === 0) {
            return {
              ...data,
              roles: ["super-admin"],
            };
          }
        }
        return data;
      },
    ],
  },
};
