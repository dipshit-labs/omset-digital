// oxlint-disable unicorn/prefer-import-meta-properties
import path from "node:path";
import { fileURLToPath } from "node:url";

import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

import "@/env";

const __filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(__filename);

const nextConfig: NextConfig = {
  reactCompiler: true,
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      ".cjs": [".cts", ".cjs"],
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };

    return webpackConfig;
  },
  images: {
    qualities: [75, 85],
    remotePatterns: [
      {
        hostname: "localhost",
        pathname: "/api/media/**",
        port: "3000",
        protocol: "http",
      },
    ],
  },
  turbopack: {
    root: path.resolve(dirname, "../.."),
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
