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
import { commercePlugin } from "@repo/payload-plugin-commerce";
import { themesPlugin } from "@repo/payload-plugin-themes";
import { defaultTheme } from "@repo/theme-default";
import { minimalTheme } from "@repo/theme-minimal";
import type { Config } from "@repo/types";
import { buildConfig } from "payload";
import sharp from "sharp";

import { env } from "@/env";

import { isSuperAdmin } from "./access/isSuperAdmin";
import { Categories } from "./collections/categories";
import { Media } from "./collections/media";
import { Packages } from "./collections/packages";
import { Pages } from "./collections/pages";
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
    livePreview: {
      breakpoints: [
        {
          height: 667,
          label: "Mobile",
          name: "mobile",
          width: 375,
        },
        {
          height: 1024,
          label: "Tablet",
          name: "tablet",
          width: 768,
        },
        {
          height: 900,
          label: "Desktop",
          name: "desktop",
          width: 1440,
        },
      ],
    },
  },
  collections: [
    Users,
    Stores,
    Categories,
    Packages,
    Products,
    Media,
    Pages,
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
    commercePlugin({
      secret: env.PAYLOAD_SECRET,
      slugs: {
        storeCredentials: "storeCredentials",
        stores: "stores",
      },
    }),
    themesPlugin({
      manifests: [defaultTheme, minimalTheme],
      previewSecret: env.PREVIEW_SECRET,
      tenantField: "store",
      tenantsSlug: "stores",
    }),
    multiTenantPlugin<Config>({
      tenantSelectorLabel: "Store",
      tenantsSlug: "stores",
      userHasAccessToAllTenants: (user) => isSuperAdmin(user),
      collections: {
        categories: { isGlobal: false },
        media: { isGlobal: false },
        packages: { isGlobal: false },
        pages: { isGlobal: false },
        products: { isGlobal: false },
        storeCredentials: { customTenantField: true, isGlobal: false },
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
