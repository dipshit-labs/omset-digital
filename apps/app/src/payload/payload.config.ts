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
import { Templates } from "./collections/templates";
import { Themes } from "./collections/themes";
import { Users } from "./collections/users";
import { getUserTenantIDs } from "./lib/ids";
import type { Config } from "./payload-types";
import { seed } from "./seed";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
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
  secret: env.PAYLOAD_SECRET,
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
    Themes,
    Templates,
    Pages,
  ],
  onInit: async (args) => {
    if (env.PAYLOAD_SEED) {
      await seed(args);
    }
  },
  plugins: [
    multiTenantPlugin<Config>({
      tenantsSlug: "stores",
      collections: {
        categories: { isGlobal: false },
        media: { isGlobal: false },
        packages: { isGlobal: false },
        pages: { isGlobal: false },
        products: { isGlobal: false },
        templates: { isGlobal: false },
        themes: { isGlobal: false },
        variantOptions: { isGlobal: false },
        variants: { isGlobal: false },
        variantTypes: { isGlobal: false },
      },
      tenantField: {
        access: {
          read: () => true,
          update: ({ req }) => {
            if (isSuperAdmin(req.user)) {
              return true;
            }

            return getUserTenantIDs(req.user).length > 0;
          },
        },
      },
      tenantsArrayField: {
        includeDefaultField: false,
      },
      userHasAccessToAllTenants: (user) => isSuperAdmin(user),
    }),
    seoPlugin({}),
  ],
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  sharp,
});
