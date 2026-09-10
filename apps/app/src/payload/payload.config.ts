import path from "node:path";
import { fileURLToPath } from "node:url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { resendAdapter } from "@payloadcms/email-resend";
import { multiTenantPlugin } from "@payloadcms/plugin-multi-tenant";
import { buildConfig } from "payload";
import sharp from "sharp";
import { env } from "@/env";
import { isSuperAdmin } from "./access/access";
import { Tenants } from "./collections/tenants";
import { Users } from "./collections/users";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  collections: [Users, Tenants],
  db: postgresAdapter({
    pool: {
      connectionString: env.DATABASE_URL,
    },
  }),
  email: resendAdapter({
    apiKey: env.RESEND_API_KEY,
    defaultFromAddress: "noreply@omsetdigital.com",
    defaultFromName: "Omset Digital",
  }),
  secret: env.PAYLOAD_SECRET,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  plugins: [
    multiTenantPlugin({
      collections: {},
      tenantsSlug: "tenants",
      tenantsArrayField: {
        includeDefaultField: true,
        rowFields: [
          {
            defaultValue: ["owner"],
            hasMany: true,
            name: "roles",
            required: true,
            type: "select",
            options: [
              { label: "Owner", value: "owner" },
              { label: "Manager", value: "manager" },
            ],
          },
        ],
      },
      userHasAccessToAllTenants: (user) => isSuperAdmin(user),
    }),
  ],
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  sharp,
});
