// oxlint-disable unicorn/prefer-import-meta-properties
import path from "node:path";
import { fileURLToPath } from "node:url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { resendAdapter } from "@payloadcms/email-resend";
import { multiTenantPlugin } from "@payloadcms/plugin-multi-tenant";
import { seoPlugin } from "@payloadcms/plugin-seo";
import {
  BoldFeature,
  FixedToolbarFeature,
  ItalicFeature,
  lexicalEditor,
  ParagraphFeature,
  StrikethroughFeature,
  UnderlineFeature,
} from "@payloadcms/richtext-lexical";
import { themesPlugin } from "@repo/payload-plugin-themes";
import { defaultTheme } from "@repo/theme-default";
import type { Config } from "@repo/types";
import { buildConfig } from "payload";
import sharp from "sharp";

import { env } from "@/env";

import { isSuperAdmin } from "./access/isSuperAdmin";
import { Categories } from "./collections/categories";
import { Media } from "./collections/media";
import { Packages } from "./collections/packages";
import { Products } from "./collections/products";
import {
  VariantOptions,
  Variants,
  VariantTypes,
} from "./collections/products/variants";
import { Stores } from "./collections/stores";
import { Users } from "./collections/users";
import { getUserStoreIDs } from "./lib/ids";
import { seed } from "./seed";

const __filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(__filename);

export default buildConfig({
  secret: env.PAYLOAD_SECRET,
  sharp,
  onInit: async (args) => {
    if (env.PAYLOAD_SEED) {
      await seed(args);
    }
  },
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Users,
    Stores,
    Categories,
    Packages,
    Products,
    Media,
    Variants,
    VariantOptions,
    VariantTypes,
  ],
  db: postgresAdapter({
    pool: {
      connectionString: env.DATABASE_URL,
    },
  }),
  editor: lexicalEditor({
    features: [
      FixedToolbarFeature(),
      ParagraphFeature(),
      UnderlineFeature(),
      BoldFeature(),
      ItalicFeature(),
      StrikethroughFeature(),
    ],
  }),
  email: resendAdapter({
    apiKey: env.RESEND_API_KEY,
    defaultFromAddress: "noreply@omsetdigital.com",
    defaultFromName: "Omset Digital",
  }),
  plugins: [
    themesPlugin({
      manifests: [defaultTheme],
    }),
    multiTenantPlugin<Config>({
      tenantSelectorLabel: "Store",
      tenantsSlug: "stores",
      userHasAccessToAllTenants: (user) => isSuperAdmin(user),
      collections: {
        categories: { isGlobal: false },
        media: { isGlobal: false },
        packages: { isGlobal: false },
        products: { isGlobal: false },
        templates: { isGlobal: false },
        themes: { isGlobal: false },
        variantOptions: { isGlobal: false },
        variants: { isGlobal: false },
        variantTypes: { isGlobal: false },
      },
      tenantField: {
        name: "store",
        access: {
          read: () => true,
          update: ({ req }) => {
            if (isSuperAdmin(req.user)) {
              return true;
            }

            return getUserStoreIDs(req.user).length > 0;
          },
        },
      },
      tenantsArrayField: {
        arrayFieldName: "stores",
        arrayTenantFieldName: "store",
        includeDefaultField: false,
      },
    }),
    seoPlugin({}),
  ],
  typescript: {
    outputFile: path.resolve(
      dirname,
      "../../../../packages/types/src/payload/generated.ts"
    ),
  },
});
